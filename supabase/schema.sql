-- =============================================
-- JOBBPRO - Schema do Banco de Dados (Supabase)
-- =============================================

-- Extensão para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- ENUM Types
-- =============================================
CREATE TYPE user_type AS ENUM ('prestador', 'contratante');
CREATE TYPE match_status AS ENUM ('pendente', 'aceito', 'recusado', 'concluido', 'cancelado');
CREATE TYPE vestimenta_tipo AS ENUM ('social', 'casual', 'uniforme', 'esporte_fino', 'outro');

-- =============================================
-- Tabela: users (perfil base)
-- =============================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo user_type NOT NULL,
  nome TEXT NOT NULL,
  cpf_cnpj TEXT NOT NULL,
  rg TEXT,
  data_nascimento DATE,
  celular TEXT NOT NULL UNIQUE,
  email TEXT,
  cep TEXT,
  endereco TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  foto_url TEXT,
  foto_documento_url TEXT,
  indicacao BOOLEAN DEFAULT false,
  indicacao_nome TEXT,
  indicacao_telefone TEXT,
  ativo BOOLEAN DEFAULT true,
  termo_aceite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mesmo CPF pode ter 1 conta prestador e 1 conta contratante
CREATE UNIQUE INDEX users_cpf_cnpj_tipo_unique ON users (cpf_cnpj, tipo);

-- =============================================
-- Tabela: prestador_perfil
-- =============================================
CREATE TABLE prestador_perfil (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  funcao_principal TEXT NOT NULL,
  funcao_2 TEXT,
  funcao_3 TEXT,
  valor_pretendido DECIMAL(10,2),
  vestimenta vestimenta_tipo DEFAULT 'casual',
  aceita_negociacao BOOLEAN DEFAULT false,
  descricao TEXT,
  media_avaliacao DECIMAL(3,2) DEFAULT 0,
  total_avaliacoes INTEGER DEFAULT 0,
  total_servicos INTEGER DEFAULT 0,
  disponivel BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Tabela: disponibilidades
-- =============================================
CREATE TABLE disponibilidades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prestador_id UUID NOT NULL REFERENCES prestador_perfil(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  horario_inicio TIME NOT NULL,
  horario_fim TIME NOT NULL,
  disponivel BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index para busca por data
CREATE INDEX idx_disponibilidades_data ON disponibilidades(data, disponivel);
CREATE INDEX idx_disponibilidades_prestador ON disponibilidades(prestador_id);

-- =============================================
-- Tabela: contratante_perfil
-- =============================================
CREATE TABLE contratante_perfil (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  nome_empresa TEXT,
  descricao TEXT,
  media_avaliacao DECIMAL(3,2) DEFAULT 0,
  total_avaliacoes INTEGER DEFAULT 0,
  total_contratacoes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Tabela: vagas
-- =============================================
CREATE TABLE vagas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contratante_id UUID NOT NULL REFERENCES contratante_perfil(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  funcao_principal TEXT NOT NULL,
  funcao_2 TEXT,
  funcao_3 TEXT,
  data DATE NOT NULL,
  horario_inicio TIME NOT NULL,
  horario_fim TIME NOT NULL,
  local_servico TEXT NOT NULL,
  endereco_completo TEXT,
  cep TEXT,
  cidade TEXT,
  estado TEXT,
  valor_oferecido DECIMAL(10,2) NOT NULL,
  vestimenta vestimenta_tipo DEFAULT 'casual',
  descricao TEXT,
  ativa BOOLEAN DEFAULT true,
  termo_aceite BOOLEAN DEFAULT false,
  vagas_disponiveis INTEGER DEFAULT 1,
  vagas_preenchidas INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index para busca de vagas
CREATE INDEX idx_vagas_data ON vagas(data, ativa);
CREATE INDEX idx_vagas_funcao ON vagas(funcao_principal);
CREATE INDEX idx_vagas_contratante ON vagas(contratante_id);

-- =============================================
-- Tabela: matches
-- =============================================
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vaga_id UUID NOT NULL REFERENCES vagas(id) ON DELETE CASCADE,
  prestador_id UUID NOT NULL REFERENCES prestador_perfil(id) ON DELETE CASCADE,
  contratante_id UUID NOT NULL REFERENCES contratante_perfil(id) ON DELETE CASCADE,
  status match_status DEFAULT 'pendente',
  match_score DECIMAL(5,2) DEFAULT 0,
  valor_acordado DECIMAL(10,2),
  data_match TIMESTAMPTZ DEFAULT NOW(),
  data_aceite TIMESTAMPTZ,
  data_conclusao TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vaga_id, prestador_id)
);

CREATE INDEX idx_matches_prestador ON matches(prestador_id, status);
CREATE INDEX idx_matches_contratante ON matches(contratante_id, status);
CREATE INDEX idx_matches_vaga ON matches(vaga_id, status);

-- =============================================
-- Tabela: avaliacoes
-- =============================================
CREATE TABLE avaliacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  avaliador_id UUID NOT NULL REFERENCES users(id),
  avaliado_id UUID NOT NULL REFERENCES users(id),
  nota INTEGER NOT NULL CHECK (nota >= 1 AND nota <= 5),
  descricao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, avaliador_id)
);

