-- =============================================
-- PARTE 9: Funções dinâmicas + Solicitações
-- =============================================

-- Tabela de funções disponíveis (gerenciada pelo admin)
CREATE TABLE IF NOT EXISTS funcoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  ativa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Popular com funções iniciais
INSERT INTO funcoes (nome) VALUES
  ('Garçom'), ('Garçonete'), ('Barman'), ('Cozinheiro(a)'),
  ('Auxiliar de Cozinha'), ('Copeiro(a)'), ('Maitre'), ('Hostess'),
  ('Recepcionista'), ('Segurança'), ('Manobrista'), ('Limpeza'),
  ('Promotor(a)'), ('DJ'), ('Fotógrafo(a)'), ('Decorador(a)'),
  ('Montador(a)'), ('Eletricista'), ('Encanador'), ('Pintor(a)'),
  ('Pedreiro'), ('Jardineiro(a)'), ('Motorista'), ('Entregador(a)'),
  ('Auxiliar Geral'), ('Outro')
ON CONFLICT (nome) DO NOTHING;

-- Tabela de solicitações de novas funções
CREATE TABLE IF NOT EXISTS solicitacoes_funcao (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  solicitante_id UUID REFERENCES users(id) NOT NULL,
  nome_funcao TEXT NOT NULL,
  motivo TEXT,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovada', 'rejeitada')),
  admin_resposta TEXT,
  respondido_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS funcoes
ALTER TABLE funcoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "funcoes_select_all" ON funcoes FOR SELECT USING (true);
CREATE POLICY "funcoes_admin_insert" ON funcoes FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND tipo = 'admin')
);
CREATE POLICY "funcoes_admin_update" ON funcoes FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND tipo = 'admin')
);

-- RLS solicitacoes_funcao
ALTER TABLE solicitacoes_funcao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "solicitacoes_select_own" ON solicitacoes_funcao FOR SELECT USING (
  solicitante_id = auth.uid()
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND tipo = 'admin')
);
CREATE POLICY "solicitacoes_insert_auth" ON solicitacoes_funcao FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
);
CREATE POLICY "solicitacoes_admin_update" ON solicitacoes_funcao FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND tipo = 'admin')
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_funcoes_ativa ON funcoes(ativa);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_status ON solicitacoes_funcao(status);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_solicitante ON solicitacoes_funcao(solicitante_id);

-- =============================================
-- RPC: Responder solicitação (SECURITY DEFINER bypassa RLS)
-- =============================================
CREATE OR REPLACE FUNCTION responder_solicitacao(
  p_id UUID,
  p_status TEXT,
  p_admin_resposta TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  UPDATE solicitacoes_funcao
  SET status = p_status,
      admin_resposta = p_admin_resposta,
      respondido_em = NOW()
  WHERE id = p_id AND status = 'pendente';

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Solicitação não encontrada ou já respondida');
  END IF;

  SELECT json_build_object('success', true, 'id', id, 'status', status)
  INTO v_result
  FROM solicitacoes_funcao WHERE id = p_id;

  RETURN v_result;
END;
$$;
