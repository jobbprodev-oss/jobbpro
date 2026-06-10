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

// Lista de emails admin (cadastrados aqui para bypass)
const ADMIN_EMAILS = ['guttembergy@gmail.com', 'bergnoco@gmail.com', 'ben@teste.com'];

export async function POST(request: NextRequest) {
  try {
    const { userId, email } = await request.json();

    if (!userId || !email) {
      return NextResponse.json({ error: 'userId e email obrigatórios' }, { status: 400 });
    }

    const admin = getAdmin();

    // 1. Buscar usuário na tabela users por ID
    const { data: userById } = await admin
      .from('users')
      .select('id, tipo, email, plano_ativo, plano_id, plano_expira_em')
      .eq('id', userId)
      .maybeSingle();

    if (userById) {
      return NextResponse.json({
        tipo: userById.tipo,
        plano_ativo: userById.plano_ativo,
        plano_id: userById.plano_id,
        plano_expira_em: userById.plano_expira_em,
      });
    }

    // 2. Buscar por email (ID pode estar diferente)
    const { data: userByEmail } = await admin
      .from('users')
      .select('id, tipo, email, plano_ativo, plano_id, plano_expira_em')
      .eq('email', email)
      .maybeSingle();

    if (userByEmail) {
      // Corrigir o ID para sincronizar com auth (ignorar erro se falhar)
      const { error: updateErr } = await admin
        .from('users')
        .update({ id: userId })
        .eq('email', email);
      if (updateErr) {
        console.error('[CHECK-USER] Erro ao atualizar ID:', updateErr);
      }
      return NextResponse.json({
        tipo: userByEmail.tipo,
        plano_ativo: userByEmail.plano_ativo,
        plano_id: userByEmail.plano_id,
        plano_expira_em: userByEmail.plano_expira_em,
      });
    }

    // 3. Usuário não existe na tabela users - verificar se é admin
    if (ADMIN_EMAILS.includes(email.toLowerCase())) {
      // Auto-criar como admin
      const { error } = await admin.from('users').insert({
        id: userId,
        email,
        nome: 'Admin',
        tipo: 'admin',
        cpf_cnpj: `admin_${userId.substring(0, 8)}`,
        celular: `admin_${userId.substring(0, 8)}`,
        cidade: 'Admin',
        estado: 'SP',
        ativo: true,
      });

      if (error) {
        console.error('[CHECK-USER] Erro ao criar admin:', error);
        return NextResponse.json({ tipo: null });
      }

      return NextResponse.json({ tipo: 'admin', plano_ativo: true });
    }

    // 4. Não é admin e não existe - precisa cadastro
    return NextResponse.json({ tipo: null });

  } catch (err: any) {
    console.error('[CHECK-USER] Erro:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