CREATE INDEX idx_avaliacoes_avaliado ON avaliacoes(avaliado_id);

-- =============================================
-- Tabela: notificacoes
-- =============================================
CREATE TABLE notificacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  tipo TEXT DEFAULT 'info',
  lida BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notificacoes_user ON notificacoes(user_id, lida);

-- =============================================
-- Functions: Atualizar média de avaliação
-- =============================================
CREATE OR REPLACE FUNCTION atualizar_media_avaliacao()
RETURNS TRIGGER
SECURITY DEFINER
AS $func$
DECLARE
  rec_tipo TEXT;
  rec_media DECIMAL(3,2);
  rec_total INTEGER;
BEGIN
  SELECT tipo::TEXT INTO rec_tipo FROM users WHERE id = NEW.avaliado_id;
  
  SELECT AVG(nota)::DECIMAL(3,2), COUNT(*)
  INTO rec_media, rec_total
  FROM avaliacoes
  WHERE avaliado_id = NEW.avaliado_id;
  
  IF rec_tipo = 'prestador' THEN
    UPDATE prestador_perfil
    SET media_avaliacao = rec_media, total_avaliacoes = rec_total, updated_at = NOW()
    WHERE user_id = NEW.avaliado_id;
  ELSIF rec_tipo = 'contratante' THEN
    UPDATE contratante_perfil
    SET media_avaliacao = rec_media, total_avaliacoes = rec_total, updated_at = NOW()
    WHERE user_id = NEW.avaliado_id;
  END IF;
  
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizar_media
AFTER INSERT ON avaliacoes
FOR EACH ROW
EXECUTE FUNCTION atualizar_media_avaliacao();

-- =============================================
-- Function: Match automático
-- =============================================
CREATE OR REPLACE FUNCTION buscar_matches_vaga(vaga_uuid UUID)
RETURNS TABLE (
  prestador_id UUID,
  user_id UUID,
  nome TEXT,
  foto_url TEXT,
  funcao_principal TEXT,
  valor_pretendido DECIMAL,
  media_avaliacao DECIMAL,
  match_score DECIMAL
)
SECURITY DEFINER
AS $func$
DECLARE
  v_funcao1 TEXT;
  v_funcao2 TEXT;
  v_funcao3 TEXT;
  v_data DATE;
  v_h_inicio TIME;
  v_h_fim TIME;
