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

  // 5. Verificar se RPC existe
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
