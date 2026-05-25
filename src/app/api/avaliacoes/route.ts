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

// GET - Verificar se já avaliou (match_id) OU buscar avaliações de um user (user_id)
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { data: { user: authUser } } = await getAdmin().auth.getUser(token);
    if (!authUser) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const match_id = searchParams.get('match_id');
    const user_id = searchParams.get('user_id');

    // Buscar avaliações de um usuário (para painel admin)
    if (user_id) {
      const { data: userRow } = await getAdmin().from('users').select('tipo').eq('id', authUser.id).single();
      if (userRow?.tipo !== 'admin') return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

      const { data, error } = await getAdmin()
        .from('avaliacoes')
        .select('id, nota, descricao, created_at, avaliador_id, matches(vagas(titulo))')
        .eq('avaliado_id', user_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return NextResponse.json({ avaliacoes: data });
    }

    // Buscar todos os match_ids já avaliados pelo usuário
    const avaliados = searchParams.get('avaliados');
    if (avaliados === 'true') {
      const { data, error } = await getAdmin()
        .from('avaliacoes')
        .select('match_id')
        .eq('avaliador_id', authUser.id);
      if (error) throw error;
      return NextResponse.json({ match_ids: (data || []).map((a: any) => a.match_id) });
    }

    // Verificar se já avaliou este match
    if (!match_id) return NextResponse.json({ error: 'match_id obrigatório' }, { status: 400 });

    const { data } = await getAdmin()
      .from('avaliacoes')
      .select('id')
      .eq('match_id', match_id)
      .eq('avaliador_id', authUser.id)
      .maybeSingle();

    return NextResponse.json({ jaAvaliou: !!data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST - Enviar avaliação
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { data: { user: authUser } } = await getAdmin().auth.getUser(token);
    if (!authUser) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

    const { match_id, avaliado_id, nota, descricao } = await request.json();
    if (!match_id || !avaliado_id || !nota) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 });
    }

    const { data, error } = await getAdmin().from('avaliacoes').insert({
      match_id,
      avaliador_id: authUser.id,
      avaliado_id,
      nota,
      descricao: descricao?.trim() || null,
    }).select().single();

    if (error) throw error;
    return NextResponse.json({ avaliacao: data });
  } catch (err: any) {
    if (err.code === '23505') {
      return NextResponse.json({ error: 'Você já avaliou este serviço' }, { status: 409 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
