-- =============================================
-- PARTE 2: Função atualizar_media_avaliacao
-- Rode SEPARADAMENTE no SQL Editor
-- =============================================

CREATE OR REPLACE FUNCTION atualizar_media_avaliacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE prestador_perfil SET
    media_avaliacao = COALESCE((SELECT AVG(nota)::DECIMAL(3,2) FROM avaliacoes WHERE avaliado_id = NEW.avaliado_id), 0),
    total_avaliacoes = (SELECT COUNT(*) FROM avaliacoes WHERE avaliado_id = NEW.avaliado_id),
    updated_at = NOW()
  WHERE user_id = NEW.avaliado_id;

  UPDATE contratante_perfil SET
    media_avaliacao = COALESCE((SELECT AVG(nota)::DECIMAL(3,2) FROM avaliacoes WHERE avaliado_id = NEW.avaliado_id), 0),
    total_avaliacoes = (SELECT COUNT(*) FROM avaliacoes WHERE avaliado_id = NEW.avaliado_id),
    updated_at = NOW()
  WHERE user_id = NEW.avaliado_id;

  RETURN NEW;
END;
$$;
