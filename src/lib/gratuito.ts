import { SupabaseClient } from '@supabase/supabase-js';

export async function isSistemaGratuitoAtivo(admin: SupabaseClient): Promise<boolean> {
  const { data } = await admin
    .from('configuracoes')
    .select('sistema_gratuito_ativo, gratuito_inicio, gratuito_fim')
    .eq('id', 'global')
    .maybeSingle();

  if (!data || !data.sistema_gratuito_ativo) return false;

  const agora = new Date();
  const inicio = data.gratuito_inicio ? new Date(data.gratuito_inicio) : null;
  const fim = data.gratuito_fim ? new Date(data.gratuito_fim) : null;

  if (inicio && agora < inicio) return false;
  if (fim && agora > fim) return false;

  return true;
}

export async function getConfigGratuito(admin: SupabaseClient) {
  const { data } = await admin
    .from('configuracoes')
    .select('sistema_gratuito_ativo, gratuito_inicio, gratuito_fim')
    .eq('id', 'global')
    .maybeSingle();

  return {
    sistema_gratuito_ativo: data?.sistema_gratuito_ativo || false,
    gratuito_inicio: data?.gratuito_inicio || '',
    gratuito_fim: data?.gratuito_fim || '',
  };
}
