-- =============================================
-- PARTE 3: Trigger da avaliação
-- =============================================

CREATE TRIGGER trigger_atualizar_media
AFTER INSERT ON avaliacoes
FOR EACH ROW
EXECUTE FUNCTION atualizar_media_avaliacao();
