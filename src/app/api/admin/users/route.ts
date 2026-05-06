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

// POST - Criar usuário
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token || !(await isAdmin(token))) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { email, password, nome, cpf_cnpj, celular, tipo, cidade, estado, plano_id } = body;

    if (!email || !password || !nome || !cpf_cnpj || !celular || !tipo) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 });
    }

    // Criar no Auth
    const { data: authData, error: authError } = await getAdmin().auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (authError) throw authError;
    if (!authData.user) throw new Error('Falha ao criar usuário');

    // Calcular expiração do plano
    let plano_ativo = false;
    let plano_expira_em = null;
    if (plano_id) {
      const { data: plano } = await getAdmin().from('planos').select('duracao_dias').eq('id', plano_id).single();
      if (plano) {
        plano_ativo = true;
        const exp = new Date();
        exp.setDate(exp.getDate() + plano.duracao_dias);
        plano_expira_em = exp.toISOString();
      }
    }

    // Inserir na tabela users
    const { error: userError } = await getAdmin().from('users').insert({
      id: authData.user.id,
      tipo,
      nome,
      cpf_cnpj,
      celular,
      email,
      cidade: cidade || null,
      estado: estado || null,
      ativo: true,
      termo_aceite: true,
      plano_id: plano_id || null,
      plano_ativo,
      plano_expira_em,
    });
    if (userError) throw userError;

    // Criar perfil correspondente
    if (tipo === 'prestador') {
      await getAdmin().from('prestador_perfil').insert({
        user_id: authData.user.id,
        funcao_principal: body.funcao_principal || 'Auxiliar Geral',
        vestimenta: 'casual',
        disponivel: true,
      });
    } else if (tipo === 'contratante') {
      await getAdmin().from('contratante_perfil').insert({
        user_id: authData.user.id,
        nome_empresa: body.nome_empresa || nome,
      });
    }

    return NextResponse.json({ user: { id: authData.user.id, email, nome, tipo } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}

// PUT - Editar usuário
export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token || !(await isAdmin(token))) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

    // Se mudou plano, recalcular expiração
    if (updates.plano_id !== undefined) {
      if (updates.plano_id) {
        const { data: plano } = await getAdmin().from('planos').select('duracao_dias').eq('id', updates.plano_id).single();
        if (plano) {
          updates.plano_ativo = true;
          const exp = new Date();
          exp.setDate(exp.getDate() + plano.duracao_dias);
          updates.plano_expira_em = exp.toISOString();
        }
      } else {
        updates.plano_id = null;
        updates.plano_ativo = false;
        updates.plano_expira_em = null;
      }
    }

    // Se mudou email ou senha, atualizar no Auth
    if (updates.email || updates.password) {
      const authUpdates: any = {};
      if (updates.email) authUpdates.email = updates.email;
      if (updates.password) {
        authUpdates.password = updates.password;
        delete updates.password;
      }
      await getAdmin().auth.admin.updateUserById(id, authUpdates);
    }
    delete updates.password;

    const { data, error } = await getAdmin()
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ user: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}
