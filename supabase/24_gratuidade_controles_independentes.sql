-- =============================================
-- PARTE 24: Controles independentes de gratuidade
-- Substitui o controle único "sistema_gratuito_ativo"
-- por 3 chaves independentes, sem datas de início/fim:
--   - cadastro_gratuito_ativo
--   - funcao_extra_gratuita_ativo
--   - publicacao_vaga_gratuita_ativo
-- Não remove as colunas antigas (sistema_gratuito_ativo,
-- gratuito_inicio, gratuito_fim) para não quebrar nada
-- que já tenha sido aplicado; elas simplesmente deixam
-- de ser usadas pela aplicação.
-- =============================================

ALTER TABLE configuracoes
  ADD COLUMN IF NOT EXISTS cadastro_gratuito_ativo BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS funcao_extra_gratuita_ativo BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS publicacao_vaga_gratuita_ativo BOOLEAN DEFAULT false;
