import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

let _client: SupabaseClient | null = null;
function getAdmin(): SupabaseClient {
  if (!_client) {
    _client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  }
  return _client;
}

export const dynamic = 'force-dynamic';

// POST - Solicitar nova função
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { data: { user } } = await getAdmin().auth.getUser(token);
    if (!user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

    const { nome_funcao, motivo } = await request.json();
    if (!nome_funcao) return NextResponse.json({ error: 'Nome da função obrigatório' }, { status: 400 });

    // Verificar se já existe função com esse nome
    const { data: existente } = await getAdmin()
      .from('funcoes')
      .select('id')
      .ilike('nome', nome_funcao.trim())
      .single();
    if (existente) return NextResponse.json({ error: 'Essa função já existe na plataforma' }, { status: 409 });

    // Verificar se já tem solicitação pendente igual
    const { data: pendente } = await getAdmin()
      .from('solicitacoes_funcao')
      .select('id')
      .eq('solicitante_id', user.id)
      .ilike('nome_funcao', nome_funcao.trim())
      .eq('status', 'pendente')
      .single();
    if (pendente) return NextResponse.json({ error: 'Você já tem uma solicitação pendente para esta função' }, { status: 409 });

    // Criar solicitação
    const { data, error } = await getAdmin()
      .from('solicitacoes_funcao')
      .insert({
        solicitante_id: user.id,
        nome_funcao: nome_funcao.trim(),
        motivo: motivo || null,
      })
      .select()
      .single();
    if (error) throw error;

    // Notificar todos os admins
    const { data: admins } = await getAdmin()
      .from('users')
      .select('id')
      .eq('tipo', 'admin');

    const { data: solicitante } = await getAdmin()
      .from('users')
      .select('nome')
      .eq('id', user.id)
      .single();

    if (admins && admins.length > 0) {
      const notifs = admins.map((admin) => ({
        user_id: admin.id,
        titulo: 'Nova solicitação de função',
        mensagem: `${solicitante?.nome || 'Um usuário'} solicitou a função "${nome_funcao.trim()}"`,
        tipo: 'solicitacao_funcao',
        link: '/admin/funcoes',
      }));
      await getAdmin().from('notificacoes').insert(notifs);
    }

    return NextResponse.json({ solicitacao: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
