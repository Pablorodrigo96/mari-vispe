
-- =========================================================
-- 4.H.1 — Enriquecer enum deal_outcome
-- =========================================================
DO $$ BEGIN
  ALTER TYPE equity_brain.deal_outcome ADD VALUE IF NOT EXISTS 'vigente';
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE equity_brain.deal_outcome ADD VALUE IF NOT EXISTS 'vencido';
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE equity_brain.deal_outcome ADD VALUE IF NOT EXISTS 'vendemos';
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE equity_brain.deal_outcome ADD VALUE IF NOT EXISTS 'em_negociacao';
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE equity_brain.deal_outcome ADD VALUE IF NOT EXISTS 'vendeu_sozinho';
EXCEPTION WHEN others THEN NULL; END $$;

-- =========================================================
-- 4.H.1 — Novo campo engagement_status em buyers
-- =========================================================
DO $$ BEGIN
  CREATE TYPE equity_brain.buyer_engagement_status AS ENUM ('aguardando','em_negociacao','comprou','descartado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE equity_brain.buyers
  ADD COLUMN IF NOT EXISTS engagement_status equity_brain.buyer_engagement_status NOT NULL DEFAULT 'aguardando';

-- =========================================================
-- 4.H.1 — Função para auto-marcar vencidos
-- =========================================================
CREATE OR REPLACE FUNCTION equity_brain.eb_refresh_outcomes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = equity_brain, public
AS $$
BEGIN
  UPDATE equity_brain.mandates
     SET outcome = 'vencido'
   WHERE outcome IN ('vigente','em_andamento','em_negociacao')
     AND data_vencimento IS NOT NULL
     AND data_vencimento < CURRENT_DATE
     AND data_fechamento IS NULL;
END $$;

-- =========================================================
-- 4.H.2 — RPC eb_dashboard_kpis_v2
-- =========================================================
CREATE OR REPLACE FUNCTION public.eb_dashboard_kpis_v2()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = equity_brain, public
AS $$
DECLARE
  result jsonb;
BEGIN
  WITH base AS (
    SELECT m.*, EXTRACT(YEAR FROM data_inicio)::int AS year_started
      FROM equity_brain.mandates m
  ),
  avg_times AS (
    SELECT
      ROUND(AVG(CASE WHEN deal_type = 'sellside' AND outcome IN ('concluido','vendemos')
        THEN EXTRACT(EPOCH FROM (data_fechamento::timestamp - data_inicio::timestamp))/2629800 END)::numeric, 1) AS avg_months_sellside,
      ROUND(AVG(CASE WHEN deal_type = 'buyside' AND outcome IN ('concluido','vendemos')
        THEN EXTRACT(EPOCH FROM (data_fechamento::timestamp - data_inicio::timestamp))/2629800 END)::numeric, 1) AS avg_months_buyside
      FROM base
     WHERE data_fechamento IS NOT NULL AND data_inicio IS NOT NULL
  ),
  yearly_value AS (
    SELECT year_started AS year,
           SUM(CASE WHEN deal_type='sellside' THEN COALESCE(valor_operacao,0) ELSE 0 END) AS sellside_value,
           SUM(CASE WHEN deal_type='buyside'  THEN COALESCE(valor_operacao,0) ELSE 0 END) AS buyside_value,
           SUM(CASE WHEN deal_type='sellside' THEN COALESCE(faturamento_vispe,0) ELSE 0 END) AS sellside_commission,
           SUM(CASE WHEN deal_type='buyside'  THEN COALESCE(faturamento_vispe,0) ELSE 0 END) AS buyside_commission
      FROM base
     WHERE year_started IS NOT NULL
     GROUP BY year_started
     ORDER BY year_started
  ),
  sellside_phases AS (
    SELECT pipeline_stage::text AS stage, COUNT(*) AS qty
      FROM equity_brain.mandates
     WHERE deal_type='sellside'
     GROUP BY pipeline_stage
  ),
  by_locality AS (
    SELECT COALESCE(uf,'—') AS uf,
           COUNT(*) FILTER (WHERE deal_type='sellside') AS sellside,
           COUNT(*) FILTER (WHERE deal_type='buyside')  AS buyside
      FROM equity_brain.mandates
     GROUP BY uf
     ORDER BY (COUNT(*) FILTER (WHERE deal_type='sellside') + COUNT(*) FILTER (WHERE deal_type='buyside')) DESC
     LIMIT 30
  ),
  mandate_status AS (
    SELECT outcome::text AS status, COUNT(*) AS qty
      FROM equity_brain.mandates
     GROUP BY outcome
  ),
  buyer_engagement AS (
    SELECT engagement_status::text AS status, COUNT(*) AS qty
      FROM equity_brain.buyers
     GROUP BY engagement_status
  )
  SELECT jsonb_build_object(
    'avg_months_sellside', (SELECT avg_months_sellside FROM avg_times),
    'avg_months_buyside',  (SELECT avg_months_buyside  FROM avg_times),
    'yearly_value',        (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                              'year', year,
                              'sellside_value', sellside_value,
                              'buyside_value', buyside_value,
                              'sellside_commission', sellside_commission,
                              'buyside_commission', buyside_commission)),'[]'::jsonb) FROM yearly_value),
    'sellside_phases',     (SELECT COALESCE(jsonb_agg(jsonb_build_object('stage',stage,'qty',qty)),'[]'::jsonb) FROM sellside_phases),
    'by_locality',         (SELECT COALESCE(jsonb_agg(jsonb_build_object('uf',uf,'sellside',sellside,'buyside',buyside)),'[]'::jsonb) FROM by_locality),
    'mandate_status',      (SELECT COALESCE(jsonb_agg(jsonb_build_object('status',status,'qty',qty)),'[]'::jsonb) FROM mandate_status),
    'buyer_engagement',    (SELECT COALESCE(jsonb_agg(jsonb_build_object('status',status,'qty',qty)),'[]'::jsonb) FROM buyer_engagement)
  ) INTO result;
  RETURN result;
END $$;

GRANT EXECUTE ON FUNCTION public.eb_dashboard_kpis_v2() TO authenticated;
