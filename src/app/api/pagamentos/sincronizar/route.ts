import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { consultarEProcessarPagamento } from '@/lib/pagamentos-server';

let _client: SupabaseClient | null = null;
function getAdmin(): SupabaseClient {
  if (!_client) {
    _client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  }
  return _client;
}

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { data: { user } } = await getAdmin().auth.getUser(token);
    if (!user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

    const { data: pagamentos } = await getAdmin()
      .from('pagamentos')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pendente')
      .order('created_at', { ascending: false })
      .limit(20);

    let confirmados = 0;
    for (const pagamento of pagamentos || []) {
      const status = await consultarEProcessarPagamento(getAdmin(), pagamento);
      if (status === 'confirmado') confirmados++;
    }

    return NextResponse.json({ processados: pagamentos?.length || 0, confirmados });
  } catch (err: any) {
    console.error('[PAGAMENTOS_SYNC] Erro:', err.message || err);
    return NextResponse.json({ error: err.message || 'Erro ao sincronizar pagamentos' }, { status: 500 });
  }
}
