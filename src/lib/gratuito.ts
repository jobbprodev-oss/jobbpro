import { SupabaseClient } from '@supabase/supabase-js';

export interface GratuidadeConfig {
  cadastro_gratuito_ativo: boolean;
  funcao_extra_gratuita_ativo: boolean;
  publicacao_vaga_gratuita_ativo: boolean;
}

export async function getConfigGratuito(admin: SupabaseClient): Promise<GratuidadeConfig> {
  const { data } = await admin
    .from('configuracoes')
    .select('cadastro_gratuito_ativo, funcao_extra_gratuita_ativo, publicacao_vaga_gratuita_ativo')
    .eq('id', 'global')
    .maybeSingle();

  return {
    cadastro_gratuito_ativo: !!data?.cadastro_gratuito_ativo,
    funcao_extra_gratuita_ativo: !!data?.funcao_extra_gratuita_ativo,
    publicacao_vaga_gratuita_ativo: !!data?.publicacao_vaga_gratuita_ativo,
  };
}

export async function isCadastroGratuitoAtivo(admin: SupabaseClient): Promise<boolean> {
  const { data } = await admin
    .from('configuracoes')
    .select('cadastro_gratuito_ativo')
    .eq('id', 'global')
    .maybeSingle();
  return !!data?.cadastro_gratuito_ativo;
}

export async function isFuncaoExtraGratuitaAtiva(admin: SupabaseClient): Promise<boolean> {
  const { data } = await admin
    .from('configuracoes')
    .select('funcao_extra_gratuita_ativo')
    .eq('id', 'global')
    .maybeSingle();
  return !!data?.funcao_extra_gratuita_ativo;
}

export async function isPublicacaoVagaGratuitaAtiva(admin: SupabaseClient): Promise<boolean> {
  const { data } = await admin
    .from('configuracoes')
    .select('publicacao_vaga_gratuita_ativo')
    .eq('id', 'global')
    .maybeSingle();
  return !!data?.publicacao_vaga_gratuita_ativo;
}
