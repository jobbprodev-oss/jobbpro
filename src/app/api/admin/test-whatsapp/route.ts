import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    const { data: u } = await admin.from('users').select('tipo').eq('id', user.id).single();
    if (u?.tipo !== 'admin') return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

    const { phone, message } = await request.json();
    if (!phone) return NextResponse.json({ error: 'phone obrigatório' }, { status: 400 });

    const baseUrl = process.env.NOTIFICAMAIS_BASE_URL;
    const apitoken = process.env.NOTIFICAMAIS_TOKEN;
    const instance = process.env.NOTIFICAMAIS_INSTANCE;

    const envStatus = {
      NOTIFICAMAIS_BASE_URL: baseUrl ? `${baseUrl.slice(0, 20)}...` : 'NÃO CONFIGURADO',
      NOTIFICAMAIS_TOKEN: apitoken ? `${apitoken.slice(0, 6)}...` : 'NÃO CONFIGURADO',
      NOTIFICAMAIS_INSTANCE: instance ?? 'NÃO CONFIGURADO',
    };

    if (!baseUrl || !apitoken || !instance) {
      return NextResponse.json({ ok: false, etapa: 'env_vars', envStatus });
    }

    const digits = phone.replace(/\D/g, '');
    const formattedPhone = digits.startsWith('55') && digits.length >= 12
      ? digits
      : `55${digits}`;

    const url = `${baseUrl}/message/send-text?instanceId=${instance}`;
    const body = { phone: formattedPhone, message: message?.trim() || 'Teste JOBBPRO ✅ Integração WhatsApp funcionando!', delayMessage: 0 };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apitoken}` },
      body: JSON.stringify(body),
    });

    const responseData = await res.json().catch(() => null);

    return NextResponse.json({
      ok: res.ok,
      httpStatus: res.status,
      etapa: 'api_call',
      url,
      bodyEnviado: body,
      envStatus,
      resposta: responseData,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, etapa: 'exception', erro: err.message }, { status: 500 });
  }
}
