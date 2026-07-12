import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { ASAAS_API_URL, getAsaasKey, mapAsaasStatus, processarPagamentoConfirmado } from '@/lib/pagamentos-server';

let _client: SupabaseClient | null = null;
function getAdmin(): SupabaseClient {
  if (!_client) {
    _client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  }
  return _client;
}

export const dynamic = 'force-dynamic';

// GET - Retorna dados do usuário + pagamento de cadastro pendente
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { data: { user: authUser } } = await getAdmin().auth.getUser(token);
    if (!authUser) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

    // Buscar dados do usuário
    const { data: userData } = await getAdmin()
      .from('users')
      .select('id, tipo, nome, cpf_cnpj, celular, email, plano_ativo')
      .eq('id', authUser.id)
      .maybeSingle();

    if (!userData) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Se o plano já está ativo, retornar status confirmado diretamente
    if (userData.plano_ativo) {
      return NextResponse.json({ user: userData, payment: null, pixStatus: 'confirmado' });
    }

    // Buscar pagamento de cadastro mais recente
    const { data: payment } = await getAdmin()
      .from('pagamentos')
      .select('*')
      .eq('user_id', authUser.id)
      .eq('tipo', 'cadastro')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!payment) {
      return NextResponse.json({ user: userData, payment: null, pixStatus: null });
    }

    // Verificar status real no Asaas
    let pixStatus = payment.status;
    try {
      const asaasRes = await fetch(`${ASAAS_API_URL}/payments/${payment.asaas_payment_id}`, {
        headers: { access_token: getAsaasKey() },
        cache: 'no-store',
      });
      if (asaasRes.ok) {
        const asaasData = await asaasRes.json();
        const novoStatus = mapAsaasStatus(asaasData.status);
        if (novoStatus !== payment.status) {
          await getAdmin()
            .from('pagamentos')
            .update({ status: novoStatus, updated_at: new Date().toISOString() })
            .eq('id', payment.id);
          if (novoStatus === 'confirmado') {
            await processarPagamentoConfirmado(getAdmin(), { ...payment, status: novoStatus });
          }
        }
        pixStatus = novoStatus;
      }
    } catch (e) {
      console.error('[PENDENTE] Erro ao consultar Asaas:', e);
    }

    return NextResponse.json({ user: userData, payment, pixStatus });
  } catch (err: any) {
    console.error('[PENDENTE] Erro:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
