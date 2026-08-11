-- =============================================
-- PARTE 25: Controle independente de gratuidade
-- da Disponibilidade
--   - disponibilidade_gratuita_ativo
-- Segue o mesmo padrão dos demais controles
-- independentes (sem datas de início/fim).
-- =============================================

ALTER TABLE configuracoes
  ADD COLUMN IF NOT EXISTS disponibilidade_gratuita_ativo BOOLEAN DEFAULT false;
