import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { consultarEProcessarPagamento, getAsaasKey, mapAsaasStatus, ASAAS_API_URL } from '@/lib/pagamentos-server';

let _client: SupabaseClient | null = null;
function getAdmin(): SupabaseClient {
  if (!_client) {
    _client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  }
  return _client;
}

export const dynamic = 'force-dynamic';

// GET - Verificar status do pagamento
export async function GET(request: NextRequest) {
  try {

    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { data: { user: authUser } } = await getAdmin().auth.getUser(token);
    if (!authUser) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

    const pagamentoId = request.nextUrl.searchParams.get('id');
    if (!pagamentoId) return NextResponse.json({ error: 'ID do pagamento obrigatório' }, { status: 400 });

    // Buscar pagamento no banco (pode ser ID local ou asaas_payment_id)
    let pagamento;
    
    // Primeiro tenta buscar por ID local
    const { data: pagamentoLocal } = await getAdmin()
      .from('pagamentos')
      .select('*')
      .eq('id', pagamentoId)
      .eq('user_id', authUser.id)
      .maybeSingle();
    
    if (pagamentoLocal) {
      pagamento = pagamentoLocal;
    } else {
      // Se não encontrar, tenta por asaas_payment_id
      const { data: pagamentoAsaas } = await getAdmin()
        .from('pagamentos')
        .select('*')
        .eq('asaas_payment_id', pagamentoId)
        .eq('user_id', authUser.id)
        .maybeSingle();
      
      if (!pagamentoAsaas) {
        // Se não encontrou em nenhum, verifica direto no Asaas (para pagamentos novos)
        console.log('[PIX_STATUS] Pagamento não encontrado no banco, consultando Asaas diretamente');
        const asaasRes = await fetch(`${ASAAS_API_URL}/payments/${pagamentoId}`, {
          headers: { access_token: getAsaasKey() },
          cache: 'no-store',
        });
        
        if (!asaasRes.ok) {
          return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 });
        }
        
        const asaasData = await asaasRes.json();
        console.log('[PIX_STATUS] Status direto do Asaas:', asaasData.status);
        
        // Mapear status
        const status = mapAsaasStatus(asaasData.status);
        
        return NextResponse.json({ status, asaas_status: asaasData.status });
      }
      
      pagamento = pagamentoAsaas;
    }

    // Se já está confirmado, retornar direto
    if (pagamento.status === 'confirmado') {
      return NextResponse.json({ status: 'confirmado', pagamento });
    }

    const novoStatus = await consultarEProcessarPagamento(getAdmin(), pagamento);
    return NextResponse.json({ status: novoStatus });
  } catch (err: any) {
    console.error('[PIX_STATUS] Erro:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}
