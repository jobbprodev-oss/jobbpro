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
    -- Todas as funções ativas do prestador (principal + extras compradas), normalizadas
    SELECT ARRAY_REMOVE(ARRAY[
      LOWER(pp.funcao_principal), LOWER(pp.funcao_2), LOWER(pp.funcao_3),
      LOWER(pp.funcao_4), LOWER(pp.funcao_5), LOWER(pp.funcao_6)
    ], NULL) AS funcoes
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
      CASE WHEN LOWER(v.funcao_principal) = ANY(pi.funcoes) THEN 40 ELSE 0 END
      +
      CASE WHEN v.funcao_2 IS NOT NULL AND LOWER(v.funcao_2) = ANY(pi.funcoes) THEN 15 ELSE 0 END
      +
      CASE WHEN v.funcao_3 IS NOT NULL AND LOWER(v.funcao_3) = ANY(pi.funcoes) THEN 10 ELSE 0 END
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
      LOWER(v.funcao_principal) = ANY(pi.funcoes)
      OR (v.funcao_2 IS NOT NULL AND LOWER(v.funcao_2) = ANY(pi.funcoes))
      OR (v.funcao_3 IS NOT NULL AND LOWER(v.funcao_3) = ANY(pi.funcoes))
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
