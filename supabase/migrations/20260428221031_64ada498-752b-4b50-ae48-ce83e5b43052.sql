
-- 1) Índice para acelerar leituras por (signal_key, cnpj)
CREATE INDEX IF NOT EXISTS idx_company_signals_key_cnpj
  ON equity_brain.company_signals (signal_key, cnpj);

-- 2) Função SQL que materializa os 4 sinais novos de intenção do vendedor
CREATE OR REPLACE FUNCTION equity_brain.compute_seller_intent_signals_sql()
RETURNS TABLE(processed_companies int, signals_upserted int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'equity_brain', 'public'
AS $$
DECLARE
  v_companies int := 0;
  v_signals int := 0;
BEGIN
  -- Sinal 1: socio_idade_max (idade do sócio PF mais velho com participação relevante)
  WITH age_per_company AS (
    SELECT cp.cnpj, MAX(cp.idade_estimada) AS max_age
    FROM equity_brain.company_partners cp
    WHERE cp.tipo = 'PF' AND cp.idade_estimada IS NOT NULL
    GROUP BY cp.cnpj
  )
  INSERT INTO equity_brain.company_signals
    (cnpj, signal_key, signal_value, weight, source, confidence,
     p_true, evidence_strength, evidence_ts, freshness_decay_days, updated_at)
  SELECT
    a.cnpj,
    'socio_idade_max',
    a.max_age::numeric,
    CASE WHEN a.max_age >= 65 THEN 1.0
         WHEN a.max_age >= 55 THEN 0.7
         WHEN a.max_age >= 45 THEN 0.3
         ELSE 0.1 END,
    'receita_federal',
    0.95,
    LEAST(1.0, GREATEST(0.0, (a.max_age - 35)::numeric / 35.0)),
    'strong', NOW(), 3650, NOW()
  FROM age_per_company a
  ON CONFLICT (cnpj, signal_key) DO UPDATE
    SET signal_value = EXCLUDED.signal_value,
        weight = EXCLUDED.weight,
        confidence = EXCLUDED.confidence,
        p_true = EXCLUDED.p_true,
        evidence_ts = EXCLUDED.evidence_ts,
        updated_at = NOW();
  GET DIAGNOSTICS v_signals = ROW_COUNT;

  -- Sinal 2: tempo_atividade_anos
  INSERT INTO equity_brain.company_signals
    (cnpj, signal_key, signal_value, weight, source, confidence,
     p_true, evidence_strength, evidence_ts, freshness_decay_days, updated_at)
  SELECT
    c.cnpj,
    'tempo_atividade_anos',
    EXTRACT(YEAR FROM AGE(c.data_abertura))::numeric,
    1.0,
    'receita_federal',
    1.0,
    LEAST(1.0, EXTRACT(YEAR FROM AGE(c.data_abertura))::numeric / 30.0),
    'strong', NOW(), 365, NOW()
  FROM equity_brain.companies c
  WHERE c.data_abertura IS NOT NULL
  ON CONFLICT (cnpj, signal_key) DO UPDATE
    SET signal_value = EXCLUDED.signal_value,
        p_true = EXCLUDED.p_true,
        evidence_ts = EXCLUDED.evidence_ts,
        updated_at = NOW();

  -- Sinal 3: unipessoal_fundador_55plus (binário)
  WITH age_per_company AS (
    SELECT cnpj, MAX(idade_estimada) AS max_age
    FROM equity_brain.company_partners
    WHERE tipo = 'PF' AND idade_estimada IS NOT NULL
    GROUP BY cnpj
  )
  INSERT INTO equity_brain.company_signals
    (cnpj, signal_key, signal_value, weight, source, confidence,
     p_true, evidence_strength, evidence_ts, freshness_decay_days, updated_at)
  SELECT
    c.cnpj,
    'unipessoal_fundador_55plus',
    CASE WHEN c.qtd_socios = 1 AND COALESCE(a.max_age, 0) >= 55 THEN 1.0 ELSE 0.0 END,
    1.0,
    'receita_federal',
    0.9,
    CASE WHEN c.qtd_socios = 1 AND COALESCE(a.max_age, 0) >= 55 THEN 0.85 ELSE 0.05 END,
    'strong', NOW(), 3650, NOW()
  FROM equity_brain.companies c
  LEFT JOIN age_per_company a ON a.cnpj = c.cnpj
  WHERE c.qtd_socios IS NOT NULL
  ON CONFLICT (cnpj, signal_key) DO UPDATE
    SET signal_value = EXCLUDED.signal_value,
        p_true = EXCLUDED.p_true,
        evidence_ts = EXCLUDED.evidence_ts,
        updated_at = NOW();

  -- Sinal 4: sweet_spot_fadiga (binário 8..20 anos)
  INSERT INTO equity_brain.company_signals
    (cnpj, signal_key, signal_value, weight, source, confidence,
     p_true, evidence_strength, evidence_ts, freshness_decay_days, updated_at)
  SELECT
    c.cnpj,
    'sweet_spot_fadiga',
    CASE WHEN EXTRACT(YEAR FROM AGE(c.data_abertura)) BETWEEN 8 AND 20 THEN 1.0 ELSE 0.0 END,
    1.0,
    'receita_federal',
    1.0,
    CASE WHEN EXTRACT(YEAR FROM AGE(c.data_abertura)) BETWEEN 8 AND 20 THEN 0.7 ELSE 0.2 END,
    'strong', NOW(), 365, NOW()
  FROM equity_brain.companies c
  WHERE c.data_abertura IS NOT NULL
  ON CONFLICT (cnpj, signal_key) DO UPDATE
    SET signal_value = EXCLUDED.signal_value,
        p_true = EXCLUDED.p_true,
        evidence_ts = EXCLUDED.evidence_ts,
        updated_at = NOW();

  -- Sinal agregado: seller_intent_score (0..1) ponderado
  WITH parts AS (
    SELECT cnpj, signal_key, signal_value
    FROM equity_brain.company_signals
    WHERE signal_key IN ('socio_idade_max','tempo_atividade_anos',
                         'unipessoal_fundador_55plus','sweet_spot_fadiga')
  ),
  pivoted AS (
    SELECT
      cnpj,
      MAX(CASE WHEN signal_key='socio_idade_max'             THEN signal_value END) AS idade,
      MAX(CASE WHEN signal_key='tempo_atividade_anos'        THEN signal_value END) AS tempo,
      MAX(CASE WHEN signal_key='unipessoal_fundador_55plus'  THEN signal_value END) AS unip,
      MAX(CASE WHEN signal_key='sweet_spot_fadiga'           THEN signal_value END) AS sweet
    FROM parts GROUP BY cnpj
  ),
  scored AS (
    SELECT
      cnpj,
      LEAST(1.0,
        0.35 * CASE
                 WHEN idade IS NULL THEN 0
                 WHEN idade >= 65 THEN 1.0
                 WHEN idade >= 55 THEN (idade - 55) / 10.0 * 0.7 + 0.3
                 ELSE 0
               END
      + 0.25 * CASE
                 WHEN tempo IS NULL THEN 0
                 WHEN tempo BETWEEN 8 AND 20 THEN 1.0
                 WHEN tempo BETWEEN 5 AND 7 THEN 0.5
                 WHEN tempo > 20 THEN 0.6
                 ELSE 0
               END
      + 0.25 * COALESCE(unip, 0)
      + 0.15 * COALESCE(sweet, 0)
      ) AS score
    FROM pivoted
  )
  INSERT INTO equity_brain.company_signals
    (cnpj, signal_key, signal_value, weight, source, confidence,
     p_true, evidence_strength, evidence_ts, freshness_decay_days, updated_at)
  SELECT cnpj, 'seller_intent_score', score, 1.0, 'derived',
         0.85, score, 'medium', NOW(), 180, NOW()
  FROM scored
  ON CONFLICT (cnpj, signal_key) DO UPDATE
    SET signal_value = EXCLUDED.signal_value,
        p_true = EXCLUDED.p_true,
        evidence_ts = EXCLUDED.evidence_ts,
        updated_at = NOW();

  SELECT COUNT(*) INTO v_companies FROM equity_brain.companies;
  RETURN QUERY SELECT v_companies, v_signals;
END;
$$;

-- Garante UNIQUE para os ON CONFLICT acima
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='equity_brain' AND indexname='ux_company_signals_cnpj_key'
  ) THEN
    CREATE UNIQUE INDEX ux_company_signals_cnpj_key
      ON equity_brain.company_signals (cnpj, signal_key);
  END IF;
END $$;

-- 3) Trigger automático: deal_events (INSERT) → enfileira aprendizado
-- Usamos pg_notify (sem dependência de pg_net) + linha em equity_brain.events
-- para que o drain/cron exec ja existente possa processar. Aqui apenas
-- registramos um event_type='theta_update_required' que a função update-buyer-revealed-thetas
-- pode consumir via cron normal.
CREATE OR REPLACE FUNCTION equity_brain.enqueue_theta_update_on_deal_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'equity_brain', 'public'
AS $$
BEGIN
  IF NEW.buyer_id IS NOT NULL THEN
    INSERT INTO equity_brain.events
      (event_type, entity_type, entity_id, payload, created_at)
    VALUES
      ('theta_update_required', 'buyer', NEW.buyer_id::text,
       jsonb_build_object('deal_event_id', NEW.id, 'event_type', NEW.event_type), NOW());
    PERFORM pg_notify('eb_theta_update', NEW.buyer_id::text);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_deal_events_enqueue_theta ON equity_brain.deal_events;
CREATE TRIGGER trg_deal_events_enqueue_theta
AFTER INSERT ON equity_brain.deal_events
FOR EACH ROW EXECUTE FUNCTION equity_brain.enqueue_theta_update_on_deal_event();
