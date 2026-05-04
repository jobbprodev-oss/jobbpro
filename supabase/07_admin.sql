-- =============================================
-- PARTE 7A: Admin - Adicionar ENUM
-- =============================================
-- ⚠️  EXECUTE ESTE BLOCO SOZINHO PRIMEIRO
--
ALTER TYPE user_type ADD VALUE IF NOT EXISTS 'admin';
ALTER TYPE match_status ADD VALUE IF NOT EXISTS 'confirmado';


-- =============================================
-- PARTE 7B: Função is_admin() + RLS Policies
-- =============================================
-- ⚠️  EXECUTE APÓS a PARTE 7A ter sido commitada
--
-- SECURITY DEFINER evita recursão infinita ao consultar a tabela users

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND tipo::text = 'admin'
  );
$$;

DROP POLICY IF EXISTS "Admin lê todos os users" ON users;
CREATE POLICY "Admin lê todos os users" ON users FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS "Admin lê todos prestador_perfil" ON prestador_perfil;
CREATE POLICY "Admin lê todos prestador_perfil" ON prestador_perfil FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS "Admin lê todos contratante_perfil" ON contratante_perfil;
CREATE POLICY "Admin lê todos contratante_perfil" ON contratante_perfil FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS "Admin lê todas vagas" ON vagas;
CREATE POLICY "Admin lê todas vagas" ON vagas FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS "Admin lê todos matches" ON matches;
CREATE POLICY "Admin lê todos matches" ON matches FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS "Admin lê todas avaliacoes" ON avaliacoes;
CREATE POLICY "Admin lê todas avaliacoes" ON avaliacoes FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS "Admin lê todas notificacoes" ON notificacoes;
CREATE POLICY "Admin lê todas notificacoes" ON notificacoes FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS "Admin lê todas disponibilidades" ON disponibilidades;
CREATE POLICY "Admin lê todas disponibilidades" ON disponibilidades FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS "Admin atualiza users" ON users;
CREATE POLICY "Admin atualiza users" ON users FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin deleta vagas" ON vagas;
CREATE POLICY "Admin deleta vagas" ON vagas FOR DELETE
  USING (is_admin());


-- =============================================
-- PARTE 7D: Funções auxiliares
-- =============================================

-- Incremento atômico de vagas_preenchidas (evita race condition)
CREATE OR REPLACE FUNCTION incrementar_vagas_preenchidas(p_vaga_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE vagas SET vagas_preenchidas = vagas_preenchidas + 1 WHERE id = p_vaga_id;
$$;

-- Incrementa contadores ao concluir match
CREATE OR REPLACE FUNCTION incrementar_contadores_conclusao(p_prestador_id UUID, p_contratante_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE prestador_perfil SET total_servicos = total_servicos + 1 WHERE id = p_prestador_id;
  UPDATE contratante_perfil SET total_contratacoes = total_contratacoes + 1 WHERE id = p_contratante_id;
$$;


-- =============================================
-- PARTE 7C: SEED - Criar usuário admin
-- =============================================
-- IMPORTANTE: Execute estes passos manualmente:
--
-- 1. Crie o usuário no Supabase Auth (Dashboard > Authentication > Users > Add User):
--    Email: admin@jobbpro.com
--    Password: Admin@123456
--
-- 2. Após criar, copie o UUID gerado e substitua abaixo:
--
-- INSERT INTO users (id, tipo, nome, cpf_cnpj, celular, email, ativo, termo_aceite)
-- VALUES (
--   'COLE_O_UUID_AQUI',
--   'admin',
--   'Administrador',
--   '00000000000',
--   '00000000000',
--   'admin@jobbpro.com',
--   true,
--   true
-- );
