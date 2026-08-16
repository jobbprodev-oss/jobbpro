import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const ADMIN_EMAILS = ['guttembergy@gmail.com', 'bergnoco@gmail.com', 'ben@teste.com'];

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
  const { data } = await getAdmin().from('users').select('tipo').eq('id', user.id).maybeSingle();
  if (data?.tipo === 'admin') return true;
  if (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) return true;
  return false;
}

export const dynamic = 'force-dynamic';

// GET - Listar funções (todas para admin, ativas para outros)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all') === '1';

    // Buscar TODAS as linhas paginando (evita limite padrão de 1000 do PostgREST)
    const PAGE_SIZE = 1000;
    let allRows: any[] = [];
    let from = 0;
    while (true) {
      let query = getAdmin().from('funcoes').select('*');
      if (!all) query = query.eq('ativa', true);
      query = query.order('nome').range(from, from + PAGE_SIZE - 1);

      const { data, error } = await query;
      if (error) throw error;
      allRows = allRows.concat(data || []);
      if (!data || data.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }

    return NextResponse.json({ funcoes: allRows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST - Criar nova função (admin)
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token || !(await isAdmin(token))) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const { nome } = await request.json();
    if (!nome) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });

    const { data, error } = await getAdmin()
      .from('funcoes')
      .insert({ nome: nome.trim(), ativa: true })
      .select()
      .single();
    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'Função já existe' }, { status: 409 });
      throw error;
    }
    return NextResponse.json({ funcao: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT - Atualizar função (admin)
export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token || !(await isAdmin(token))) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const { id, nome, ativa } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

    const updates: any = {};
    if (nome !== undefined) updates.nome = nome.trim();
    if (ativa !== undefined) updates.ativa = ativa;

    const { data, error } = await getAdmin()
      .from('funcoes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ funcao: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
