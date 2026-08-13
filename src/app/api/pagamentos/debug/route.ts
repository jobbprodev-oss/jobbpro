import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const url = process.env.ASAAS_API_URL || 'https://api.asaas.com/v3';
  const key = process.env.ASAAS_API_KEY || '';
  const normalizedKey = key.startsWith('$') ? key : (key ? `$${key}` : '');
  const keyPreview = key ? `${key.substring(0, 10)}...${key.substring(key.length - 4)}` : 'NÃO DEFINIDA';

  const isSandboxUrl = url.includes('sandbox');
  const isSandboxKey = normalizedKey.startsWith('$aact_hmlg_');
  const isProdKey = normalizedKey.startsWith('$aact_prod_');

  return NextResponse.json({
    ASAAS_API_URL: url,
    ASAAS_API_KEY_preview: keyPreview,
    ASAAS_API_KEY_length: key.length,
    is_sandbox_url: isSandboxUrl,
    is_sandbox_key: isSandboxKey,
    is_prod_key: isProdKey,
    ambiente_consistente: !((isSandboxUrl && isProdKey) || (!isSandboxUrl && isSandboxKey)),
    env_keys: Object.keys(process.env).filter(k => k.includes('ASAAS')),
  });
}
