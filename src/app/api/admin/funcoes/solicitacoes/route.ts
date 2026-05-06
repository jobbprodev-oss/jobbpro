import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

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

    const { data, error } = await getAdmin()
      .from('solicitacoes_funcao')
      .select('*, users:solicitante_id(nome, email, tipo)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ solicitacoes: data });
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

    const { id, acao, motivo_rejeicao } = await request.json();
    if (!id || !acao) return NextResponse.json({ error: 'ID e ação obrigatórios' }, { status: 400 });
    if (!['aprovar', 'rejeitar'].includes(acao)) {
      return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
    }

    // Buscar solicitação
    const { data: solicitacao, error: fetchErr } = await getAdmin()
      .from('solicitacoes_funcao')
      .select('*')
      .eq('id', id)
      .eq('status', 'pendente')
      .single();
    if (fetchErr || !solicitacao) {
      return NextResponse.json({ error: 'Solicitação não encontrada ou já respondida' }, { status: 404 });
    }

    if (acao === 'aprovar') {
      // Criar a função na tabela
      const { error: insertErr } = await getAdmin()
        .from('funcoes')
        .insert({ nome: solicitacao.nome_funcao, ativa: true });
      if (insertErr && insertErr.code !== '23505') throw insertErr;

      // Atualizar solicitação
      await getAdmin()
        .from('solicitacoes_funcao')
        .update({ status: 'aprovada', respondido_em: new Date().toISOString() })
        .eq('id', id);

      // Notificar solicitante
      await getAdmin().from('notificacoes').insert({
        user_id: solicitacao.solicitante_id,
        titulo: 'Função aprovada!',
        mensagem: `Sua solicitação da função "${solicitacao.nome_funcao}" foi aprovada! Ela já está disponível na plataforma.`,
        tipo: 'solicitacao_funcao',
        link: '/perfil/editar',
      });
    } else {
      // Rejeitar
      await getAdmin()
        .from('solicitacoes_funcao')
        .update({
          status: 'rejeitada',
          admin_resposta: motivo_rejeicao || null,
          respondido_em: new Date().toISOString(),
        })
        .eq('id', id);

      // Notificar solicitante
      await getAdmin().from('notificacoes').insert({
        user_id: solicitacao.solicitante_id,
        titulo: 'Função não aprovada',
        mensagem: `Sua solicitação da função "${solicitacao.nome_funcao}" não foi aprovada.${motivo_rejeicao ? ` Motivo: ${motivo_rejeicao}` : ''}`,
        tipo: 'solicitacao_funcao',
        link: '/perfil/editar',
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
