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

// GET - Listar planos
export async function GET(request: NextRequest) {
  try {
    const { data, error } = await getAdmin()
      .from('planos')
      .select('*')
      .order('tipo_usuario')
      .order('valor', { ascending: true });
    if (error) throw error;
    return NextResponse.json({ planos: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST - Criar plano
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token || !(await isAdmin(token))) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { nome, descricao, valor, duracao_dias, tipo_usuario, categoria, recursos } = body;

    if (!nome || valor === undefined || !duracao_dias || !tipo_usuario) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 });
    }

    const { data, error } = await getAdmin().from('planos').insert({
      nome,
      descricao: descricao || null,
      valor,
      duracao_dias,
      tipo_usuario,
      categoria: categoria || 'servico',
      ativo: true,
      recursos: recursos || [],
    }).select().single();

    if (error) throw error;
    return NextResponse.json({ plano: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT - Editar plano
export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token || !(await isAdmin(token))) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

    const { data, error } = await getAdmin()
      .from('planos')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ plano: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE - Desativar plano
export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token || !(await isAdmin(token))) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

    const { error } = await getAdmin()
      .from('planos')
      .update({ ativo: false })
      .eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
