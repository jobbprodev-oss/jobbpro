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
      .select('termos_uso, politica_privacidade')
      .eq('id', 'global')
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({
      termos_uso: data?.termos_uso || '',
      politica_privacidade: data?.politica_privacidade || '',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message, termos_uso: '', politica_privacidade: '' },
      { status: 500 }
    );
  }
}
