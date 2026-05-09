-- =============================================
-- PARTE 1: Extensões, ENUMs e Tabelas
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE user_type AS ENUM ('prestador', 'contratante');
CREATE TYPE match_status AS ENUM ('pendente', 'aceito', 'recusado', 'concluido', 'cancelado');
CREATE TYPE vestimenta_tipo AS ENUM ('social', 'casual', 'uniforme', 'esporte_fino', 'outro');

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo user_type NOT NULL,
  nome TEXT NOT NULL,
  cpf_cnpj TEXT NOT NULL,
  rg TEXT,
  data_nascimento DATE,
  celular TEXT NOT NULL,
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

CREATE TABLE prestador_perfil (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  funcao_principal TEXT NOT NULL,
  funcao_2 TEXT,
  funcao_3 TEXT,
  funcao_4 TEXT,
  funcao_5 TEXT,
  funcao_6 TEXT,
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

CREATE TABLE disponibilidades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prestador_id UUID NOT NULL REFERENCES prestador_perfil(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  horario_inicio TIME NOT NULL,
  horario_fim TIME NOT NULL,
  disponivel BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_disponibilidades_data ON disponibilidades(data, disponivel);
CREATE INDEX idx_disponibilidades_prestador ON disponibilidades(prestador_id);

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
  bairro TEXT,
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

CREATE INDEX idx_vagas_data ON vagas(data, ativa);
CREATE INDEX idx_vagas_funcao ON vagas(funcao_principal);
CREATE INDEX idx_vagas_contratante ON vagas(contratante_id);

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
