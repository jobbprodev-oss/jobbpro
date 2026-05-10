-- Tabela de configurações globais
CREATE TABLE IF NOT EXISTS configuracoes (
  id TEXT PRIMARY KEY DEFAULT 'global',
  termos_uso TEXT,
  politica_privacidade TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_configuracoes_updated_at 
  BEFORE UPDATE ON configuracoes 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserir configuração global padrão
INSERT INTO configuracoes (id, termos_uso, politica_privacidade)
VALUES ('global', '', '')
ON CONFLICT (id) DO NOTHING;

-- Permissões
ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ver configuracoes" ON configuracoes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.tipo = 'admin'
    )
  );

CREATE POLICY "Admins podem atualizar configuracoes" ON configuracoes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.tipo = 'admin'
    )
  );

CREATE POLICY "Admins podem inserir configuracoes" ON configuracoes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.tipo = 'admin'
    )
  );

CREATE POLICY "Todos podem ver termos e politica" ON configuracoes
  FOR SELECT USING (id = 'global');