BEGIN
  SELECT v.funcao_principal, v.funcao_2, v.funcao_3, v.data, v.horario_inicio, v.horario_fim
  INTO v_funcao1, v_funcao2, v_funcao3, v_data, v_h_inicio, v_h_fim
  FROM vagas v WHERE v.id = vaga_uuid;

  RETURN QUERY
  SELECT 
    pp.id as prestador_id,
    u.id as user_id,
    u.nome,
    u.foto_url,
    pp.funcao_principal,
    pp.valor_pretendido,
    pp.media_avaliacao,
    (
      CASE WHEN LOWER(pp.funcao_principal) = LOWER(v_funcao1) THEN 40
           WHEN LOWER(pp.funcao_principal) = LOWER(v_funcao2) THEN 30
           WHEN LOWER(pp.funcao_principal) = LOWER(v_funcao3) THEN 20
           ELSE 0 END
      +
      CASE WHEN LOWER(pp.funcao_2) IN (LOWER(v_funcao1), LOWER(v_funcao2), LOWER(v_funcao3)) THEN 15 ELSE 0 END
      +
      CASE WHEN LOWER(pp.funcao_3) IN (LOWER(v_funcao1), LOWER(v_funcao2), LOWER(v_funcao3)) THEN 10 ELSE 0 END
      +
      CASE WHEN pp.media_avaliacao >= 4 THEN 20
           WHEN pp.media_avaliacao >= 3 THEN 10
           ELSE 0 END
    )::DECIMAL as match_score
  FROM prestador_perfil pp
  JOIN users u ON u.id = pp.user_id
  JOIN disponibilidades d ON d.prestador_id = pp.id
  WHERE pp.disponivel = true
    AND u.ativo = true
    AND d.data = v_data
    AND d.disponivel = true
    AND d.horario_inicio <= v_h_inicio
    AND d.horario_fim >= v_h_fim
    AND (
      LOWER(pp.funcao_principal) IN (LOWER(v_funcao1), LOWER(COALESCE(v_funcao2, '')), LOWER(COALESCE(v_funcao3, '')))
      OR LOWER(COALESCE(pp.funcao_2, '')) IN (LOWER(v_funcao1), LOWER(COALESCE(v_funcao2, '')), LOWER(COALESCE(v_funcao3, '')))
      OR LOWER(COALESCE(pp.funcao_3, '')) IN (LOWER(v_funcao1), LOWER(COALESCE(v_funcao2, '')), LOWER(COALESCE(v_funcao3, '')))
    )
    AND NOT EXISTS (
      SELECT 1 FROM matches m WHERE m.vaga_id = vaga_uuid AND m.prestador_id = pp.id AND m.status IN ('aceito', 'concluido')
    )
  ORDER BY match_score DESC;
END;
$func$ LANGUAGE plpgsql;

-- =============================================
-- Function: Buscar vagas compatíveis para prestador
-- =============================================
CREATE OR REPLACE FUNCTION buscar_vagas_compativeis(prestador_uuid UUID)
RETURNS TABLE (
  vaga_id UUID,
  titulo TEXT,
  funcao_principal TEXT,
  data DATE,
  horario_inicio TIME,
  horario_fim TIME,
  local_servico TEXT,
  cidade TEXT,
  valor_oferecido DECIMAL,
  vestimenta vestimenta_tipo,
  match_score DECIMAL,
  contratante_nome TEXT,
  contratante_avaliacao DECIMAL
)
SECURITY DEFINER
AS $func$
DECLARE
  v_funcao1 TEXT;
  v_funcao2 TEXT;
  v_funcao3 TEXT;
BEGIN
  SELECT pp.funcao_principal, pp.funcao_2, pp.funcao_3
  INTO v_funcao1, v_funcao2, v_funcao3
  FROM prestador_perfil pp WHERE pp.id = prestador_uuid;

  RETURN QUERY
  SELECT 
    v.id as vaga_id,
    v.titulo,
    v.funcao_principal,
    v.data,
    v.horario_inicio,
    v.horario_fim,
    v.local_servico,
    v.cidade,
    v.valor_oferecido,
    v.vestimenta,
    (
      CASE WHEN LOWER(v.funcao_principal) = LOWER(v_funcao1) THEN 40
           WHEN LOWER(v.funcao_principal) = LOWER(COALESCE(v_funcao2, '')) THEN 30
           WHEN LOWER(v.funcao_principal) = LOWER(COALESCE(v_funcao3, '')) THEN 20
           ELSE 0 END
      +
      CASE WHEN LOWER(COALESCE(v.funcao_2, '')) IN (LOWER(v_funcao1), LOWER(COALESCE(v_funcao2, '')), LOWER(COALESCE(v_funcao3, ''))) THEN 15 ELSE 0 END
      +
      CASE WHEN LOWER(COALESCE(v.funcao_3, '')) IN (LOWER(v_funcao1), LOWER(COALESCE(v_funcao2, '')), LOWER(COALESCE(v_funcao3, ''))) THEN 10 ELSE 0 END
    )::DECIMAL as match_score,
    u.nome as contratante_nome,
    cp.media_avaliacao as contratante_avaliacao
  FROM vagas v
  JOIN contratante_perfil cp ON cp.id = v.contratante_id
  JOIN users u ON u.id = cp.user_id
  WHERE v.ativa = true
    AND v.data >= CURRENT_DATE
    AND v.vagas_preenchidas < v.vagas_disponiveis
    AND (
      LOWER(v.funcao_principal) IN (LOWER(v_funcao1), LOWER(COALESCE(v_funcao2, '')), LOWER(COALESCE(v_funcao3, '')))
      OR LOWER(COALESCE(v.funcao_2, '')) IN (LOWER(v_funcao1), LOWER(COALESCE(v_funcao2, '')), LOWER(COALESCE(v_funcao3, '')))
      OR LOWER(COALESCE(v.funcao_3, '')) IN (LOWER(v_funcao1), LOWER(COALESCE(v_funcao2, '')), LOWER(COALESCE(v_funcao3, '')))
    )
    AND EXISTS (
      SELECT 1 FROM disponibilidades d
      WHERE d.prestador_id = prestador_uuid
        AND d.data = v.data
        AND d.disponivel = true
        AND d.horario_inicio <= v.horario_inicio
        AND d.horario_fim >= v.horario_fim
    )
    AND NOT EXISTS (
      SELECT 1 FROM matches m WHERE m.vaga_id = v.id AND m.prestador_id = prestador_uuid AND m.status IN ('aceito', 'concluido')
    )
  ORDER BY match_score DESC, v.valor_oferecido DESC;
