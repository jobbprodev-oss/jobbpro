import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Query genérica na tabela users via service_role (bypass RLS)
export async function POST(request: NextRequest) {
  try {
    const { action, userId, email, filters } = await request.json();
    const admin = getAdmin();

    if (action === 'getById') {
      const { data, error } = await admin
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      return NextResponse.json({ data, error: error?.message });
    }

    if (action === 'getByEmail') {
      const { data, error } = await admin
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle();
      return NextResponse.json({ data, error: error?.message });
    }

    if (action === 'list') {
      let query = admin.from('users').select('id, tipo, nome, email, celular, cidade, estado, ativo, created_at');
      if (filters?.tipo) query = query.eq('tipo', filters.tipo);
      const { data: users, error } = await query.order('created_at', { ascending: false });
      if (error) return NextResponse.json({ data: null, error: error.message });

      // Buscar ratings via service role (sem RLS)
      const userIds = (users || []).map((u: any) => u.id);
      const [{ data: prestRatings }, { data: contrRatings }] = await Promise.all([
        admin.from('prestador_perfil').select('user_id, media_avaliacao, total_avaliacoes').in('user_id', userIds),
        admin.from('contratante_perfil').select('user_id, media_avaliacao, total_avaliacoes').in('user_id', userIds),
      ]);

      const data = (users || []).map((u: any) => {
        const rating = prestRatings?.find((r: any) => r.user_id === u.id)
          || contrRatings?.find((r: any) => r.user_id === u.id);
        return { ...u, media_avaliacao: rating?.media_avaliacao ?? null, total_avaliacoes: rating?.total_avaliacoes ?? null };
      });

      return NextResponse.json({ data, error: null });
    }

    if (action === 'stats') {
      const [
        { count: totalUsers },
        { count: prestadores },
        { count: contratantes },
      ] = await Promise.all([
        admin.from('users').select('id', { count: 'exact', head: true }),
        admin.from('users').select('id', { count: 'exact', head: true }).eq('tipo', 'prestador'),
        admin.from('users').select('id', { count: 'exact', head: true }).eq('tipo', 'contratante'),
      ]);
      return NextResponse.json({ totalUsers, prestadores, contratantes });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT: upsert/update na tabela users via service_role
export async function PUT(request: NextRequest) {
  try {
    const { action, record, userId } = await request.json();
    const admin = getAdmin();

    if (action === 'upsert' && record) {
      const { data, error } = await admin
        .from('users')
        .upsert(record, { onConflict: 'id' });
      return NextResponse.json({ data, error: error?.message });
    }

    if (action === 'update' && record && userId) {
      const { data, error } = await admin
        .from('users')
        .update(record)
        .eq('id', userId);
      return NextResponse.json({ data, error: error?.message });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
