-- =============================================
-- PARTE 6: RLS Policies e Storage
-- =============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE prestador_perfil ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratante_perfil ENABLE ROW LEVEL SECURITY;
ALTER TABLE disponibilidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE vagas ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE avaliacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Perfis públicos" ON users FOR SELECT USING (true);
CREATE POLICY "Usuário edita próprio perfil" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Usuário insere próprio perfil" ON users FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Prestador perfil público" ON prestador_perfil FOR SELECT USING (true);
CREATE POLICY "Prestador edita próprio" ON prestador_perfil FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Prestador insere próprio" ON prestador_perfil FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Contratante perfil público" ON contratante_perfil FOR SELECT USING (true);
CREATE POLICY "Contratante edita próprio" ON contratante_perfil FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Contratante insere próprio" ON contratante_perfil FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Disponibilidades públicas" ON disponibilidades FOR SELECT USING (true);
CREATE POLICY "Prestador gerencia disponibilidades" ON disponibilidades FOR ALL 
  USING (EXISTS (SELECT 1 FROM prestador_perfil pp WHERE pp.id = prestador_id AND pp.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM prestador_perfil pp WHERE pp.id = prestador_id AND pp.user_id = auth.uid()));

CREATE POLICY "Vagas públicas" ON vagas FOR SELECT USING (true);
CREATE POLICY "Contratante gerencia vagas" ON vagas FOR ALL 
  USING (EXISTS (SELECT 1 FROM contratante_perfil cp WHERE cp.id = contratante_id AND cp.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM contratante_perfil cp WHERE cp.id = contratante_id AND cp.user_id = auth.uid()));

CREATE POLICY "Ver próprios matches" ON matches FOR SELECT 
  USING (
    EXISTS (SELECT 1 FROM prestador_perfil pp WHERE pp.id = prestador_id AND pp.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM contratante_perfil cp WHERE cp.id = contratante_id AND cp.user_id = auth.uid())
  );
CREATE POLICY "Criar match" ON matches FOR INSERT WITH CHECK (true);
CREATE POLICY "Atualizar match" ON matches FOR UPDATE USING (true);

CREATE POLICY "Avaliacoes públicas" ON avaliacoes FOR SELECT USING (true);
CREATE POLICY "Inserir avaliação" ON avaliacoes FOR INSERT WITH CHECK (auth.uid() = avaliador_id);

CREATE POLICY "Ver próprias notificações" ON notificacoes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Atualizar próprias notificações" ON notificacoes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Inserir notificações" ON notificacoes FOR INSERT WITH CHECK (true);

INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('documentos', 'documentos', false);

CREATE POLICY "Avatar público" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Upload avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Upload documento" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documentos' AND auth.role() = 'authenticated');
CREATE POLICY "Ver próprio documento" ON storage.objects FOR SELECT USING (bucket_id = 'documentos' AND auth.uid()::text = (storage.foldername(name))[1]);