END;
$func$ LANGUAGE plpgsql;

-- =============================================
-- RLS Policies
-- =============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE prestador_perfil ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratante_perfil ENABLE ROW LEVEL SECURITY;
ALTER TABLE disponibilidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE vagas ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE avaliacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;

-- Users: leitura pública, escrita apenas próprio
CREATE POLICY "Perfis públicos" ON users FOR SELECT USING (true);
CREATE POLICY "Usuário edita próprio perfil" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Usuário insere próprio perfil" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- Prestador perfil
CREATE POLICY "Prestador perfil público" ON prestador_perfil FOR SELECT USING (true);
CREATE POLICY "Prestador edita próprio" ON prestador_perfil FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Prestador insere próprio" ON prestador_perfil FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Contratante perfil
CREATE POLICY "Contratante perfil público" ON contratante_perfil FOR SELECT USING (true);
CREATE POLICY "Contratante edita próprio" ON contratante_perfil FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Contratante insere próprio" ON contratante_perfil FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Disponibilidades
CREATE POLICY "Disponibilidades públicas" ON disponibilidades FOR SELECT USING (true);
CREATE POLICY "Prestador gerencia disponibilidades" ON disponibilidades FOR ALL 
  USING (EXISTS (SELECT 1 FROM prestador_perfil pp WHERE pp.id = prestador_id AND pp.user_id = auth.uid()));

-- Vagas
CREATE POLICY "Vagas públicas" ON vagas FOR SELECT USING (true);
CREATE POLICY "Contratante gerencia vagas" ON vagas FOR ALL 
  USING (EXISTS (SELECT 1 FROM contratante_perfil cp WHERE cp.id = contratante_id AND cp.user_id = auth.uid()));

-- Matches
CREATE POLICY "Ver próprios matches" ON matches FOR SELECT 
  USING (
    EXISTS (SELECT 1 FROM prestador_perfil pp WHERE pp.id = prestador_id AND pp.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM contratante_perfil cp WHERE cp.id = contratante_id AND cp.user_id = auth.uid())
  );
CREATE POLICY "Criar match" ON matches FOR INSERT WITH CHECK (true);
CREATE POLICY "Atualizar match" ON matches FOR UPDATE USING (true);

-- Avaliacoes
CREATE POLICY "Avaliacoes públicas" ON avaliacoes FOR SELECT USING (true);
CREATE POLICY "Inserir avaliação" ON avaliacoes FOR INSERT WITH CHECK (auth.uid() = avaliador_id);

-- Notificacoes
CREATE POLICY "Ver próprias notificações" ON notificacoes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Atualizar próprias notificações" ON notificacoes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Inserir notificações" ON notificacoes FOR INSERT WITH CHECK (true);

-- =============================================
-- Storage Buckets
-- =============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('documentos', 'documentos', false);

CREATE POLICY "Avatar público" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Upload avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Upload documento" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documentos' AND auth.role() = 'authenticated');
CREATE POLICY "Ver próprio documento" ON storage.objects FOR SELECT USING (bucket_id = 'documentos' AND auth.uid()::text = (storage.foldername(name))[1]);
