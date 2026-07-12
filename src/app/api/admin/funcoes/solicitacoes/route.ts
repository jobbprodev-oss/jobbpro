import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { criarNotificacao } from '@/lib/notificacoes';

let _client: SupabaseClient | null = null;
function getAdmin(): SupabaseClient {
  if (!_client) {
    _client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  }
  return _client;
}

async function isAdmin(token: string): Promise<boolean> {
  const { data: { user } } = await getAdmin().auth.getUser(token);
  if (!user) return false;
  const { data } = await getAdmin().from('users').select('tipo').eq('id', user.id).single();
  return data?.tipo === 'admin';
}

export const dynamic = 'force-dynamic';

// GET - Listar solicitações
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token || !(await isAdmin(token))) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    // Buscar solicitações
    const { data: solicitacoes, error } = await getAdmin()
      .from('solicitacoes_funcao')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;

    // Buscar dados dos solicitantes separadamente
    const solicitanteIds = Array.from(new Set((solicitacoes || []).map((s: any) => s.solicitante_id)));
    let usersMap: Record<string, { nome: string; email: string; tipo: string }> = {};
    if (solicitanteIds.length > 0) {
      const { data: usersData } = await getAdmin()
        .from('users')
        .select('id, nome, email, tipo')
        .in('id', solicitanteIds);
      if (usersData) {
        usersData.forEach((u: any) => { usersMap[u.id] = { nome: u.nome, email: u.email, tipo: u.tipo }; });
      }
    }

    // Montar resposta com dados do solicitante
    const result = (solicitacoes || []).map((s: any) => ({
      ...s,
      users: usersMap[s.solicitante_id] || null,
    }));

    return NextResponse.json({ solicitacoes: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT - Aprovar ou rejeitar solicitação
export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token || !(await isAdmin(token))) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const { id, acao, motivo_rejeicao, nome_editado } = await request.json();
    if (!id || !acao) return NextResponse.json({ error: 'ID e ação obrigatórios' }, { status: 400 });
    if (!['aprovar', 'rejeitar'].includes(acao)) {
      return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
    }

    // Buscar solicitação
    const { data: solicitacao, error: fetchErr } = await getAdmin()
      .from('solicitacoes_funcao')
      .select('*')
      .eq('id', id)
      .single();
    if (fetchErr || !solicitacao) {
      console.error('[SOLICITACAO] Não encontrada:', id, fetchErr);
      return NextResponse.json({ error: 'Solicitação não encontrada' }, { status: 404 });
    }
    if (solicitacao.status !== 'pendente') {
      return NextResponse.json({ error: 'Solicitação já foi respondida' }, { status: 409 });
    }

    const novoStatus = acao === 'aprovar' ? 'aprovada' : 'rejeitada';
    const nomeFinal = acao === 'aprovar'
      ? ((nome_editado && nome_editado.trim()) ? nome_editado.trim() : solicitacao.nome_funcao)
      : solicitacao.nome_funcao;

    // Usar RPC SECURITY DEFINER para garantir que o update funciona
    const { data: rpcResult, error: rpcErr } = await getAdmin().rpc('responder_solicitacao', {
      p_id: id,
      p_status: novoStatus,
      p_admin_resposta: acao === 'rejeitar' ? (motivo_rejeicao || null) : null,
    });

    if (rpcErr) {
      console.error('[SOLICITACAO] RPC erro:', rpcErr);
      throw new Error(`Erro ao atualizar: ${rpcErr.message}`);
    }
    if (rpcResult && !rpcResult.success) {
      return NextResponse.json({ error: rpcResult.error || 'Falha ao atualizar' }, { status: 409 });
    }

    if (acao === 'aprovar') {
      // Criar a função na tabela
      const { error: insertErr } = await getAdmin()
        .from('funcoes')
        .insert({ nome: nomeFinal, ativa: true });
      if (insertErr && insertErr.code !== '23505') throw insertErr;

      // Notificar solicitante
      await criarNotificacao(
        solicitacao.solicitante_id,
        'Função aprovada!',
        `Sua solicitação da função "${solicitacao.nome_funcao}" foi aprovada${nomeFinal !== solicitacao.nome_funcao ? ` como "${nomeFinal}"` : ''}! Ela já está disponível na plataforma.`,
        'solicitacao_funcao',
        '/perfil/editar'
      );
    } else {
      // Notificar solicitante
      await criarNotificacao(
        solicitacao.solicitante_id,
        'Função não aprovada',
        `Sua solicitação da função "${solicitacao.nome_funcao}" não foi aprovada.${motivo_rejeicao ? ` Motivo: ${motivo_rejeicao}` : ''}`,
        'solicitacao_funcao',
        '/perfil/editar'
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
