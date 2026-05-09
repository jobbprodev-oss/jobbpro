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

// GET - Verificar status do pagamento
export async function GET(request: NextRequest) {
  try {
    const ASAAS_API_URL = process.env.ASAAS_API_URL || 'https://api.asaas.com/v3';
    const rawKey = process.env.ASAAS_API_KEY || '';
    const ASAAS_API_KEY = rawKey.startsWith('$') ? rawKey : `$${rawKey}`;

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
      .single();
    
    if (pagamentoLocal) {
      pagamento = pagamentoLocal;
    } else {
      // Se não encontrar, tenta por asaas_payment_id
      const { data: pagamentoAsaas } = await getAdmin()
        .from('pagamentos')
        .select('*')
        .eq('asaas_payment_id', pagamentoId)
        .eq('user_id', authUser.id)
        .single();
      
      if (!pagamentoAsaas) {
        // Se não encontrou em nenhum, verifica direto no Asaas (para pagamentos novos)
        console.log('[PIX_STATUS] Pagamento não encontrado no banco, consultando Asaas diretamente');
        const asaasRes = await fetch(`${ASAAS_API_URL}/payments/${pagamentoId}`, {
          headers: { access_token: ASAAS_API_KEY },
          cache: 'no-store',
        });
        
        if (!asaasRes.ok) {
          return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 });
        }
        
        const asaasData = await asaasRes.json();
        console.log('[PIX_STATUS] Status direto do Asaas:', asaasData.status);
        
        // Mapear status
        let status = 'pendente';
        if (asaasData.status === 'RECEIVED' || asaasData.status === 'CONFIRMED' || asaasData.status === 'RECEIVED_IN_CASH') {
          status = 'confirmado';
        } else if (asaasData.status === 'OVERDUE' || asaasData.status === 'REFUNDED' || asaasData.status === 'DELETED') {
          status = 'expirado';
        }
        
        return NextResponse.json({ status, asaas_status: asaasData.status });
      }
      
      pagamento = pagamentoAsaas;
    }

    // Se já está confirmado, retornar direto
    if (pagamento.status === 'confirmado') {
      return NextResponse.json({ status: 'confirmado', pagamento });
    }

    // Consultar status no Asaas
    console.log('[PIX_STATUS] Consultando payment:', pagamento.asaas_payment_id, 'Key length:', ASAAS_API_KEY.length);
    const asaasRes = await fetch(`${ASAAS_API_URL}/payments/${pagamento.asaas_payment_id}`, {
      headers: { access_token: ASAAS_API_KEY },
      cache: 'no-store',
    });
    const asaasText = await asaasRes.text();
    let asaasData: any;
    try {
      asaasData = JSON.parse(asaasText);
    } catch {
      console.error('[PIX_STATUS] Resposta inválida do Asaas:', asaasText.substring(0, 300));
      return NextResponse.json({ status: pagamento.status, asaas_status: 'UNKNOWN' });
    }

    console.log('[PIX_STATUS] Asaas retornou status:', asaasData.status);

    let novoStatus = pagamento.status;
    if (asaasData.status === 'RECEIVED' || asaasData.status === 'CONFIRMED' || asaasData.status === 'RECEIVED_IN_CASH') {
      novoStatus = 'confirmado';
    } else if (asaasData.status === 'OVERDUE' || asaasData.status === 'REFUNDED' || asaasData.status === 'DELETED') {
      novoStatus = 'expirado';
    } else if (asaasData.status === 'PENDING' || asaasData.status === 'AWAITING_RISK_ANALYSIS') {
      novoStatus = 'pendente';
    }

    // Atualizar status no banco se mudou
    if (novoStatus !== pagamento.status) {
      await getAdmin()
        .from('pagamentos')
        .update({ status: novoStatus, updated_at: new Date().toISOString() })
        .eq('id', pagamento.id);

      // Se confirmou, adicionar a função ao perfil automaticamente
      if (novoStatus === 'confirmado' && pagamento.metadata?.nome_funcao) {
        const nomeFuncao = pagamento.metadata.nome_funcao;
        console.log('[PIX_STATUS] Pagamento confirmado! Adicionando função:', nomeFuncao);

        // Buscar perfil do prestador
        const { data: perfil } = await getAdmin()
          .from('prestador_perfil')
          .select('id, funcao_principal, funcao_2, funcao_3, funcao_4, funcao_5, funcao_6')
          .eq('user_id', authUser.id)
          .single();

        if (perfil) {
          // Encontrar próximo slot vazio
          const slots = ['funcao_2', 'funcao_3', 'funcao_4', 'funcao_5', 'funcao_6'];
          const slotVazio = slots.find((s) => !perfil[s as keyof typeof perfil]);
          if (slotVazio) {
            await getAdmin()
              .from('prestador_perfil')
              .update({ [slotVazio]: nomeFuncao, updated_at: new Date().toISOString() })
              .eq('id', perfil.id);
            console.log('[PIX_STATUS] Função adicionada no slot:', slotVazio);
          }
        }
      }
    }

    return NextResponse.json({ status: novoStatus, asaas_status: asaasData.status });
  } catch (err: any) {
    console.error('[PIX_STATUS] Erro:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}
