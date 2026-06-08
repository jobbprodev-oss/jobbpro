import { SupabaseClient } from '@supabase/supabase-js';

export const ASAAS_API_URL = 'https://sandbox.asaas.com/api/v3';

export function getAsaasKey() {
  const rawKey = process.env.ASAAS_API_KEY || '';
  if (!rawKey) {
    throw new Error('Chave do Asaas não configurada. Configure ASAAS_API_KEY nas variáveis de ambiente.');
  }
  return rawKey.startsWith('$') ? rawKey : `$${rawKey}`;
}

export function mapAsaasStatus(status?: string) {
  if (['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(status || '')) return 'confirmado';
  if (['OVERDUE', 'REFUNDED', 'DELETED', 'CANCELLED'].includes(status || '')) return 'expirado';
  return 'pendente';
}

export async function processarPagamentoConfirmado(admin: SupabaseClient, pagamento: any) {
  if (!pagamento) return;

  if (pagamento.tipo === 'funcao_extra' && pagamento.metadata?.nome_funcao) {
    const nomeFuncao = pagamento.metadata.nome_funcao;
    console.log('[PAGAMENTO_PROCESSAR] Função liberada:', pagamento.id, nomeFuncao);
    const { data: perfil } = await admin
      .from('prestador_perfil')
      .select('id, funcao_principal, funcao_2, funcao_3, funcao_4, funcao_5, funcao_6')
      .eq('user_id', pagamento.user_id)
      .single();

    if (perfil) {
      const normalize = (s?: string | null) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
      const jaExiste = [perfil.funcao_principal, perfil.funcao_2, perfil.funcao_3, perfil.funcao_4, perfil.funcao_5, perfil.funcao_6]
        .some((f) => normalize(f) === normalize(nomeFuncao));
      if (!jaExiste) {
        const slots = ['funcao_2', 'funcao_3', 'funcao_4', 'funcao_5', 'funcao_6'];
        const slotVazio = slots.find((s) => !(perfil as Record<string, any>)[s]);
        if (slotVazio) {
          await admin.from('prestador_perfil').update({ [slotVazio]: nomeFuncao, updated_at: new Date().toISOString() }).eq('id', perfil.id);
        }
      }
    }
  }

  if (pagamento.tipo === 'publicacao_vaga' && pagamento.metadata?.vaga_id) {
    console.log('[PAGAMENTO_PROCESSAR] Vaga publicada:', pagamento.metadata.vaga_id);
    await admin
      .from('vagas')
      .update({ ativa: true, updated_at: new Date().toISOString() })
      .eq('id', pagamento.metadata.vaga_id);
  }

  if (pagamento.tipo === 'cadastro' && pagamento.metadata?.plano_id) {
    const expira = new Date();
    expira.setDate(expira.getDate() + (pagamento.metadata.duracao_dias || 365));
    console.log('[PAGAMENTO_PROCESSAR] Cadastro liberado:', pagamento.user_id);
    await admin
      .from('users')
      .update({ plano_id: pagamento.metadata.plano_id, plano_ativo: true, plano_expira_em: expira.toISOString() })
      .eq('id', pagamento.user_id);
  }
}

export async function consultarEProcessarPagamento(admin: SupabaseClient, pagamento: any) {
  const asaasRes = await fetch(`${ASAAS_API_URL}/payments/${pagamento.asaas_payment_id}`, {
    headers: { access_token: getAsaasKey() },
    cache: 'no-store',
  });
  if (!asaasRes.ok) return pagamento.status;
  const asaasData = await asaasRes.json();
  const novoStatus = mapAsaasStatus(asaasData.status);

  if (novoStatus !== pagamento.status) {
    console.log('[PAGAMENTO_STATUS]', pagamento.id, pagamento.status, '->', novoStatus);
    await admin.from('pagamentos').update({ status: novoStatus, updated_at: new Date().toISOString() }).eq('id', pagamento.id);
  }

  if (novoStatus === 'confirmado' && pagamento.status !== 'confirmado') {
    await processarPagamentoConfirmado(admin, { ...pagamento, status: novoStatus });
  }

  return novoStatus;
}
