import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const ADMIN_EMAILS = ['guttembergy@gmail.com', 'bergnoco@gmail.com', 'ben@teste.com'];

let _client: SupabaseClient | null = null;
function getAdmin(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _client;
}

async function isAdmin(token: string): Promise<boolean> {
  const { data: { user } } = await getAdmin().auth.getUser(token);
  if (!user) return false;
  const { data } = await getAdmin().from('users').select('tipo').eq('id', user.id).maybeSingle();
  if (data?.tipo === 'admin') return true;
  if (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) return true;
  return false;
}

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token || !(await isAdmin(token))) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const { data, error } = await getAdmin()
      .from('matches')
      .select(`
        id,
        status,
        match_score,
        valor_acordado,
        created_at,
        data_aceite,
        data_conclusao,
        vaga_id,
        prestador_id,
        vagas (
          titulo,
          funcao_principal,
          data,
          valor_oferecido
        ),
        prestador_perfil (
          funcao_principal,
          users ( nome )
        ),
        contratante_perfil (
          nome_empresa,
          users ( nome )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ matches: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
