-- =============================================
-- PARTE 22: Remover limite de 6 funções por prestador
-- Adiciona coluna funcoes_extras (array ilimitado) em
-- prestador_perfil para armazenar funções compradas além
-- dos slots fixos (funcao_principal, funcao_2..funcao_6),
-- SEM remover ou alterar os slots existentes (compatibilidade
-- total com prestadores já cadastrados).
-- =============================================

ALTER TABLE prestador_perfil
  ADD COLUMN IF NOT EXISTS funcoes_extras TEXT[] DEFAULT '{}'::TEXT[];

-- Atualiza buscar_vagas_compativeis para considerar TAMBÉM
-- as funções extras (ilimitadas) no filtro de "Oportunidades para você".
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
    SELECT
      LOWER(pp.funcao_principal) AS f1,
      LOWER(pp.funcao_2) AS f2,
      LOWER(pp.funcao_3) AS f3,
      LOWER(pp.funcao_4) AS f4,
      LOWER(pp.funcao_5) AS f5,
      LOWER(pp.funcao_6) AS f6,
      COALESCE(
        (SELECT ARRAY_AGG(LOWER(x)) FROM UNNEST(pp.funcoes_extras) x),
        ARRAY[]::TEXT[]
      ) AS fextras
    FROM prestador_perfil pp WHERE pp.id = prestador_uuid
  ),
  pf AS (
    SELECT (ARRAY_REMOVE(ARRAY[pi.f1, pi.f2, pi.f3, pi.f4, pi.f5, pi.f6], NULL) || pi.fextras) AS funcoes
    FROM pi
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
      CASE WHEN LOWER(v.funcao_principal) = pi.f1 THEN 40
           WHEN LOWER(v.funcao_principal) = ANY(pf.funcoes) THEN 20
           ELSE 0 END
      +
      CASE WHEN v.funcao_2 IS NOT NULL AND LOWER(v.funcao_2) = ANY(pf.funcoes) THEN 15 ELSE 0 END
      +
      CASE WHEN v.funcao_3 IS NOT NULL AND LOWER(v.funcao_3) = ANY(pf.funcoes) THEN 10 ELSE 0 END
    )::DECIMAL,
    u.nome,
    cp.media_avaliacao
  FROM vagas v
  JOIN contratante_perfil cp ON cp.id = v.contratante_id
  JOIN users u ON u.id = cp.user_id
  CROSS JOIN pi
  CROSS JOIN pf
  WHERE v.ativa = true
    AND v.data >= CURRENT_DATE
    AND v.vagas_preenchidas < v.vagas_disponiveis
    AND (
      LOWER(v.funcao_principal) = ANY(pf.funcoes)
      OR (v.funcao_2 IS NOT NULL AND LOWER(v.funcao_2) = ANY(pf.funcoes))
      OR (v.funcao_3 IS NOT NULL AND LOWER(v.funcao_3) = ANY(pf.funcoes))
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
