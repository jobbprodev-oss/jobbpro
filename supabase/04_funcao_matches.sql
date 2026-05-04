-- =============================================
-- PARTE 4: Função buscar_matches_vaga
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
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH vi AS (
    SELECT v.funcao_principal AS f1, v.funcao_2 AS f2, v.funcao_3 AS f3, v.data AS vd, v.horario_inicio AS hi, v.horario_fim AS hf
    FROM vagas v WHERE v.id = vaga_uuid
  )
  SELECT 
    pp.id,
    u.id,
    u.nome,
    u.foto_url,
    pp.funcao_principal,
    pp.valor_pretendido,
    pp.media_avaliacao,
    (
      CASE WHEN LOWER(pp.funcao_principal) = LOWER(vi.f1) THEN 40
           WHEN LOWER(pp.funcao_principal) = LOWER(vi.f2) THEN 30
           WHEN LOWER(pp.funcao_principal) = LOWER(vi.f3) THEN 20
           ELSE 0 END
      +
      CASE WHEN LOWER(pp.funcao_2) IN (LOWER(vi.f1), LOWER(vi.f2), LOWER(vi.f3)) THEN 15 ELSE 0 END
      +
      CASE WHEN LOWER(pp.funcao_3) IN (LOWER(vi.f1), LOWER(vi.f2), LOWER(vi.f3)) THEN 10 ELSE 0 END
      +
      CASE WHEN pp.media_avaliacao >= 4 THEN 20
           WHEN pp.media_avaliacao >= 3 THEN 10
           ELSE 0 END
    )::DECIMAL
  FROM prestador_perfil pp
  JOIN users u ON u.id = pp.user_id
  JOIN disponibilidades d ON d.prestador_id = pp.id
  CROSS JOIN vi
  WHERE pp.disponivel = true
    AND u.ativo = true
    AND d.data = vi.vd
    AND d.disponivel = true
    AND d.horario_inicio <= vi.hi
    AND d.horario_fim >= vi.hf
    AND (
      LOWER(pp.funcao_principal) IN (LOWER(vi.f1), LOWER(COALESCE(vi.f2, '')), LOWER(COALESCE(vi.f3, '')))
      OR LOWER(COALESCE(pp.funcao_2, '')) IN (LOWER(vi.f1), LOWER(COALESCE(vi.f2, '')), LOWER(COALESCE(vi.f3, '')))
      OR LOWER(COALESCE(pp.funcao_3, '')) IN (LOWER(vi.f1), LOWER(COALESCE(vi.f2, '')), LOWER(COALESCE(vi.f3, '')))
    )
    AND NOT EXISTS (
      SELECT 1 FROM matches m WHERE m.vaga_id = vaga_uuid AND m.prestador_id = pp.id AND m.status IN ('aceito'::match_status, 'concluido'::match_status)
    )
  ORDER BY 8 DESC;
END;
$$;
