import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _admin: SupabaseClient | null = null;
function getAdmin(): SupabaseClient {
  if (!_admin) {
    _admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _admin;
}

function formatarTelefone(celular: string): string | null {
  const digits = celular.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 11) return null;
  if (digits.startsWith('55') && digits.length >= 12) return digits;
  return `55${digits}`;
}

async function enviarWhatsApp(
  userId: string,
  notificationId: string,
  mensagem: string
): Promise<void> {
  const admin = getAdmin();

  // 1. Buscar dados do usuário (crítico)
  let user: { tipo: string; celular: string | null } | null = null;
  try {
    const { data } = await admin
      .from('users')
      .select('tipo, celular')
      .eq('id', userId)
      .single();
    user = data;
  } catch (err: any) {
    console.error('[WHATSAPP] Erro ao buscar usuário:', err.message);
    return;
  }

  if (!user || user.tipo === 'admin' || !user.celular) return;

  const phone = formatarTelefone(user.celular);
  if (!phone) {
    console.warn('[WHATSAPP] Telefone inválido para userId:', userId, '| celular:', user.celular);
    return;
  }

  // 2. Verificar env vars (crítico)
  const baseUrl = process.env.NOTIFICAMAIS_BASE_URL;
  const token = process.env.NOTIFICAMAIS_TOKEN;
  const instance = process.env.NOTIFICAMAIS_INSTANCE;

  if (!baseUrl || !token || !instance) {
    console.warn('[WHATSAPP] Variáveis NOTIFICAMAIS_* não configuradas no ambiente.');
    return;
  }

  // 3. Checar duplicidade (não-crítico — ignora se tabela não existir)
  try {
    const { data: existing } = await admin
      .from('whatsapp_notification_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('notification_id', notificationId)
      .eq('phone', phone)
      .eq('status', 'sent')
      .maybeSingle();
    if (existing) return;
  } catch {
    // tabela pode não existir — continua mesmo assim
  }

  const whatsappMessage = `Olá! ${mensagem}\n\nAcesse o JOBBPRO para visualizar os detalhes.`;

  // 4. Criar log pendente (não-crítico)
  let logId: string | null = null;
  try {
    const { data: logEntry } = await admin
      .from('whatsapp_notification_logs')
      .insert({
        user_id: userId,
        notification_id: notificationId,
        phone,
        message: whatsappMessage,
        status: 'pending',
      })
      .select('id')
      .single();
    logId = logEntry?.id ?? null;
  } catch {
    // tabela pode não existir — continua mesmo assim
  }

  // 5. Enviar via NotificaMais (crítico)
  let res: Response | null = null;
  let responseData: any = null;
  try {
    res = await fetch(`${baseUrl}/message/send-text?instanceId=${instance}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ phone, message: whatsappMessage, delayMessage: 0 }),
    });
    responseData = await res.json().catch(() => null);
  } catch (err: any) {
    console.error('[WHATSAPP] Erro na chamada à API:', err.message);
    try {
      if (logId) {
        await admin
          .from('whatsapp_notification_logs')
          .update({ status: 'failed', error_message: err.message })
          .eq('id', logId);
      }
    } catch {}
    return;
  }

  const enviado = res?.ok ?? false;
  console.log(`[WHATSAPP] ${enviado ? 'Enviado' : 'Falha'} → ${phone} | HTTP ${res?.status} |`, responseData);

  // 6. Atualizar log com resultado (não-crítico)
  try {
    if (logId) {
      await admin
        .from('whatsapp_notification_logs')
        .update({
          status: enviado ? 'sent' : 'failed',
          response_api: responseData ?? null,
          error_message: enviado
            ? null
            : responseData?.message || responseData?.error || `HTTP ${res?.status}`,
          sent_at: enviado ? new Date().toISOString() : null,
        })
        .eq('id', logId);
    }
  } catch {}
}

export async function criarNotificacao(
  userId: string,
  titulo: string,
  mensagem: string,
  tipo: string,
  link?: string
): Promise<void> {
  const admin = getAdmin();

  const { data, error } = await admin
    .from('notificacoes')
    .insert({ user_id: userId, titulo, mensagem, tipo, link })
    .select('id')
    .single();

  if (error) {
    console.error('[NOTIFICACAO] Erro ao criar:', error);
    return;
  }

  const notifId = data?.id;
  if (notifId) {
    enviarWhatsApp(userId, notifId, mensagem).catch((err) =>
      console.error('[WHATSAPP] Erro não tratado:', err)
    );
  }
}
