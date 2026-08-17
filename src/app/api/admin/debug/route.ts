import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET - Diagnóstico completo para problemas de produção
export async function GET(request: NextRequest) {
  const results: Record<string, any> = {};

  // 1. Variáveis de ambiente
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  results.env = {
    url_defined: !!url,
    url_prefix: url?.substring(0, 30) || 'UNDEFINED',
    service_key_defined: !!serviceKey,
    service_key_length: serviceKey?.length || 0,
    service_key_prefix: serviceKey?.substring(0, 15) || 'UNDEFINED',
    anon_key_defined: !!anonKey,
    anon_key_prefix: anonKey?.substring(0, 15) || 'UNDEFINED',
    keys_are_same: serviceKey === anonKey,
    verdict: !serviceKey
      ? 'ERRO: SUPABASE_SERVICE_ROLE_KEY ausente — upserts bloqueados por RLS'
      : serviceKey === anonKey
      ? 'ERRO: SERVICE_KEY é igual à ANON_KEY — use a chave service_role do Supabase'
      : 'OK',
  };

  if (!url || !serviceKey) {
    return NextResponse.json({ ...results, fatal: 'Env vars ausentes, abortando diagnóstico' }, { status: 200 });
  }

  // 2. Client com service_role (bypassa RLS)
  const adminClient = createClient(url, serviceKey);

  // 3. Colunas existentes na tabela configuracoes
  try {
    const { data: cols, error: colErr } = await adminClient
      .from('information_schema.columns' as any)
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'configuracoes');

    const existingCols = (cols as any[])?.map((c: any) => c.column_name) || [];
    const required = ['cadastro_gratuito_ativo', 'funcao_extra_gratuita_ativo', 'publicacao_vaga_gratuita_ativo', 'disponibilidade_gratuita_ativo'];
    const missing = required.filter(c => !existingCols.includes(c));

    results.configuracoes_schema = {
      ok: !colErr && missing.length === 0,
      existing_columns: existingCols,
      missing_migration_columns: missing,
      error: colErr?.message,
      verdict: missing.length > 0
        ? `ERRO: Colunas ausentes no banco → execute as migrações 22-25 no Supabase SQL Editor`
        : 'OK: todas as colunas existem',
    };
  } catch (e: any) {
    results.configuracoes_schema = { ok: false, error: e.message };
  }

  // 4. Teste SELECT configuracoes com service_role
  try {
    const { data: cfg, error: cfgErr } = await adminClient
      .from('configuracoes')
      .select('*')
      .eq('id', 'global')
      .maybeSingle();

    results.configuracoes_select = {
      ok: !cfgErr,
      row_exists: !!cfg,
      columns_returned: cfg ? Object.keys(cfg) : [],
      values: cfg ? {
        cadastro_gratuito_ativo: cfg.cadastro_gratuito_ativo,
        funcao_extra_gratuita_ativo: cfg.funcao_extra_gratuita_ativo,
        publicacao_vaga_gratuita_ativo: cfg.publicacao_vaga_gratuita_ativo,
        disponibilidade_gratuita_ativo: cfg.disponibilidade_gratuita_ativo,
        termos_uso_length: cfg.termos_uso?.length || 0,
      } : null,
      error: cfgErr?.message,
    };
  } catch (e: any) {
    results.configuracoes_select = { ok: false, error: e.message };
  }

  // 5. Teste UPSERT configuracoes com service_role (write real)
  try {
    const { data: upserted, error: upsertErr } = await adminClient
      .from('configuracoes')
      .upsert({ id: 'global', cadastro_gratuito_ativo: false }, { onConflict: 'id' })
      .select('id, cadastro_gratuito_ativo')
      .single();

    results.configuracoes_upsert = {
      ok: !upsertErr,
      data: upserted,
      error: upsertErr?.message,
      verdict: upsertErr
        ? `ERRO: ${upsertErr.message}`
        : 'OK: upsert funcionou — service_role_key está correto e colunas existem',
    };
  } catch (e: any) {
    results.configuracoes_upsert = { ok: false, error: e.message };
  }

  // 6. Teste SELECT com anon key (simula cliente sem service_role)
  try {
    const anonClient = createClient(url, anonKey || '');
    const { data: anonData, error: anonErr } = await anonClient
      .from('configuracoes')
      .select('id, termos_uso')
      .eq('id', 'global')
      .maybeSingle();

    results.anon_select_test = {
      ok: !anonErr,
      data: anonData,
      error: anonErr?.message,
      note: 'Anon pode SELECT via policy "Todos podem ver termos e politica" — mas não pode UPDATE',
    };
  } catch (e: any) {
    results.anon_select_test = { ok: false, error: e.message };
  }

  // 7. Teste UPSERT com anon key (deve falhar por RLS)
  try {
    const anonClient = createClient(url, anonKey || '');
    const { data: anonUpsert, error: anonUpsertErr } = await anonClient
      .from('configuracoes')
      .upsert({ id: 'global', cadastro_gratuito_ativo: false }, { onConflict: 'id' })
      .select('id')
      .single();

    results.anon_upsert_test = {
      ok: !anonUpsertErr,
      error: anonUpsertErr?.message,
      note: anonUpsertErr
        ? 'ESPERADO: anon não pode upsert — RLS bloqueia corretamente'
        : 'ALERTA: anon conseguiu upsert — RLS pode estar desativado',
    };
  } catch (e: any) {
    results.anon_upsert_test = { ok: false, error: e.message };
  }

  return NextResponse.json(results, {
    status: 200,
    headers: { 'Cache-Control': 'no-store' },
  });
}
