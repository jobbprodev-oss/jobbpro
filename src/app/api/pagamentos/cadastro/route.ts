import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { ASAAS_API_URL, getAsaasKey, mapAsaasStatus, consultarEProcessarPagamento } from '@/lib/pagamentos-server';
import { isSistemaGratuitoAtivo } from '@/lib/gratuito';

let _client: SupabaseClient | null = null;
function getAdmin(): SupabaseClient {
  if (!_client) {
    _client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  }
  return _client;
}

export const dynamic = 'force-dynamic';

// POST - Gerar PIX para cadastro (não requer autenticação)
export async function POST(request: NextRequest) {
  try {
    const ASAAS_API_KEY = getAsaasKey();
    if (ASAAS_API_KEY.length <= 1) {
      return NextResponse.json({ error: 'Chave do Asaas não configurada' }, { status: 500 });
    }

    const { tipo_usuario, nome, cpf, celular, email, user_id } = await request.json();

    if (!tipo_usuario || !nome || !cpf || !email) {
      return NextResponse.json({ error: 'Dados obrigatórios: tipo_usuario, nome, cpf, email' }, { status: 400 });
    }

    // Buscar plano de cadastro ativo para o tipo de usuário
    const { data: plano, error: planoError } = await getAdmin()
      .from('planos')
      .select('*')
      .eq('categoria', 'cadastro')
      .eq('tipo_usuario', tipo_usuario)
      .eq('ativo', true)
      .single();

    if (planoError || !plano) {
      return NextResponse.json({ error: 'Plano de cadastro não encontrado' }, { status: 404 });
    }

    const valor = plano.valor;

    // Período gratuito ativo: libera cadastro sem cobrança
    const gratuito = await isSistemaGratuitoAtivo(getAdmin());
    if (gratuito) {
      if (user_id) {
        const expira = new Date();
        expira.setDate(expira.getDate() + (plano.duracao_dias || 365));
        await getAdmin()
          .from('users')
          .update({
            plano_id: plano.id,
            plano_ativo: true,
            plano_expira_em: expira.toISOString(),
            tipo_liberacao: 'gratuito_temporario',
            updated_at: new Date().toISOString(),
          })
          .eq('id', user_id);
      }
      return NextResponse.json({
        gratuito: true,
        plano_id: plano.id,
        plano_nome: plano.nome,
        duracao_dias: plano.duracao_dias,
      });
    }

    // Criar ou buscar customer no Asaas
    const cpfLimpo = cpf.replace(/\D/g, '');
    const celularLimpo = celular?.replace(/\D/g, '') || '';

    // Buscar customer existente
    const searchRes = await fetch(`${ASAAS_API_URL}/customers?cpfCnpj=${cpfLimpo}`, {
      headers: { access_token: ASAAS_API_KEY },
      cache: 'no-store',
    });
    const searchData = await searchRes.json();
    let asaasCustomerId = searchData?.data?.[0]?.id || null;

    if (!asaasCustomerId) {
      const customerRes = await fetch(`${ASAAS_API_URL}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', access_token: ASAAS_API_KEY },
        body: JSON.stringify({
          name: nome,
          email,
          cpfCnpj: cpfLimpo,
          mobilePhone: celularLimpo,
        }),
        cache: 'no-store',
      });
      const customerData = await customerRes.json();
      if (!customerRes.ok) {
        throw new Error(customerData.errors?.[0]?.description || 'Erro ao criar customer no Asaas');
      }
      asaasCustomerId = customerData.id;
    }

    // Criar cobrança PIX
    const dueDate = new Date();
    dueDate.setMinutes(dueDate.getMinutes() + 30);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    const paymentRes = await fetch(`${ASAAS_API_URL}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', access_token: ASAAS_API_KEY },
      body: JSON.stringify({
        customer: asaasCustomerId,
        billingType: 'PIX',
        value: valor,
        dueDate: dueDateStr,
        description: `JOBBPRO - Cadastro ${tipo_usuario === 'prestador' ? 'Prestador' : 'Contratante'}`,
        externalReference: user_id ? `cadastro_${user_id}` : `cadastro_${cpfLimpo}`,
      }),
      cache: 'no-store',
    });
    const paymentData = await paymentRes.json();
    if (!paymentRes.ok) {
      throw new Error(paymentData.errors?.[0]?.description || 'Erro ao criar cobrança');
    }

    // Buscar QR Code PIX
    const pixRes = await fetch(`${ASAAS_API_URL}/payments/${paymentData.id}/pixQrCode`, {
      headers: { access_token: ASAAS_API_KEY },
      cache: 'no-store',
    });
    const pixData = await pixRes.json();
    console.log('[CADASTRO_PIX] QR Code response:', pixRes.status, JSON.stringify(pixData));
    if (!pixRes.ok) {
      throw new Error(pixData.errors?.[0]?.description || 'Erro ao gerar QR Code PIX');
    }

    if (user_id) {
      const { data: existente } = await getAdmin()
        .from('pagamentos')
        .select('id')
        .eq('asaas_payment_id', paymentData.id)
        .maybeSingle();

      if (!existente) {
        await getAdmin().from('pagamentos').insert({
          user_id,
          asaas_payment_id: paymentData.id,
          asaas_customer_id: asaasCustomerId,
          tipo: 'cadastro',
          valor,
          status: 'pendente',
          pix_qr_code: pixData.encodedImage,
          pix_copia_cola: pixData.payload,
          pix_expiracao: pixData.expirationDate,
          metadata: {
            tipo_usuario,
            plano_id: plano.id,
            duracao_dias: plano.duracao_dias,
          },
        });
        console.log('[CADASTRO_PIX] Pagamento pendente salvo:', paymentData.id);
      }
    }

    return NextResponse.json({
      asaas_payment_id: paymentData.id,
      qr_code: pixData.encodedImage,
      copia_cola: pixData.payload,
      valor,
      plano_id: plano.id,
      plano_nome: plano.nome,
      duracao_dias: plano.duracao_dias,
    });
  } catch (err: any) {
    console.error('[CADASTRO_PIX] Erro:', err.message);
    return NextResponse.json({ error: err.message || 'Erro ao gerar PIX' }, { status: 500 });
  }
}

// GET - Verificar status do pagamento de cadastro (por asaas_payment_id)
export async function GET(request: NextRequest) {
  try {
    const ASAAS_API_KEY = getAsaasKey();
    const paymentId = request.nextUrl.searchParams.get('payment_id');
    if (!paymentId) {
      return NextResponse.json({ error: 'payment_id obrigatório' }, { status: 400 });
    }

    const asaasRes = await fetch(`${ASAAS_API_URL}/payments/${paymentId}`, {
      headers: { access_token: ASAAS_API_KEY },
      cache: 'no-store',
    });
    const asaasData = await asaasRes.json();

    if (!asaasRes.ok) {
      return NextResponse.json({ status: 'PENDING' });
    }

    const mapped = mapAsaasStatus(asaasData.status);

    const { data: pagamento } = await getAdmin()
      .from('pagamentos')
      .select('*')
      .eq('asaas_payment_id', paymentId)
      .maybeSingle();

    if (pagamento) {
      const statusBanco = await consultarEProcessarPagamento(getAdmin(), pagamento);
      return NextResponse.json({ status: statusBanco === 'confirmado' ? 'CONFIRMED' : statusBanco.toUpperCase() });
    }

    const status = mapped === 'confirmado' ? 'CONFIRMED' : asaasData.status;

    return NextResponse.json({ status });
  } catch (err: any) {
    return NextResponse.json({ status: 'PENDING' });
  }
}
