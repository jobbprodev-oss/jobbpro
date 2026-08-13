import { SupabaseClient } from '@supabase/supabase-js';

// URL padrão é a de PRODUÇÃO do Asaas. Só deve ser sobrescrita por ASAAS_API_URL
// em ambientes de desenvolvimento/teste explicitamente configurados para Sandbox
// (https://api-sandbox.asaas.com/v3).
export const ASAAS_API_URL = process.env.ASAAS_API_URL || 'https://api.asaas.com/v3';

// Chaves do Asaas seguem prefixos fixos por ambiente:
//   Produção -> $aact_prod_...
//   Sandbox  -> $aact_hmlg_...
// Isso permite detectar e bloquear, em tempo de execução, qualquer combinação
// inconsistente entre a URL configurada e a chave configurada (ex.: chave de
// produção apontando para a URL de sandbox, ou vice-versa), evitando que uma
// transação em produção seja processada silenciosamente no Sandbox.
export function getAsaasKey() {
  const rawKey = process.env.ASAAS_API_KEY || '';
  if (!rawKey) {
    throw new Error('Chave do Asaas não configurada. Configure ASAAS_API_KEY nas variáveis de ambiente.');
  }
  const key = rawKey.startsWith('$') ? rawKey : `$${rawKey}`;

  const isSandboxUrl = ASAAS_API_URL.includes('sandbox');
  const isSandboxKey = key.startsWith('$aact_hmlg_');
  const isProdKey = key.startsWith('$aact_prod_');

  if (isSandboxUrl && isProdKey) {
    throw new Error(
      'Configuração inválida do Asaas: ASAAS_API_KEY é uma chave de PRODUÇÃO ($aact_prod_...) mas ASAAS_API_URL aponta para o SANDBOX. Corrija as variáveis de ambiente antes de continuar.'
    );
  }
  if (!isSandboxUrl && isSandboxKey) {
    throw new Error(
      'Configuração inválida do Asaas: ASAAS_API_KEY é uma chave de SANDBOX ($aact_hmlg_...) mas ASAAS_API_URL aponta para PRODUÇÃO. Use a chave de produção ($aact_prod_...) nesta variável de ambiente.'
    );
  }

  return key;
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
      .select('id, funcao_principal, funcao_2, funcao_3, funcao_4, funcao_5, funcao_6, funcoes_extras, funcoes_tipo_liberacao')
      .eq('user_id', pagamento.user_id)
      .single();

    if (perfil) {
      const normalize = (s?: string | null) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
      const extras: string[] = Array.isArray(perfil.funcoes_extras) ? perfil.funcoes_extras : [];
      const jaExiste = [perfil.funcao_principal, perfil.funcao_2, perfil.funcao_3, perfil.funcao_4, perfil.funcao_5, perfil.funcao_6, ...extras]
        .some((f) => normalize(f) === normalize(nomeFuncao));
      if (!jaExiste) {
        const slots = ['funcao_2', 'funcao_3', 'funcao_4', 'funcao_5', 'funcao_6'];
        const slotVazio = slots.find((s) => !(perfil as Record<string, any>)[s]);
        const tipoMap = (perfil.funcoes_tipo_liberacao as Record<string, string> | null) || {};
        tipoMap[nomeFuncao] = 'pago';
        if (slotVazio) {
          await admin.from('prestador_perfil').update({ [slotVazio]: nomeFuncao, funcoes_tipo_liberacao: tipoMap, updated_at: new Date().toISOString() }).eq('id', perfil.id);
        } else {
          // Todos os slots fixos preenchidos: função vai para o array ilimitado de funções extras
          await admin.from('prestador_perfil').update({ funcoes_extras: [...extras, nomeFuncao], funcoes_tipo_liberacao: tipoMap, updated_at: new Date().toISOString() }).eq('id', perfil.id);
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
      .update({ plano_id: pagamento.metadata.plano_id, plano_ativo: true, plano_expira_em: expira.toISOString(), tipo_liberacao: 'pago' })
      .eq('id', pagamento.user_id);
  }

  if (pagamento.tipo === 'disponibilidade' && pagamento.metadata?.plano_id) {
    console.log('[PAGAMENTO_PROCESSAR] Disponibilidade liberada:', pagamento.user_id);
    // Buscar perfil do prestador
    const { data: perfil } = await admin
      .from('prestador_perfil')
      .select('id')
      .eq('user_id', pagamento.user_id)
      .single();

    if (perfil && pagamento.metadata.duracao_horas) {
      const duracaoHoras = pagamento.metadata.duracao_horas;
      const agora = new Date();
      const fimDate = new Date(agora.getTime() + duracaoHoras * 60 * 60 * 1000);

      const pad = (n: number) => String(n).padStart(2, '0');
      const dataStr = agora.toISOString().split('T')[0];
      const inicioStr = `${pad(agora.getHours())}:${pad(agora.getMinutes())}`;
      const fimStr = `${pad(fimDate.getHours())}:${pad(fimDate.getMinutes())}`;
      const expiresAt = fimDate.toISOString();

      await admin.from('disponibilidades').insert({
        prestador_id: perfil.id,
        data: dataStr,
        horario_inicio: inicioStr,
        horario_fim: fimStr,
        disponivel: true,
        plano_id: pagamento.metadata.plano_id,
        expires_at: expiresAt,
      });
      console.log('[PAGAMENTO_PROCESSAR] Disponibilidade criada para prestador:', perfil.id);
    }
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
