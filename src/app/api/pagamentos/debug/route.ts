import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const url = process.env.ASAAS_API_URL || 'https://api.asaas.com/v3';
  const key = process.env.ASAAS_API_KEY || '';
  const keyPreview = key ? `${key.substring(0, 10)}...${key.substring(key.length - 4)}` : 'NÃO DEFINIDA';
  
  return NextResponse.json({
    ASAAS_API_URL: url,
    ASAAS_API_KEY_preview: keyPreview,
    ASAAS_API_KEY_length: key.length,
    is_sandbox_url: url.includes('sandbox'),
    env_keys: Object.keys(process.env).filter(k => k.includes('ASAAS')),
  });
}
