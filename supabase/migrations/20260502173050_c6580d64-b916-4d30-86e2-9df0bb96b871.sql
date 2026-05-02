CREATE OR REPLACE FUNCTION equity_brain.calculate_sv(p_company_cnpj varchar)
RETURNS TABLE (
  score numeric,
  nivel int,
  breakdown jsonb,
  data_completeness numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = equity_brain, public
AS $$
DECLARE
  c equity_brain.companies%ROWTYPE;

  s_estabilidade_ebitda numeric := 50;
  s_concentracao numeric := 50;
  s_recorrencia numeric := 50;
  s_dependencia_fundador numeric := 50;
  s_passivos numeric := 50;
  s_documentacao numeric := 50;
  s_governanca numeric := 50;
  s_sistemas numeric := 50;
  s_societario numeric := 50;

  w_estabilidade numeric := 0.15;
  w_concentracao numeric := 0.12;
  w_recorrencia numeric := 0.12;
  w_dependencia numeric := 0.15;
  w_passivos numeric := 0.12;
  w_documentacao numeric := 0.10;
  w_governanca numeric := 0.08;
  w_sistemas numeric := 0.08;
  w_societario numeric := 0.08;

  v_score numeric;
  v_nivel int;
  v_completeness numeric := 0;
  v_breakdown jsonb;
  v_filled int := 0;
  v_total int := 9;
BEGIN
  SELECT * INTO c FROM equity_brain.companies WHERE cnpj = p_company_cnpj;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Company not found: %', p_company_cnpj;
  END IF;

  -- 1. Estabilidade EBITDA (proxy: margem EBITDA)
  IF c.ebitda_estimado IS NOT NULL AND c.faturamento_estimado IS NOT NULL
     AND c.faturamento_estimado > 0 THEN
    v_filled := v_filled + 1;
    IF c.ebitda_estimado > 0 THEN
      s_estabilidade_ebitda := LEAST(100, GREATEST(0,
        50 + (c.ebitda_estimado / c.faturamento_estimado) * 130
      ));
    ELSE
      s_estabilidade_ebitda := 20;
    END IF;
  END IF;

  -- 4. Dependência do fundador (proxy: qtd_socios)
  IF c.qtd_socios IS NOT NULL AND c.qtd_socios > 0 THEN
    v_filled := v_filled + 1;
    s_dependencia_fundador := CASE
      WHEN c.qtd_socios = 1 THEN 30
      WHEN c.qtd_socios = 2 THEN 60
      WHEN c.qtd_socios >= 3 THEN 80
      ELSE 50
    END;
  END IF;

  -- 5. Passivos (proxy: situacao_cadastral)
  IF c.situacao_cadastral IS NOT NULL THEN
    v_filled := v_filled + 1;
    s_passivos := CASE
      WHEN c.situacao_cadastral = 'ATIVA' THEN 75
      WHEN c.situacao_cadastral = 'SUSPENSA' THEN 25
      WHEN c.situacao_cadastral = 'BAIXADA' THEN 5
      ELSE 50
    END;
  END IF;

  -- 6. Documentação (proxy: data_situacao_cadastral)
  IF c.data_situacao_cadastral IS NOT NULL THEN
    v_filled := v_filled + 1;
    IF c.situacao_cadastral = 'ATIVA' AND c.data_situacao_cadastral < (now() - interval '2 years')::date THEN
      s_documentacao := 80;
    ELSIF c.situacao_cadastral = 'ATIVA' THEN
      s_documentacao := 65;
    ELSE
      s_documentacao := 30;
    END IF;
  END IF;

  -- 7. Governança (proxy: capital_social)
  IF c.capital_social IS NOT NULL THEN
    v_filled := v_filled + 1;
    s_governanca := CASE
      WHEN c.capital_social >= 1000000 THEN 70
      WHEN c.capital_social >= 100000 THEN 55
      WHEN c.capital_social >= 10000 THEN 40
      ELSE 30
    END;
  END IF;

  -- 8. Sistemas (proxy: porte)
  IF c.porte IS NOT NULL THEN
    v_filled := v_filled + 1;
    s_sistemas := CASE
      WHEN c.porte = 'GRANDE' THEN 80
      WHEN c.porte = 'MEDIO' THEN 65
      WHEN c.porte = 'EPP' THEN 50
      WHEN c.porte = 'ME' THEN 35
      ELSE 50
    END;
  END IF;

  -- 9. Societário (proxy: natureza_juridica)
  IF c.natureza_juridica IS NOT NULL THEN
    v_filled := v_filled + 1;
    s_societario := CASE
      WHEN c.natureza_juridica IN ('2054', '2240') THEN 85
      WHEN c.natureza_juridica IN ('2062', '2046') THEN 70
      ELSE 50
    END;
  END IF;

  v_score := ROUND(
    s_estabilidade_ebitda * w_estabilidade +
    s_concentracao * w_concentracao +
    s_recorrencia * w_recorrencia +
    s_dependencia_fundador * w_dependencia +
    s_passivos * w_passivos +
    s_documentacao * w_documentacao +
    s_governanca * w_governanca +
    s_sistemas * w_sistemas +
    s_societario * w_societario,
  2);

  v_nivel := CASE
    WHEN v_score < 31 THEN 1
    WHEN v_score < 51 THEN 2
    WHEN v_score < 71 THEN 3
    WHEN v_score < 86 THEN 4
    ELSE 5
  END;

  v_completeness := ROUND(v_filled::numeric / v_total, 2);

  v_breakdown := jsonb_build_object(
    'subscores', jsonb_build_object(
      'estabilidade_ebitda', s_estabilidade_ebitda,
      'concentracao_cliente', s_concentracao,
      'recorrencia', s_recorrencia,
      'dependencia_fundador', s_dependencia_fundador,
      'passivos', s_passivos,
      'documentacao', s_documentacao,
      'governanca', s_governanca,
      'sistemas', s_sistemas,
      'societario', s_societario
    ),
    'pesos', jsonb_build_object(
      'estabilidade_ebitda', w_estabilidade,
      'dependencia_fundador', w_dependencia,
      'passivos', w_passivos,
      'documentacao', w_documentacao,
      'governanca', w_governanca,
      'sistemas', w_sistemas,
      'societario', w_societario,
      'concentracao_cliente', w_concentracao,
      'recorrencia', w_recorrencia
    ),
    'fields_filled', v_filled,
    'fields_total', v_total
  );

  RETURN QUERY SELECT v_score, v_nivel, v_breakdown, v_completeness;
END;
$$;

GRANT EXECUTE ON FUNCTION equity_brain.calculate_sv(varchar) TO authenticated, service_role;
