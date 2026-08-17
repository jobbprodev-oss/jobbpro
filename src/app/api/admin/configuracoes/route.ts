import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const ADMIN_EMAILS = ['guttembergy@gmail.com', 'bergnoco@gmail.com', 'ben@teste.com'];

function getAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(`ENV_MISSING: SUPABASE_URL=${!!url} SERVICE_ROLE_KEY=${!!key}`);
  }
  return createClient(url, key);
}

async function isAdmin(token: string): Promise<boolean> {
  const { data: { user } } = await getAdmin().auth.getUser(token);
  if (!user) return false;
  const { data } = await getAdmin().from('users').select('tipo').eq('id', user.id).maybeSingle();
  if (data?.tipo === 'admin') return true;
  if (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) return true;
  return false;
}

export const dynamic = 'force-dynamic';

// GET - Buscar configurações
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    console.log('[CONFIGURACOES GET] token presente:', !!token);
    const adminOk = token ? await isAdmin(token) : false;
    console.log('[CONFIGURACOES GET] isAdmin:', adminOk);
    if (!token || !adminOk) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const { data, error } = await getAdmin()
      .from('configuracoes')
      .select('*')
      .eq('id', 'global')
      .single();

    console.log('[CONFIGURACOES GET] error:', error?.message, '| data keys:', data ? Object.keys(data) : null);
    if (error && error.code !== 'PGRST116') throw error;

    return NextResponse.json({ configuracoes: data || {} }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (err: any) {
    console.log('[CONFIGURACOES GET] exception:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT - Salvar configurações
export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    console.log('[CONFIGURACOES PUT] token presente:', !!token);
    const adminOk = token ? await isAdmin(token) : false;
    console.log('[CONFIGURACOES PUT] isAdmin:', adminOk);
    if (!token || !adminOk) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { termos_uso, politica_privacidade, cadastro_gratuito_ativo, funcao_extra_gratuita_ativo, publicacao_vaga_gratuita_ativo, disponibilidade_gratuita_ativo } = body;

    const payload: any = { id: 'global' };
    if (termos_uso !== undefined) payload.termos_uso = termos_uso ?? '';
    if (politica_privacidade !== undefined) payload.politica_privacidade = politica_privacidade ?? '';
    if (cadastro_gratuito_ativo !== undefined) payload.cadastro_gratuito_ativo = cadastro_gratuito_ativo;
    if (funcao_extra_gratuita_ativo !== undefined) payload.funcao_extra_gratuita_ativo = funcao_extra_gratuita_ativo;
    if (publicacao_vaga_gratuita_ativo !== undefined) payload.publicacao_vaga_gratuita_ativo = publicacao_vaga_gratuita_ativo;
    if (disponibilidade_gratuita_ativo !== undefined) payload.disponibilidade_gratuita_ativo = disponibilidade_gratuita_ativo;

    console.log('[CONFIGURACOES PUT] payload:', JSON.stringify(payload));
    const { data, error } = await getAdmin()
      .from('configuracoes')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();

    console.log('[CONFIGURACOES PUT] upsert result - error:', error?.message, '| data keys:', data ? Object.keys(data) : null);
    if (error) throw error;

    return NextResponse.json({ configuracoes: data }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
