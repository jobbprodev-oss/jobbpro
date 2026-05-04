import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { secret } = body;

    // Proteção básica - só executa com o secret correto
    if (secret !== 'jobbpro-admin-seed-2024') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Criar usuário no Supabase Auth
    const email = 'admin@jobbpro.com';
    const password = 'Admin@123456';

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      // Se já existe, tenta buscar
      if (authError.message?.includes('already') || authError.message?.includes('duplicate')) {
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = users?.find((u: any) => u.email === email);
        if (existingUser) {
          // Inserir/atualizar na tabela users
          const { error: upsertError } = await supabaseAdmin.from('users').upsert({
            id: existingUser.id,
            tipo: 'admin',
            nome: 'Administrador',
            cpf_cnpj: '00000000000',
            celular: '00000000000',
            email,
            ativo: true,
            termo_aceite: true,
          }, { onConflict: 'id' });

          if (upsertError) throw upsertError;
          return NextResponse.json({ message: 'Admin já existia, registro atualizado', email, password });
        }
      }
      throw authError;
    }

    if (!authData.user) {
      throw new Error('Falha ao criar usuário auth');
    }

    // 2. Inserir na tabela users
    const { error: userError } = await supabaseAdmin.from('users').upsert({
      id: authData.user.id,
      tipo: 'admin',
      nome: 'Administrador',
      cpf_cnpj: '00000000000',
      celular: '00000000000',
      email,
      ativo: true,
      termo_aceite: true,
    }, { onConflict: 'id' });

    if (userError) throw userError;

    return NextResponse.json({
      message: 'Admin criado com sucesso!',
      email,
      password,
      userId: authData.user.id,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}
