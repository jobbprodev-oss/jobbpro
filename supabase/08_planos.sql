-- =============================================
-- PARTE 8: Planos de Assinatura
-- =============================================

-- Tabela de planos
CREATE TABLE IF NOT EXISTS planos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  valor DECIMAL(10,2) NOT NULL DEFAULT 0,
  duracao_dias INTEGER NOT NULL DEFAULT 30,
  tipo_usuario user_type NOT NULL DEFAULT 'prestador',
  ativo BOOLEAN DEFAULT true,
  recursos JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar campo plano nos users (se não existir)
ALTER TABLE users ADD COLUMN IF NOT EXISTS plano_id UUID REFERENCES planos(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS plano_ativo BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS plano_expira_em TIMESTAMPTZ;

-- RLS
ALTER TABLE planos ENABLE ROW LEVEL SECURITY;

-- Todos podem ler planos ativos
CREATE POLICY "planos_select_public" ON planos FOR SELECT USING (true);

-- Apenas admin pode inserir/atualizar/deletar
CREATE POLICY "planos_admin_insert" ON planos FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND tipo = 'admin')
);
CREATE POLICY "planos_admin_update" ON planos FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND tipo = 'admin')
);
CREATE POLICY "planos_admin_delete" ON planos FOR DELETE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND tipo = 'admin')
);

-- Índice
CREATE INDEX IF NOT EXISTS idx_planos_tipo ON planos(tipo_usuario, ativo);
