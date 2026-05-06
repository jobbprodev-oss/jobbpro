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

// GET - Listar funções ativas
export async function GET() {
  try {
    const { data, error } = await getAdmin()
      .from('funcoes')
      .select('*')
      .eq('ativa', true)
      .order('nome');
    if (error) throw error;
    return NextResponse.json({ funcoes: data });
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
