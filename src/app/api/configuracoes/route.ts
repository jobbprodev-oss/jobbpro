import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  try {
    const { data, error } = await getAdmin()
      .from('configuracoes')
      .select('*')
      .eq('id', 'global')
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({
      termos_uso: data?.termos_uso || '',
      politica_privacidade: data?.politica_privacidade || '',
      cadastro_gratuito_ativo: !!data?.cadastro_gratuito_ativo,
      funcao_extra_gratuita_ativo: !!data?.funcao_extra_gratuita_ativo,
      publicacao_vaga_gratuita_ativo: !!data?.publicacao_vaga_gratuita_ativo,
      disponibilidade_gratuita_ativo: !!data?.disponibilidade_gratuita_ativo,
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message, termos_uso: '', politica_privacidade: '', cadastro_gratuito_ativo: false, funcao_extra_gratuita_ativo: false, publicacao_vaga_gratuita_ativo: false, disponibilidade_gratuita_ativo: false },
      { status: 500, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  }
}
