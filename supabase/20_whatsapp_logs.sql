-- =============================================
-- Tabela de logs de envio via WhatsApp (NotificaMais)
-- =============================================

CREATE TABLE IF NOT EXISTS whatsapp_notification_logs (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID        REFERENCES users(id) ON DELETE SET NULL,
  notification_id UUID,
  phone         TEXT        NOT NULL,
  message       TEXT        NOT NULL,
  status        TEXT        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'sent', 'failed')),
  response_api  JSONB,
  error_message TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  sent_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_wh_logs_user_id    ON whatsapp_notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_wh_logs_status     ON whatsapp_notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_wh_logs_created_at ON whatsapp_notification_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wh_logs_notif_id   ON whatsapp_notification_logs(notification_id);

-- RLS: apenas service_role escreve; admin lê tudo
ALTER TABLE whatsapp_notification_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin lê logs whatsapp" ON whatsapp_notification_logs;
CREATE POLICY "Admin lê logs whatsapp"
  ON whatsapp_notification_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND tipo = 'admin'
    )
  );
