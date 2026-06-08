import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { ASAAS_API_URL, getAsaasKey } from '@/lib/pagamentos-server';

let _client: SupabaseClient | null = null;
function getAdmin(): SupabaseClient {
  if (!_client) {
    _client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  }
  return _client;
}

export const dynamic = 'force-dynamic';

async function safeJson(res: Response, label: string) {
  const text = await res.text();
  console.log(`[ASAAS][${label}] Status: ${res.status}, Body: ${text.substring(0, 500)}`);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Resposta inválida do Asaas (${label}): ${text.substring(0, 200)}`);
  }
}

// POST - Criar cobrança PIX
export async function POST(request: NextRequest) {
  try {
    const ASAAS_API_KEY = getAsaasKey();
    console.log('[PIX] ASAAS_API_URL:', ASAAS_API_URL);
    console.log('[PIX] ASAAS_API_KEY definida:', ASAAS_API_KEY.length > 1, 'Tamanho:', ASAAS_API_KEY.length);

    if (ASAAS_API_KEY.length <= 1) {
      return NextResponse.json({ error: 'Chave do Asaas não configurada no servidor' }, { status: 500 });
    }

    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { data: { user: authUser } } = await getAdmin().auth.getUser(token);
    if (!authUser) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

    const { tipo, nome_funcao, plano_id, descricao, vaga_id } = await request.json();
    if (!tipo && !plano_id) return NextResponse.json({ error: 'Tipo de pagamento ou plano_id obrigatório' }, { status: 400 });

    // Buscar dados do usuário
    const { data: userData } = await getAdmin()
      .from('users')
      .select('nome, email, cpf_cnpj, celular')
      .eq('id', authUser.id)
      .single();
    if (!userData) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

    console.log('[PIX] Usuário:', userData.nome, 'CPF:', userData.cpf_cnpj?.substring(0, 5) + '...');

    // Determinar valor e descrição
    let valor: number;
    let paymentDescricao: string;

    if (plano_id) {
      // Buscar plano pelo ID
      const { data: plano, error: planoError } = await getAdmin()
        .from('planos')
        .select('valor, nome')
        .eq('id', plano_id)
        .single();
      
      if (planoError || !plano) {
        return NextResponse.json({ error: 'Plano não encontrado' }, { status: 404 });
      }
      
      valor = plano.valor;
      paymentDescricao = descricao || plano.nome;
    } else {
      // Buscar plano de compra de função cadastrado no admin
      const { data: planoFuncao } = await getAdmin()
        .from('planos')
        .select('valor, nome')
        .eq('categoria', 'funcao')
        .eq('ativo', true)
        .limit(1)
        .maybeSingle();

      valor = planoFuncao?.valor ?? 9.90;
      paymentDescricao = `Função extra: ${nome_funcao}`;
    }

    // 1. Criar ou buscar customer no Asaas
    let asaasCustomerId: string;

    // Verificar se já tem customer
    const { data: pagamentoExistente } = await getAdmin()
      .from('pagamentos')
      .select('asaas_customer_id')
      .eq('user_id', authUser.id)
      .not('asaas_customer_id', 'is', null)
      .limit(1)
      .maybeSingle();

    if (pagamentoExistente?.asaas_customer_id) {
      asaasCustomerId = pagamentoExistente.asaas_customer_id;
      console.log('[PIX] Customer existente:', asaasCustomerId);
    } else {
      // Criar customer
      const customerBody = {
        name: userData.nome,
        email: userData.email,
        cpfCnpj: userData.cpf_cnpj?.replace(/\D/g, ''),
        mobilePhone: userData.celular?.replace(/\D/g, ''),
      };
      console.log('[PIX] Criando customer:', JSON.stringify(customerBody));

      const customerRes = await fetch(`${ASAAS_API_URL}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', access_token: ASAAS_API_KEY },
        body: JSON.stringify(customerBody),
        cache: 'no-store',
      });
      const customerData = await safeJson(customerRes, 'CREATE_CUSTOMER');
      if (!customerRes.ok) {
        throw new Error(customerData.errors?.[0]?.description || `Erro Asaas (${customerRes.status}): ${JSON.stringify(customerData)}`);
      }
      asaasCustomerId = customerData.id;
      console.log('[PIX] Customer criado:', asaasCustomerId);
    }

    // 2. Criar cobrança PIX
    const dueDate = new Date();
    dueDate.setMinutes(dueDate.getMinutes() + 30);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    const paymentBody = {
      customer: asaasCustomerId,
      billingType: 'PIX',
      value: valor,
      dueDate: dueDateStr,
      description: `JOBBPRO - ${paymentDescricao}`,
      externalReference: authUser.id,
    };
    console.log('[PIX] Criando cobrança:', JSON.stringify(paymentBody));

    const paymentRes = await fetch(`${ASAAS_API_URL}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', access_token: ASAAS_API_KEY },
      body: JSON.stringify(paymentBody),
      cache: 'no-store',
    });
    const paymentData = await safeJson(paymentRes, 'CREATE_PAYMENT');
    if (!paymentRes.ok) {
      throw new Error(paymentData.errors?.[0]?.description || `Erro Asaas (${paymentRes.status}): ${JSON.stringify(paymentData)}`);
    }
    console.log('[PIX] Cobrança criada:', paymentData.id);

    // 3. Buscar QR Code PIX
    const pixRes = await fetch(`${ASAAS_API_URL}/payments/${paymentData.id}/pixQrCode`, {
      headers: { access_token: ASAAS_API_KEY },
      cache: 'no-store',
    });
    const pixData = await safeJson(pixRes, 'PIX_QRCODE');
    if (!pixRes.ok) {
      throw new Error(`Erro ao gerar QR Code (${pixRes.status}): ${JSON.stringify(pixData)}`);
    }
    console.log('[PIX] QR Code gerado com sucesso');

    // 4. Salvar no banco
    const { data: pagamento, error: dbError } = await getAdmin()
      .from('pagamentos')
      .insert({
        user_id: authUser.id,
        asaas_payment_id: paymentData.id,
        asaas_customer_id: asaasCustomerId,
        tipo: tipo === 'publicacao_vaga' ? 'publicacao_vaga' : 'funcao_extra',
        valor,
        status: 'pendente',
        pix_qr_code: pixData.encodedImage,
        pix_copia_cola: pixData.payload,
        pix_expiracao: pixData.expirationDate,
        metadata: {
          nome_funcao: nome_funcao || null,
          vaga_id: vaga_id || null,
          plano_id: plano_id || null,
        },
      })
      .select()
      .single();
    if (dbError) {
      console.error('[PIX] Erro DB:', dbError);
      throw dbError;
    }

    console.log('[PIX] Pagamento salvo:', pagamento.id);

    return NextResponse.json({
      pagamento_id: pagamento.id,
      asaas_payment_id: paymentData.id,
      valor,
      qr_code: pixData.encodedImage,
      copia_cola: pixData.payload,
      expiracao: pixData.expirationDate,
    });
  } catch (err: any) {
    console.error('[PIX] Erro final:', err.message || err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}
