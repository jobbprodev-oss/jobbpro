-- =============================================
-- PARTE 16: Validade de disponibilidade por plano
-- =============================================

-- Adicionar duracao_horas nos planos de serviço
ALTER TABLE planos ADD COLUMN IF NOT EXISTS duracao_horas INTEGER DEFAULT 24;

-- Adicionar campos de expiração e plano nas disponibilidades
ALTER TABLE disponibilidades ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE disponibilidades ADD COLUMN IF NOT EXISTS plano_id UUID REFERENCES planos(id);

-- Atualizar planos de serviço existentes: converter duracao_dias para horas
UPDATE planos
SET duracao_horas = duracao_dias * 24
WHERE categoria = 'servico' AND duracao_horas IS NULL;

-- Índice para busca por expiração
CREATE INDEX IF NOT EXISTS idx_disponibilidades_expires ON disponibilidades(expires_at);
