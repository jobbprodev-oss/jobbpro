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

    if (action === 'emailExists') {
      const normalized = email?.trim().toLowerCase();
      if (!normalized) return NextResponse.json({ exists: false });
      // Verifica tabela pública
      const { data: publicRow } = await admin.from('users').select('id').eq('email', normalized).maybeSingle();
      if (publicRow) return NextResponse.json({ exists: true });
      // Verifica Supabase Auth (detecta cadastros parciais anteriores)
      try {
        const { data: authRow } = await (admin as any).schema('auth').from('users').select('id').eq('email', normalized).maybeSingle();
        if (authRow) return NextResponse.json({ exists: true });
      } catch {}
      return NextResponse.json({ exists: false });
    }

    if (action === 'list') {
      let query = admin.from('users').select('id, tipo, nome, email, celular, cidade, estado, ativo, created_at');
      if (filters?.tipo) query = query.eq('tipo', filters.tipo);
      const { data: users, error } = await query.order('created_at', { ascending: false });
      if (error) return NextResponse.json({ data: null, error: error.message });

      // Calcular ratings direto da tabela avaliacoes (mais confiável que o cache do perfil)
      const userIds = (users || []).map((u: any) => u.id);
      const { data: avRows } = await admin
        .from('avaliacoes')
        .select('avaliado_id, nota')
        .in('avaliado_id', userIds);

      // Agrupar por avaliado_id e calcular média
      const ratingsMap: Record<string, { soma: number; total: number }> = {};
      for (const av of avRows || []) {
        if (!ratingsMap[av.avaliado_id]) ratingsMap[av.avaliado_id] = { soma: 0, total: 0 };
        ratingsMap[av.avaliado_id].soma += av.nota;
        ratingsMap[av.avaliado_id].total += 1;
      }

      const data = (users || []).map((u: any) => {
        const r = ratingsMap[u.id];
        return {
          ...u,
          media_avaliacao: r ? parseFloat((r.soma / r.total).toFixed(1)) : null,
          total_avaliacoes: r ? r.total : null,
        };
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
