import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { email, password, nome } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha obrigatórios' }, { status: 400 });
    }

    const adminNome = nome || 'Admin';

    // 1. Criar usuário no auth do Supabase
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      // Se já existe no auth, buscar o ID
      if (authError.message?.includes('already been registered')) {
        const { data: { users } } = await admin.auth.admin.listUsers();
        const existingUser = users?.find(u => u.email === email);
        if (existingUser) {
          // Criar/atualizar na tabela users com o ID existente
          const { error: upsertError } = await admin.from('users').upsert({
            id: existingUser.id,
            email,
            nome: adminNome,
            tipo: 'admin',
            cpf_cnpj: `admin_${existingUser.id.substring(0, 8)}`,
            celular: `admin_${existingUser.id.substring(0, 8)}`,
            cidade: 'Admin',
            estado: 'SP',
            ativo: true,
          }, { onConflict: 'id' });

          if (upsertError) {
            return NextResponse.json({ error: upsertError.message }, { status: 500 });
          }

          return NextResponse.json({ 
            success: true, 
            message: 'Usuário já existia no auth. Atualizado para admin.',
            userId: existingUser.id 
          });
        }
        return NextResponse.json({ error: authError.message }, { status: 400 });
      }
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Erro ao criar usuário' }, { status: 500 });
    }

    // 2. Criar na tabela users com o mesmo ID
    const { error: userError } = await admin.from('users').upsert({
      id: authData.user.id,
      email,
      nome: adminNome,
      tipo: 'admin',
      cpf_cnpj: `admin_${authData.user.id.substring(0, 8)}`,
      celular: `admin_${authData.user.id.substring(0, 8)}`,
      cidade: 'Admin',
      estado: 'SP',
      ativo: true,
    }, { onConflict: 'id' });

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Admin criado com sucesso!',
      userId: authData.user.id 
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
