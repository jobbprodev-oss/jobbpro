-- =============================================
-- PARTE 5: Função buscar_vagas_compativeis
-- =============================================

DROP FUNCTION IF EXISTS buscar_vagas_compativeis(UUID);

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
  bairro TEXT,
  valor_oferecido DECIMAL,
  vestimenta vestimenta_tipo,
  match_score DECIMAL,
  contratante_nome TEXT,
  contratante_avaliacao DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH pi AS (
    SELECT pp.funcao_principal AS f1, pp.funcao_2 AS f2, pp.funcao_3 AS f3
    FROM prestador_perfil pp WHERE pp.id = prestador_uuid
  )
  SELECT 
    v.id,
    v.titulo,
    v.funcao_principal,
    v.data,
    v.horario_inicio,
    v.horario_fim,
    v.local_servico,
    v.cidade,
    v.bairro,
    v.valor_oferecido,
    v.vestimenta,
    (
      CASE WHEN LOWER(v.funcao_principal) = LOWER(pi.f1) THEN 40
           WHEN pi.f2 IS NOT NULL AND LOWER(v.funcao_principal) = LOWER(pi.f2) THEN 30
           WHEN pi.f3 IS NOT NULL AND LOWER(v.funcao_principal) = LOWER(pi.f3) THEN 20
           ELSE 0 END
      +
      CASE WHEN v.funcao_2 IS NOT NULL AND LOWER(v.funcao_2) IN (LOWER(pi.f1), LOWER(COALESCE(pi.f2, '___')), LOWER(COALESCE(pi.f3, '___'))) THEN 15 ELSE 0 END
      +
      CASE WHEN v.funcao_3 IS NOT NULL AND LOWER(v.funcao_3) IN (LOWER(pi.f1), LOWER(COALESCE(pi.f2, '___')), LOWER(COALESCE(pi.f3, '___'))) THEN 10 ELSE 0 END
    )::DECIMAL,
    u.nome,
    cp.media_avaliacao
  FROM vagas v
  JOIN contratante_perfil cp ON cp.id = v.contratante_id
  JOIN users u ON u.id = cp.user_id
  CROSS JOIN pi
  WHERE v.ativa = true
    AND v.data >= CURRENT_DATE
    AND v.vagas_preenchidas < v.vagas_disponiveis
    AND (
      LOWER(v.funcao_principal) = LOWER(pi.f1)
      OR (pi.f2 IS NOT NULL AND LOWER(v.funcao_principal) = LOWER(pi.f2))
      OR (pi.f3 IS NOT NULL AND LOWER(v.funcao_principal) = LOWER(pi.f3))
      OR (v.funcao_2 IS NOT NULL AND (
        LOWER(v.funcao_2) = LOWER(pi.f1)
        OR (pi.f2 IS NOT NULL AND LOWER(v.funcao_2) = LOWER(pi.f2))
        OR (pi.f3 IS NOT NULL AND LOWER(v.funcao_2) = LOWER(pi.f3))
      ))
      OR (v.funcao_3 IS NOT NULL AND (
        LOWER(v.funcao_3) = LOWER(pi.f1)
        OR (pi.f2 IS NOT NULL AND LOWER(v.funcao_3) = LOWER(pi.f2))
        OR (pi.f3 IS NOT NULL AND LOWER(v.funcao_3) = LOWER(pi.f3))
      ))
    )
    AND (
      (SELECT pp.disponivel FROM prestador_perfil pp WHERE pp.id = prestador_uuid)
      OR EXISTS (
        SELECT 1 FROM disponibilidades d
        WHERE d.prestador_id = prestador_uuid
          AND d.data = v.data
          AND d.disponivel = true
          AND d.horario_inicio <= v.horario_inicio
          AND d.horario_fim >= v.horario_fim
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM matches m WHERE m.vaga_id = v.id AND m.prestador_id = prestador_uuid AND m.status IN ('aceito'::match_status, 'concluido'::match_status)
    )
  ORDER BY 12 DESC, v.valor_oferecido DESC;
END;
$$;
