import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

let _client: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _client;
}

async function criarNotificacao(userId: string, titulo: string, mensagem: string, tipo: string, link?: string) {
  const { error } = await getSupabaseAdmin().from('notificacoes').insert({ user_id: userId, titulo, mensagem, tipo, link });
  if (error) console.error('[NOTIFICACAO] Erro ao criar:', error);
}

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: authUser }, error: authError } = await getSupabaseAdmin().auth.getUser(token);
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const body = await request.json();
    const { vaga_id, prestador_id, action } = body;

    if (!vaga_id || !prestador_id || !action) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 });
    }

    if (action === 'criar') {
      // Verificar se já existe qualquer match (independente do status)
      const { data: anyExisting } = await getSupabaseAdmin()
        .from('matches')
        .select('id, status')
        .eq('vaga_id', vaga_id)
        .eq('prestador_id', prestador_id)
        .maybeSingle();

      // Se existe um match ativo (não cancelado/recusado), bloquear
      if (anyExisting && !['recusado', 'cancelado'].includes(anyExisting.status)) {
        return NextResponse.json({ error: 'Match já existe' }, { status: 409 });
      }

      const { data: vaga } = await getSupabaseAdmin()
        .from('vagas')
        .select('contratante_id, titulo')
        .eq('id', vaga_id)
        .single();

      if (!vaga) {
        return NextResponse.json({ error: 'Vaga não encontrada' }, { status: 404 });
      }

      let data: any;
      let error: any;

      if (anyExisting) {
        // Reativar match cancelado/recusado via UPDATE (evita violar unique constraint)
        ({ data, error } = await getSupabaseAdmin()
          .from('matches')
          .update({ status: 'pendente', match_score: body.match_score || 0, data_aceite: null, valor_acordado: null })
          .eq('id', anyExisting.id)
          .select()
          .single());
      } else {
        // Criar novo match
        ({ data, error } = await getSupabaseAdmin().from('matches').insert({
          vaga_id,
          prestador_id,
          contratante_id: vaga.contratante_id,
          status: 'pendente',
          match_score: body.match_score || 0,
        }).select().single());
      }

      if (error) throw error;

      // Notificar contratante
      const { data: prestadorUser } = await getSupabaseAdmin()
        .from('prestador_perfil')
        .select('user_id, users(nome)')
        .eq('id', prestador_id)
        .single();
      const { data: contratanteUser } = await getSupabaseAdmin()
        .from('contratante_perfil')
        .select('user_id')
        .eq('id', vaga.contratante_id)
        .single();
      if (contratanteUser) {
        const nomePrestador = (prestadorUser as any)?.users?.nome || 'Um prestador';
        await criarNotificacao(
          contratanteUser.user_id,
          'Novo interesse',
          `${nomePrestador} demonstrou interesse na vaga "${vaga.titulo}"`,
          'match',
          `/dashboard/contratante/matches`
        );
      }

      return NextResponse.json({ match: data });
    }

    if (action === 'aceitar' || action === 'recusar') {
      // Captura status atual antes de alterar (necessário para saber se precisa decrementar)
      let statusAnterior: string | null = null;
      if (action === 'recusar') {
        const { data: matchAtual } = await getSupabaseAdmin()
          .from('matches')
          .select('status')
          .eq('vaga_id', vaga_id)
          .eq('prestador_id', prestador_id)
          .maybeSingle();
        statusAnterior = matchAtual?.status || null;
      }

      const status = action === 'aceitar' ? 'aceito' : 'recusado';
      const updateData: Record<string, unknown> = { status };

      if (action === 'aceitar') {
        updateData.data_aceite = new Date().toISOString();
        updateData.valor_acordado = body.valor_acordado || null;
      }

      const { data, error } = await getSupabaseAdmin()
        .from('matches')
        .update(updateData)
        .eq('vaga_id', vaga_id)
        .eq('prestador_id', prestador_id)
        .select()
        .single();

      if (error) throw error;

      if (action === 'aceitar') {
        await getSupabaseAdmin().rpc('incrementar_vagas_preenchidas', { p_vaga_id: vaga_id });
      } else if (action === 'recusar' && statusAnterior === 'aceito') {
        // Prestador recusou após aceite do contratante → devolve a vaga para o pool
        const { data: vagaAtual } = await getSupabaseAdmin()
          .from('vagas')
          .select('vagas_preenchidas')
          .eq('id', vaga_id)
          .single();
        if (vagaAtual && vagaAtual.vagas_preenchidas > 0) {
          await getSupabaseAdmin()
            .from('vagas')
            .update({ vagas_preenchidas: vagaAtual.vagas_preenchidas - 1 })
            .eq('id', vaga_id);
        }
      }

      // Notificar prestador sobre aceite/recusa
      const { data: prestadorInfo } = await getSupabaseAdmin()
        .from('prestador_perfil')
        .select('user_id')
        .eq('id', prestador_id)
        .single();
      const { data: vagaInfo } = await getSupabaseAdmin()
        .from('vagas')
        .select('titulo')
        .eq('id', vaga_id)
        .single();
      if (prestadorInfo) {
        await criarNotificacao(
          prestadorInfo.user_id,
          action === 'aceitar' ? 'Match aceito!' : 'Match recusado',
          action === 'aceitar'
            ? `Seu interesse na vaga "${vagaInfo?.titulo}" foi aceito!`
            : `Seu interesse na vaga "${vagaInfo?.titulo}" foi recusado.`,
          'match',
          `/dashboard/prestador/matches`
        );
      }

      return NextResponse.json({ match: data });
    }

    if (action === 'confirmar') {
      const { data, error } = await getSupabaseAdmin()
        .from('matches')
        .update({ status: 'confirmado' })
        .eq('vaga_id', vaga_id)
        .eq('prestador_id', prestador_id)
        .eq('status', 'aceito')
        .select('*, vagas(titulo, contratante_id)')
        .single();

      if (error) throw error;

      // Notificar contratante que prestador confirmou
      const contId = (data as any).vagas?.contratante_id || (data as any).contratante_id;
      const { data: contUser } = await getSupabaseAdmin()
        .from('contratante_perfil').select('user_id').eq('id', contId).single();
      const { data: prestUser } = await getSupabaseAdmin()
        .from('prestador_perfil').select('users(nome)').eq('id', prestador_id).single();
      if (contUser) {
        const nome = (prestUser as any)?.users?.nome || 'O prestador';
        await criarNotificacao(
          contUser.user_id,
          'Presença confirmada',
          `${nome} confirmou presença na vaga "${(data as any).vagas?.titulo}"`,
          'match',
          `/dashboard/contratante/matches`
        );
      }

      return NextResponse.json({ match: data });
    }

    if (action === 'concluir') {
      const { data, error } = await getSupabaseAdmin()
        .from('matches')
        .update({
          status: 'concluido',
          data_conclusao: new Date().toISOString(),
        })
        .eq('vaga_id', vaga_id)
        .eq('prestador_id', prestador_id)
        .select('*, vagas(contratante_id)')
        .single();

      if (error) throw error;

      const contId = (data as any).vagas?.contratante_id || (data as any).contratante_id;
      await getSupabaseAdmin().rpc('incrementar_contadores_conclusao', {
        p_prestador_id: prestador_id,
        p_contratante_id: contId,
      });

      // Notificar prestador para avaliar
      const { data: pInfo } = await getSupabaseAdmin()
        .from('prestador_perfil')
        .select('user_id')
        .eq('id', prestador_id)
        .single();
      if (pInfo) {
        await criarNotificacao(
          pInfo.user_id,
          'Serviço concluído',
          'O contratante marcou o serviço como concluído. Avalie a experiência!',
          'avaliacao',
          `/avaliar/${(data as any).id}`
        );
      }

      return NextResponse.json({ match: data });
    }

    if (action === 'cancelar') {
      const { data, error } = await getSupabaseAdmin()
        .from('matches')
        .delete()
        .eq('vaga_id', vaga_id)
        .eq('prestador_id', prestador_id)
        .eq('status', 'pendente')
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ match: data });
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: authUser }, error: authError } = await getSupabaseAdmin().auth.getUser(token);
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const match_id = searchParams.get('match_id');
    const vaga_id = searchParams.get('vaga_id');
    const prestador_id = searchParams.get('prestador_id');
    const contratante_id = searchParams.get('contratante_id');
    const status = searchParams.get('status');

    // Busca por ID único
    if (match_id) {
      const { data, error } = await getSupabaseAdmin()
        .from('matches')
        .select('*, vagas(*), prestador_perfil(*, users(*)), contratante_perfil(*, users(*))')
        .eq('id', match_id)
        .single();
      if (error) throw error;
      return NextResponse.json({ match: data });
    }

    let query = getSupabaseAdmin().from('matches').select('*, vagas(*), prestador_perfil(*, users(*)), contratante_perfil(*, users(*))');

    if (vaga_id) query = query.eq('vaga_id', vaga_id);
    if (prestador_id) query = query.eq('prestador_id', prestador_id);
    if (contratante_id) query = query.eq('contratante_id', contratante_id);
    if (status) query = query.eq('status', status);

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ matches: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}
