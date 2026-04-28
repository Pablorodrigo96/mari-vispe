
-- ============================================================================
-- 1) RECONECTAR TRIGGER DE LISTINGS -> equity_brain.companies
-- ============================================================================
DROP TRIGGER IF EXISTS trg_sync_listing_bootstrap_eb ON public.listings;

CREATE TRIGGER trg_sync_listing_bootstrap_eb
AFTER INSERT OR UPDATE ON public.listings
FOR EACH ROW
EXECUTE FUNCTION public.sync_listing_bootstrap_eb();


-- ============================================================================
-- 2) BUYER_PROFILES -> equity_brain.buyers
-- ============================================================================
CREATE OR REPLACE FUNCTION equity_brain.upsert_buyer_from_profile(p_profile_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'equity_brain'
AS $$
DECLARE
  bp RECORD;
  v_setores text[];
  v_status varchar;
BEGIN
  SELECT * INTO bp FROM public.buyer_profiles WHERE id = p_profile_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  -- Map categories -> setor_ma using existing helper
  SELECT COALESCE(array_agg(DISTINCT equity_brain.category_to_setor(c)) FILTER (WHERE equity_brain.category_to_setor(c) IS NOT NULL), '{}')
  INTO v_setores
  FROM unnest(COALESCE(bp.categories, '{}'::text[])) AS c;

  v_status := CASE WHEN bp.status = 'active' THEN 'ativo' ELSE 'pausado' END;

  INSERT INTO equity_brain.buyers (
    id, nome, tipo, ticket_min, ticket_max,
    setores_interesse, ufs_interesse, municipios_interesse,
    status, observacoes, source, raw_data, responsavel_id
  ) VALUES (
    bp.id,
    COALESCE(bp.buyer_name, bp.company_name, 'Comprador'),
    'marketplace',
    bp.min_budget,
    bp.max_budget,
    COALESCE(v_setores, '{}'),
    CASE WHEN bp.state IS NOT NULL THEN ARRAY[bp.state] ELSE '{}' END,
    CASE WHEN bp.city  IS NOT NULL THEN ARRAY[bp.city]  ELSE '{}' END,
    v_status,
    bp.description,
    'marketplace_buyer_profile',
    jsonb_build_object(
      'buyer_profile_id', bp.id,
      'company_name', bp.company_name,
      'categories', bp.categories
    ),
    bp.user_id
  )
  ON CONFLICT (id) DO UPDATE SET
    nome                  = EXCLUDED.nome,
    ticket_min            = EXCLUDED.ticket_min,
    ticket_max            = EXCLUDED.ticket_max,
    setores_interesse     = EXCLUDED.setores_interesse,
    ufs_interesse         = EXCLUDED.ufs_interesse,
    municipios_interesse  = EXCLUDED.municipios_interesse,
    status                = EXCLUDED.status,
    observacoes           = EXCLUDED.observacoes,
    raw_data              = EXCLUDED.raw_data,
    responsavel_id        = EXCLUDED.responsavel_id,
    updated_at            = now();

  RETURN bp.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_buyer_profile_to_eb()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public','equity_brain'
AS $$
BEGIN
  PERFORM equity_brain.upsert_buyer_from_profile(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_buyer_profile_to_eb ON public.buyer_profiles;
CREATE TRIGGER trg_sync_buyer_profile_to_eb
AFTER INSERT OR UPDATE ON public.buyer_profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_buyer_profile_to_eb();


-- ============================================================================
-- 3) CAPITAL_REQUESTS -> equity_brain (signals de intenção)
-- ============================================================================
CREATE OR REPLACE FUNCTION equity_brain.ingest_capital_request(p_request_id uuid)
RETURNS varchar
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public','equity_brain'
AS $$
DECLARE
  r RECORD;
  v_cnpj varchar;
  v_setor varchar;
  v_geo_bonus numeric;
BEGIN
  SELECT * INTO r FROM public.capital_requests WHERE id = p_request_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  -- Synthetic CNPJ for capital_request rows (não-listing)
  v_cnpj := 'CR' || regexp_replace(r.id::text, '-', '', 'g');
  v_cnpj := substring(v_cnpj, 1, 14);

  v_setor := equity_brain.category_to_setor(COALESCE(r.sector, ''));

  INSERT INTO equity_brain.companies (
    cnpj, razao_social, nome_fantasia, setor_ma, porte,
    has_listing, source, raw_data, last_enriched_at
  ) VALUES (
    v_cnpj,
    COALESCE(r.company_name, 'Empresa em captação'),
    r.company_name,
    v_setor,
    'PME',
    false,
    'capital_request',
    jsonb_build_object(
      'capital_request_id', r.id,
      'capital_type', r.capital_type,
      'requested_amount', r.requested_amount,
      'lead_score', r.lead_score,
      'objective', r.objective
    ),
    now()
  )
  ON CONFLICT (cnpj) DO UPDATE SET
    razao_social   = EXCLUDED.razao_social,
    nome_fantasia  = EXCLUDED.nome_fantasia,
    setor_ma       = COALESCE(equity_brain.companies.setor_ma, EXCLUDED.setor_ma),
    raw_data       = EXCLUDED.raw_data,
    updated_at     = now(),
    last_enriched_at = now();

  -- Replace signals from this source for idempotency
  DELETE FROM equity_brain.company_signals WHERE cnpj = v_cnpj AND source = 'capital_request';

  INSERT INTO equity_brain.company_signals (cnpj, signal_key, signal_value, signal_text, weight, source, confidence)
  VALUES
    (v_cnpj, 'intencao_captacao', GREATEST(50, COALESCE(r.lead_score, 50))::numeric,
     'Pedido de ' || COALESCE(r.capital_type,'capital') || ' R$ ' || COALESCE(r.requested_amount::text,'?'),
     30, 'capital_request', 0.9),
    (v_cnpj, 'lead_score_capital', COALESCE(r.lead_score, 0)::numeric,
     'Lead score do pedido de captação', 10, 'capital_request', 1.0);

  RETURN v_cnpj;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_capital_request_to_eb()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public','equity_brain'
AS $$
BEGIN
  PERFORM equity_brain.ingest_capital_request(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_capital_request_to_eb ON public.capital_requests;
CREATE TRIGGER trg_sync_capital_request_to_eb
AFTER INSERT OR UPDATE ON public.capital_requests
FOR EACH ROW
EXECUTE FUNCTION public.sync_capital_request_to_eb();


-- ============================================================================
-- 4) VALUATION_HISTORY -> equity_brain (signal de preparação)
-- ============================================================================
CREATE OR REPLACE FUNCTION equity_brain.ingest_valuation(p_valuation_id uuid)
RETURNS varchar
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public','equity_brain'
AS $$
DECLARE
  v RECORD;
  v_cnpj varchar;
  v_company_name text;
  v_value numeric;
  v_setor varchar;
BEGIN
  SELECT * INTO v FROM public.valuation_history WHERE id = p_valuation_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  -- Try to extract CNPJ from inputs; otherwise synthesize from valuation id
  v_cnpj := NULLIF(regexp_replace(COALESCE(v.inputs->>'cnpj',''), '\D', '', 'g'), '');
  IF v_cnpj IS NULL OR length(v_cnpj) < 8 THEN
    v_cnpj := 'VL' || regexp_replace(v.id::text, '-', '', 'g');
    v_cnpj := substring(v_cnpj, 1, 14);
  ELSE
    v_cnpj := substring(v_cnpj, 1, 14);
  END IF;

  v_company_name := COALESCE(v.inputs->>'company_name', v.inputs->>'companyName', v.inputs->>'name', 'Empresa avaliada');
  v_value        := COALESCE((v.result->>'value')::numeric, (v.result->>'estimated_value')::numeric, (v.result->>'totalValue')::numeric, 0);
  v_setor        := equity_brain.category_to_setor(COALESCE(v.segment, v.company_type, ''));

  INSERT INTO equity_brain.companies (
    cnpj, razao_social, nome_fantasia, setor_ma, porte,
    has_listing, source, raw_data, last_enriched_at
  ) VALUES (
    v_cnpj, v_company_name, v_company_name, v_setor, 'PME', false,
    'valuation_history',
    jsonb_build_object(
      'valuation_id', v.id,
      'valuation_type', v.valuation_type,
      'segment', v.segment
    ),
    now()
  )
  ON CONFLICT (cnpj) DO UPDATE SET
    razao_social   = COALESCE(equity_brain.companies.razao_social, EXCLUDED.razao_social),
    setor_ma       = COALESCE(equity_brain.companies.setor_ma, EXCLUDED.setor_ma),
    raw_data       = equity_brain.companies.raw_data || EXCLUDED.raw_data,
    updated_at     = now(),
    last_enriched_at = now();

  INSERT INTO equity_brain.company_signals (cnpj, signal_key, signal_value, signal_text, weight, source, confidence)
  VALUES
    (v_cnpj, 'valuation_realizado', GREATEST(30, LEAST(100, COALESCE(v_value/1000000, 30)))::numeric,
     'Valuation ' || v.valuation_type || ' executado: R$ ' || COALESCE(v_value::text,'?'),
     8, 'valuation_history', 0.85);

  RETURN v_cnpj;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_valuation_to_eb()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public','equity_brain'
AS $$
BEGIN
  -- Only ingest when we have a real user (skip anonymous valuations)
  IF NEW.user_id IS NOT NULL THEN
    PERFORM equity_brain.ingest_valuation(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_valuation_to_eb ON public.valuation_history;
CREATE TRIGGER trg_sync_valuation_to_eb
AFTER INSERT ON public.valuation_history
FOR EACH ROW
EXECUTE FUNCTION public.sync_valuation_to_eb();


-- ============================================================================
-- 5) BACKFILL: garantir que tudo que já existe está no Brain
-- ============================================================================

-- 5a) listings
DO $$
DECLARE l RECORD;
BEGIN
  FOR l IN SELECT id FROM public.listings LOOP
    PERFORM equity_brain.bootstrap_company_from_listing(l.id);
  END LOOP;
END$$;

-- 5b) buyer_profiles
DO $$
DECLARE bp RECORD;
BEGIN
  FOR bp IN SELECT id FROM public.buyer_profiles LOOP
    PERFORM equity_brain.upsert_buyer_from_profile(bp.id);
  END LOOP;
END$$;

-- 5c) capital_requests
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.capital_requests LOOP
    PERFORM equity_brain.ingest_capital_request(r.id);
  END LOOP;
END$$;

-- 5d) valuation_history (apenas com user_id válido)
DO $$
DECLARE v RECORD;
BEGIN
  FOR v IN SELECT id FROM public.valuation_history WHERE user_id IS NOT NULL LOOP
    PERFORM equity_brain.ingest_valuation(v.id);
  END LOOP;
END$$;
