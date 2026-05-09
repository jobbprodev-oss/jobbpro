-- =============================================
-- PARTE 10: Pagamentos (Asaas PIX)
-- =============================================

CREATE TABLE pagamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  asaas_payment_id TEXT,
  asaas_customer_id TEXT,
  tipo TEXT NOT NULL DEFAULT 'funcao_extra',
  valor DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  pix_qr_code TEXT,
  pix_copia_cola TEXT,
  pix_expiracao TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pagamentos_user ON pagamentos(user_id);
CREATE INDEX idx_pagamentos_asaas ON pagamentos(asaas_payment_id);
CREATE INDEX idx_pagamentos_status ON pagamentos(status);

-- RLS
ALTER TABLE pagamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem seus pagamentos"
  ON pagamentos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admin vê todos pagamentos"
  ON pagamentos FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND tipo = 'admin')
  );
