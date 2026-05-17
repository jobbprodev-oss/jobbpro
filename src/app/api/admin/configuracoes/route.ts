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

// GET - Buscar configurações
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token || !(await isAdmin(token))) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const { data, error } = await getAdmin()
      .from('configuracoes')
      .select('termos_uso, politica_privacidade')
      .eq('id', 'global')
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return NextResponse.json({ configuracoes: data || {} });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT - Salvar configurações
export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token || !(await isAdmin(token))) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { termos_uso, politica_privacidade } = body;

    const { data, error } = await getAdmin()
      .from('configuracoes')
      .upsert({ id: 'global', termos_uso: termos_uso ?? '', politica_privacidade: politica_privacidade ?? '' })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ configuracoes: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
