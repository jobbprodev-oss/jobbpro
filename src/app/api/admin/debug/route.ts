import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET - Diagnosticar problemas com service_role_key e update
export async function GET(request: NextRequest) {
  const results: Record<string, any> = {};

  // 1. Verificar se variáveis estão definidas
  results.env = {
    url_defined: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    service_key_defined: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    service_key_starts_with: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 10) || 'UNDEFINED',
    anon_key_starts_with: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 10) || 'UNDEFINED',
    keys_are_same: process.env.SUPABASE_SERVICE_ROLE_KEY === process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };

  // 2. Criar client fresh (não singleton)
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 3. Testar SELECT em solicitacoes_funcao
  try {
    const { data, error } = await client
      .from('solicitacoes_funcao')
      .select('id, nome_funcao, status')
      .limit(5);
    results.select_test = { success: !error, count: data?.length, data, error: error?.message };
  } catch (e: any) {
    results.select_test = { success: false, error: e.message };
  }

  // 4. Testar UPDATE direto (pegar primeiro pendente e tentar atualizar)
  try {
    const { data: pendente } = await client
      .from('solicitacoes_funcao')
      .select('id, status')
      .eq('status', 'pendente')
      .limit(1)
      .single();

    if (pendente) {
      // Tentar update
      const { data: updated, error: updateErr, count } = await client
        .from('solicitacoes_funcao')
        .update({ status: 'aprovada' })
        .eq('id', pendente.id)
        .select('id, status')
        .single();

      results.update_test = {
        target_id: pendente.id,
        update_error: updateErr?.message || null,
        update_result: updated,
        count,
      };

      // Verificar se persistiu
      const { data: verify } = await client
        .from('solicitacoes_funcao')
        .select('id, status')
        .eq('id', pendente.id)
        .single();

      results.verify_after_update = verify;

      // REVERTER para pendente (teste apenas)
      await client
        .from('solicitacoes_funcao')
        .update({ status: 'pendente' })
        .eq('id', pendente.id);

      results.note = 'Status revertido para pendente após teste';
    } else {
      results.update_test = { message: 'Nenhuma solicitação pendente encontrada' };
    }
  } catch (e: any) {
    results.update_test = { success: false, error: e.message };
  }

  // 5a. Testar configuracoes (tabela crítica para gratuito/termos)
  try {
    const { data: cfg, error: cfgErr } = await client
      .from('configuracoes')
      .select('id, cadastro_gratuito_ativo, funcao_extra_gratuita_ativo, publicacao_vaga_gratuita_ativo, disponibilidade_gratuita_ativo, termos_uso')
      .eq('id', 'global')
      .maybeSingle();
    results.configuracoes_read = { ok: !cfgErr, data: cfg, error: cfgErr?.message };

    // Testar upsert (write)
    if (!cfgErr && cfg) {
      const { data: upserted, error: upsertErr } = await client
        .from('configuracoes')
        .upsert({ id: 'global', cadastro_gratuito_ativo: cfg.cadastro_gratuito_ativo }, { onConflict: 'id' })
        .select('id, cadastro_gratuito_ativo')
        .single();
      results.configuracoes_write = { ok: !upsertErr, data: upserted, error: upsertErr?.message };
    }
  } catch (e: any) {
    results.configuracoes_read = { ok: false, error: e.message };
  }

  // 5b. Testar planos (select)
  try {
    const { data: planos, error: planosErr, count } = await client
      .from('planos')
      .select('id, nome, categoria, ativo', { count: 'exact' })
      .limit(3);
    results.planos_read = { ok: !planosErr, total: count, sample: planos, error: planosErr?.message };
  } catch (e: any) {
    results.planos_read = { ok: false, error: e.message };
  }

  // 5c. Verificar avaliacoes
  try {
    const { data: avs, error: avErr, count } = await client
      .from('avaliacoes')
      .select('id, avaliado_id, nota, descricao', { count: 'exact' })
      .limit(5);
    results.avaliacoes = { total: count, sample: avs, error: avErr?.message };
  } catch (e: any) {
    results.avaliacoes = { error: e.message };
  }

  // 6. Verificar se RPC existe
  try {
    const { data, error } = await client.rpc('responder_solicitacao', {
      p_id: '00000000-0000-0000-0000-000000000000',
      p_status: 'aprovada',
    });
    results.rpc_test = { exists: !error || !error.message.includes('not exist'), error: error?.message, data };
  } catch (e: any) {
    results.rpc_test = { exists: false, error: e.message };
  }

  return NextResponse.json(results, { status: 200 });
}
