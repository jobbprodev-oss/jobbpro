-- =============================================
-- PARTE 17: Plano de Compra de Função Extra
-- =============================================

-- Garantir coluna duracao_horas na tabela planos (caso migration 16 não tenha rodado)
ALTER TABLE planos ADD COLUMN IF NOT EXISTS duracao_horas INTEGER DEFAULT NULL;

-- Garantir campos de expiração nas disponibilidades (caso migration 16 não tenha rodado)
ALTER TABLE disponibilidades ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE disponibilidades ADD COLUMN IF NOT EXISTS plano_id UUID REFERENCES planos(id);

-- Inserir plano "Compra de Função Extra" se ainda não existir
INSERT INTO planos (nome, descricao, valor, duracao_dias, tipo_usuario, categoria, ativo, recursos)
SELECT
  'Compra de Função Extra',
  'Adicione uma nova função ao seu perfil de prestador',
  9.90,
  0,
  'prestador',
  'funcao',
  true,
  '["Adicionar função extra ao perfil"]'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM planos WHERE categoria = 'funcao'
);
