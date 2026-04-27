DROP FUNCTION IF EXISTS equity_brain.bootstrap_company_from_listing(uuid);
DROP FUNCTION IF EXISTS equity_brain.bootstrap_all_listings();

CREATE OR REPLACE FUNCTION equity_brain.bootstrap_company_from_listing(p_listing_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = equity_brain, public
AS $$
DECLARE
  v_listing RECORD;
  v_cnpj    varchar;
  v_age     numeric;
  v_rev_score      numeric;
  v_margin_score   numeric;
  v_vdr_score      numeric;
  v_geo_bonus      numeric;
  v_size_bonus     numeric;
  v_age_bonus      numeric;
  v_intent_bonus   numeric := 50;
  v_master_bonus   numeric;
  v_ma     numeric;
  v_vispe  numeric;
  v_suc    numeric;
  v_buyers_count integer;
  v_top_buyers   jsonb;
  v_breakdown    jsonb;
BEGIN
  SELECT * INTO v_listing FROM public.listings WHERE id = p_listing_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  v_cnpj := equity_brain.upsert_company_from_listing(p_listing_id);
  IF v_cnpj IS NULL THEN RETURN NULL; END IF;

  v_age := COALESCE(EXTRACT(YEAR FROM age(now(), make_date(COALESCE(v_listing.foundation_year, 2015), 1, 1)))::numeric, 0);

  v_rev_score    := equity_brain.revenue_tier_score(v_listing.annual_revenue);
  v_margin_score := equity_brain.margin_score(v_listing.annual_revenue, v_listing.annual_profit);
  v_vdr_score    := COALESCE(v_listing.vdr_readiness, 0)::numeric;
  v_geo_bonus    := CASE WHEN v_listing.state IN ('SP','RJ','MG','PR','RS','SC') THEN 100 ELSE 50 END;
  v_size_bonus   := CASE WHEN v_listing.annual_revenue >= 5000000 AND v_listing.annual_revenue <= 50000000 THEN 100 ELSE 60 END;
  v_age_bonus    := CASE
                      WHEN v_age BETWEEN 10 AND 25 THEN 100
                      WHEN v_age BETWEEN 5  AND 30  THEN 70
                      WHEN v_age >= 3 THEN 50
                      ELSE 30
                    END;
  v_master_bonus := CASE WHEN v_listing.plan = 'master' THEN 100 ELSE 50 END;

  DELETE FROM equity_brain.company_signals WHERE cnpj = v_cnpj AND source = 'listing_bootstrap';

  INSERT INTO equity_brain.company_signals (cnpj, signal_key, signal_value, signal_text, weight, source, confidence)
  VALUES
    (v_cnpj, 'intencao_venda_explicita', v_intent_bonus, 'Anúncio público no marketplace PME.B3', 50, 'listing_bootstrap', 1.0),
    (v_cnpj, 'porte_atrativo_ma',        v_size_bonus,   'Receita anual: ' || COALESCE(v_listing.annual_revenue::text,'n/d'), 15, 'listing_bootstrap', 0.95),
    (v_cnpj, 'idade_empresa_10_a_15',    v_age_bonus,    'Empresa com ' || v_age::int || ' anos', 12, 'listing_bootstrap', 0.9),
    (v_cnpj, 'geografia_premium',        v_geo_bonus,    COALESCE(v_listing.state,'?') || ' / ' || COALESCE(v_listing.city,'?'), 10, 'listing_bootstrap', 0.95),
    (v_cnpj, 'empresa_ativa_situacao_regular', 100,      'Listada e ativa no marketplace', 5, 'listing_bootstrap', 1.0);

  IF v_vdr_score > 0 THEN
    INSERT INTO equity_brain.company_signals (cnpj, signal_key, signal_value, signal_text, weight, source, confidence)
    VALUES (v_cnpj, 'oportunidade_cfo_vispe', v_vdr_score, 'VDR readiness: ' || v_vdr_score::int || '%', 25, 'listing_bootstrap', 0.9);
  END IF;

  IF v_listing.plan = 'master' THEN
    INSERT INTO equity_brain.company_signals (cnpj, signal_key, signal_value, signal_text, weight, source, confidence)
    VALUES (v_cnpj, 'capital_social_alto', v_master_bonus, 'Anunciante Master (alta intenção)', 5, 'listing_bootstrap', 0.85);
  END IF;

  v_vispe := ROUND(LEAST(100, GREATEST(0,
    0.40 * v_rev_score + 0.30 * v_margin_score + 0.20 * v_vdr_score + 0.10 * v_master_bonus
  )), 1);

  v_suc := ROUND(LEAST(100, GREATEST(0,
    0.60 * v_age_bonus + 0.40 * v_size_bonus
  )), 1);

  v_ma := ROUND(LEAST(100, GREATEST(0,
    0.30 * v_intent_bonus * 2
    + 0.25 * v_vispe
    + 0.15 * v_suc
    + 0.15 * v_size_bonus
    + 0.10 * v_geo_bonus
    + 0.05 * v_master_bonus
  )), 1);

  v_breakdown := jsonb_build_object(
    'rev_score', v_rev_score, 'margin_score', v_margin_score, 'vdr_score', v_vdr_score,
    'geo_bonus', v_geo_bonus, 'size_bonus', v_size_bonus, 'age_bonus', v_age_bonus,
    'intent_bonus', v_intent_bonus, 'master_bonus', v_master_bonus, 'source', 'listing_bootstrap'
  );

  UPDATE equity_brain.company_scores SET is_current = false WHERE cnpj = v_cnpj AND is_current = true;

  INSERT INTO equity_brain.company_scores
    (cnpj, ma_score, vispe_score, sucessao_score, buyer_fit_score, ma_breakdown, vispe_breakdown, sucessao_breakdown, formula_version, is_current, score_engine_version)
  VALUES
    (v_cnpj, v_ma, v_vispe, v_suc, NULL, v_breakdown, v_breakdown, v_breakdown, 'listing_v1', true, 'listing_bootstrap_v1');

  SELECT COUNT(*), COALESCE(jsonb_agg(jsonb_build_object('id', bp.id, 'name', bp.buyer_name, 'company', bp.company_name)) FILTER (WHERE bp.id IS NOT NULL), '[]'::jsonb)
  INTO v_buyers_count, v_top_buyers
  FROM (
    SELECT id, buyer_name, company_name FROM public.buyer_profiles
    WHERE status = 'active'
      AND v_listing.category = ANY(categories)
      AND (state IS NULL OR state = v_listing.state OR v_listing.state IS NULL)
      AND (max_budget IS NULL OR v_listing.asking_price IS NULL OR max_budget >= v_listing.asking_price)
    LIMIT 5
  ) bp;

  UPDATE equity_brain.company_scores
  SET buyer_fit_score = LEAST(100, COALESCE(v_buyers_count, 0) * 25)
  WHERE cnpj = v_cnpj AND is_current = true;

  INSERT INTO equity_brain.opportunities_ready
    (cnpj, razao_social, nome_fantasia, uf, municipio, setor_ma,
     ma_score, vispe_score, sucessao_score,
     best_thesis_key, best_thesis_name,
     top_buyers, buyers_count,
     default_pitch,
     bubble_size, bubble_color,
     status, refreshed_at, source_match_count)
  SELECT
    c.cnpj, c.razao_social, c.nome_fantasia, c.uf, c.municipio, c.setor_ma,
    v_ma, v_vispe, v_suc,
    'listing_marketplace', 'Anúncio ativo no marketplace',
    v_top_buyers, COALESCE(v_buyers_count, 0),
    'Empresa anunciada no marketplace PME.B3 — receita anual ' || COALESCE(v_listing.annual_revenue::text, 'n/d'),
    GREATEST(8, LEAST(40, COALESCE(v_listing.annual_revenue, 0)::numeric / 500000)),
    CASE WHEN v_ma >= 80 THEN '#10b981' WHEN v_ma >= 60 THEN '#f59e0b' ELSE '#71717a' END,
    'novo', now(), COALESCE(v_buyers_count, 0)
  FROM equity_brain.companies c
  WHERE c.cnpj = v_cnpj
  ON CONFLICT (cnpj) DO UPDATE SET
    razao_social = EXCLUDED.razao_social,
    nome_fantasia = EXCLUDED.nome_fantasia,
    uf = EXCLUDED.uf, municipio = EXCLUDED.municipio, setor_ma = EXCLUDED.setor_ma,
    ma_score = EXCLUDED.ma_score, vispe_score = EXCLUDED.vispe_score, sucessao_score = EXCLUDED.sucessao_score,
    top_buyers = EXCLUDED.top_buyers, buyers_count = EXCLUDED.buyers_count,
    default_pitch = EXCLUDED.default_pitch,
    bubble_size = EXCLUDED.bubble_size, bubble_color = EXCLUDED.bubble_color,
    refreshed_at = now(), source_match_count = EXCLUDED.source_match_count;

  RETURN v_cnpj::text;
END;
$$;

CREATE OR REPLACE FUNCTION equity_brain.bootstrap_all_listings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = equity_brain, public
AS $$
DECLARE l RECORD; cnt integer := 0;
BEGIN
  FOR l IN SELECT id FROM public.listings LOOP
    PERFORM equity_brain.bootstrap_company_from_listing(l.id);
    cnt := cnt + 1;
  END LOOP;
  RETURN cnt;
END;
$$;

GRANT EXECUTE ON FUNCTION equity_brain.bootstrap_company_from_listing(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION equity_brain.bootstrap_all_listings() TO authenticated;