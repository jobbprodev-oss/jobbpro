-- =============================================
-- PARTE 23: Controle de período gratuito do sistema
-- Adiciona configuração global de período gratuito
-- e rastreia tipo de liberação (pago, gratuito_temporario,
-- cortesia_admin) em users e prestador_perfil.
-- Não altera pagamentos já existentes.
-- =============================================

-- Colunas de controle do período gratuito na configuração global
ALTER TABLE configuracoes
  ADD COLUMN IF NOT EXISTS sistema_gratuito_ativo BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS gratuito_inicio TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS gratuito_fim TIMESTAMPTZ;

-- Tipo de liberação do cadastro
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS tipo_liberacao TEXT DEFAULT 'pago'
  CHECK (tipo_liberacao IN ('pago', 'gratuito_temporario', 'cortesia_admin'));

-- Tipo de liberação das funções do prestador (mapa função -> tipo)
ALTER TABLE prestador_perfil
  ADD COLUMN IF NOT EXISTS funcoes_tipo_liberacao JSONB DEFAULT '{}';
