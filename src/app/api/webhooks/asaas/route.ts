import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { mapAsaasStatus, processarPagamentoConfirmado } from '@/lib/pagamentos-server';

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
    const body = await request.json();
    const payment = body.payment || body;
    const asaasPaymentId = payment.id || body.paymentId;

    if (!asaasPaymentId) {
      return NextResponse.json({ ok: true, ignored: 'payment id ausente' });
    }

    const { data: pagamento } = await getAdmin()
      .from('pagamentos')
      .select('*')
      .eq('asaas_payment_id', asaasPaymentId)
      .maybeSingle();

    if (!pagamento) {
      console.log('[ASAAS_WEBHOOK] Pagamento não encontrado:', asaasPaymentId);
      return NextResponse.json({ ok: true, ignored: 'pagamento não encontrado' });
    }

    const novoStatus = mapAsaasStatus(payment.status);
    console.log('[ASAAS_WEBHOOK] Pagamento recebido:', asaasPaymentId, payment.status, '->', novoStatus);

    if (novoStatus !== pagamento.status) {
      await getAdmin()
        .from('pagamentos')
        .update({ status: novoStatus, updated_at: new Date().toISOString() })
        .eq('id', pagamento.id);
    }

    if (novoStatus === 'confirmado' && pagamento.status !== 'confirmado') {
      await processarPagamentoConfirmado(getAdmin(), { ...pagamento, status: novoStatus });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[ASAAS_WEBHOOK] Erro:', err.message || err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}
