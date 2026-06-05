import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

let _client: SupabaseClient | null = null;
function getAdmin(): SupabaseClient {
  if (!_client) {
    _client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  }
  return _client;
}

function getAsaasKey() {
  const rawKey = process.env.ASAAS_API_KEY || '';
  if (!rawKey) {
    throw new Error('Chave do Asaas não configurada. Configure ASAAS_API_KEY nas variáveis de ambiente.');
  }
  return rawKey.startsWith('$') ? rawKey : `$${rawKey}`;
}

const ASAAS_API_URL = 'https://sandbox.asaas.com/api/v3';

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

    const confirmados = ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'];
    const status = confirmados.includes(asaasData.status) ? 'CONFIRMED' : asaasData.status;

    return NextResponse.json({ status });
  } catch (err: any) {
    return NextResponse.json({ status: 'PENDING' });
  }
}
