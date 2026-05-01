CREATE SCHEMA IF NOT EXISTS mari_ops;

CREATE TABLE IF NOT EXISTS mari_ops.health_check (
  id BIGSERIAL PRIMARY KEY,
  function_name TEXT NOT NULL,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL CHECK (status IN ('ok', 'error', 'warning', 'red')),
  duration_ms INTEGER,
  payload_summary JSONB,
  error_text TEXT,
  request_id TEXT,
  source TEXT DEFAULT 'edge_function'
);

CREATE INDEX IF NOT EXISTS idx_health_check_fn_ts ON mari_ops.health_check (function_name, ts DESC);
CREATE INDEX IF NOT EXISTS idx_health_check_status ON mari_ops.health_check (status, ts DESC) WHERE status IN ('error', 'red');
CREATE INDEX IF NOT EXISTS idx_health_check_ts ON mari_ops.health_check (ts DESC);

CREATE TABLE IF NOT EXISTS mari_ops.smoke_tests (
  id BIGSERIAL PRIMARY KEY,
  test_name TEXT NOT NULL,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL CHECK (status IN ('pass', 'fail', 'skip')),
  duration_ms INTEGER,
  expected JSONB,
  actual JSONB,
  message TEXT
);

CREATE INDEX IF NOT EXISTS idx_smoke_tests_name_ts ON mari_ops.smoke_tests (test_name, ts DESC);

CREATE TABLE IF NOT EXISTS mari_ops.model_metrics (
  id BIGSERIAL PRIMARY KEY,
  model_name TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  sample_size INTEGER,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_model_metrics_model ON mari_ops.model_metrics (model_name, computed_at DESC);

ALTER TABLE mari_ops.health_check ENABLE ROW LEVEL SECURITY;
ALTER TABLE mari_ops.smoke_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE mari_ops.model_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view health_check"
  ON mari_ops.health_check FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins view smoke_tests"
  ON mari_ops.smoke_tests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins view model_metrics"
  ON mari_ops.model_metrics FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE VIEW mari_ops.health_summary_24h
WITH (security_invoker = on) AS
SELECT
  function_name,
  COUNT(*)::int AS total_runs,
  COUNT(*) FILTER (WHERE status = 'ok')::int AS ok_runs,
  COUNT(*) FILTER (WHERE status IN ('error', 'red'))::int AS error_runs,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'ok') / NULLIF(COUNT(*), 0), 2) AS success_rate_pct,
  ROUND(percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_ms))::int AS p50_ms,
  ROUND(percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms))::int AS p95_ms,
  MAX(ts) AS last_run_at,
  (ARRAY_AGG(error_text ORDER BY ts DESC) FILTER (WHERE error_text IS NOT NULL))[1] AS last_error,
  CASE
    WHEN COUNT(*) FILTER (WHERE status IN ('error', 'red'))::numeric / NULLIF(COUNT(*), 0) > 0.05 THEN 'red'
    WHEN COUNT(*) FILTER (WHERE status IN ('error', 'red'))::numeric / NULLIF(COUNT(*), 0) > 0.01 THEN 'yellow'
    ELSE 'green'
  END AS status_color
FROM mari_ops.health_check
WHERE ts > now() - INTERVAL '24 hours'
GROUP BY function_name;

GRANT USAGE ON SCHEMA mari_ops TO authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA mari_ops TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA mari_ops TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA mari_ops TO service_role;

-- ============================================================
-- FASE 2.0 — CRM ownership
-- ============================================================

ALTER TABLE equity_brain.mandates
  ADD COLUMN IF NOT EXISTS co_advisor_ids UUID[] DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS origin_advisor_id UUID;

CREATE INDEX IF NOT EXISTS idx_mandates_co_advisors ON equity_brain.mandates USING GIN (co_advisor_ids);
CREATE INDEX IF NOT EXISTS idx_mandates_origin_advisor ON equity_brain.mandates (origin_advisor_id);

CREATE OR REPLACE FUNCTION equity_brain.suggest_responsavel(p_mandate_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, equity_brain
AS $$
DECLARE
  v_suggested UUID;
BEGIN
  SELECT ur.user_id
  INTO v_suggested
  FROM public.user_roles ur
  WHERE ur.role IN ('advisor'::app_role, 'admin'::app_role)
  ORDER BY (
    SELECT COUNT(*)
    FROM equity_brain.mandates m
    WHERE m.responsavel_id = ur.user_id
      AND m.outcome IN ('em_andamento', 'vigente')
  ) ASC, ur.user_id
  LIMIT 1;

  RETURN v_suggested;
END;
$$;

CREATE OR REPLACE VIEW public.eb_my_companies_v2
WITH (security_invoker = on) AS
SELECT
  m.id AS mandate_id,
  m.company_cnpj AS cnpj,
  COALESCE(c.razao_social, c.nome_fantasia, m.company_cnpj) AS company_name,
  c.codename,
  m.pipeline_stage,
  m.outcome,
  m.valor_pedido,
  m.valor_operacao,
  m.responsavel_id,
  m.co_advisor_ids,
  m.origin_advisor_id,
  m.created_by,
  m.deal_origin,
  m.deal_kind,
  m.deal_confidence,
  m.needs_enrichment,
  m.stage_changed_at,
  m.created_at,
  m.updated_at,
  CASE
    WHEN m.responsavel_id = auth.uid() THEN 'responsavel'
    WHEN auth.uid() = ANY (COALESCE(m.co_advisor_ids, '{}'::uuid[])) THEN 'co_advisor'
    WHEN m.origin_advisor_id = auth.uid() THEN 'originador'
    WHEN m.created_by = auth.uid() THEN 'criador'
    ELSE NULL
  END AS my_role
FROM equity_brain.mandates m
LEFT JOIN equity_brain.companies c ON c.cnpj = m.company_cnpj
WHERE
  m.responsavel_id = auth.uid()
  OR auth.uid() = ANY (COALESCE(m.co_advisor_ids, '{}'::uuid[]))
  OR m.origin_advisor_id = auth.uid()
  OR m.created_by = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role);

GRANT SELECT ON public.eb_my_companies_v2 TO authenticated;

CREATE OR REPLACE VIEW public.eb_unassigned_mandates
WITH (security_invoker = on) AS
SELECT
  m.id AS mandate_id,
  m.company_cnpj AS cnpj,
  COALESCE(c.razao_social, c.nome_fantasia, m.company_cnpj) AS company_name,
  c.codename,
  m.pipeline_stage,
  m.outcome,
  m.valor_pedido,
  m.valor_operacao,
  m.deal_origin,
  m.deal_kind,
  m.deal_confidence,
  m.setor,
  m.uf,
  m.created_at,
  m.stage_changed_at
FROM equity_brain.mandates m
LEFT JOIN equity_brain.companies c ON c.cnpj = m.company_cnpj
WHERE m.responsavel_id IS NULL
  AND m.outcome IN ('em_andamento', 'vigente')
  AND public.has_role(auth.uid(), 'admin'::app_role);

GRANT SELECT ON public.eb_unassigned_mandates TO authenticated;

CREATE OR REPLACE FUNCTION equity_brain.bulk_assign_responsavel(
  p_mandate_ids UUID[],
  p_advisor_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, equity_brain
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas admins podem atribuir responsáveis em lote';
  END IF;

  UPDATE equity_brain.mandates
  SET responsavel_id = p_advisor_id,
      updated_at = now()
  WHERE id = ANY (p_mandate_ids)
    AND responsavel_id IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION equity_brain.auto_assign_next_n(p_n INTEGER DEFAULT 50)
RETURNS TABLE(mandate_id UUID, assigned_to UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, equity_brain
AS $$
DECLARE
  v_mandate RECORD;
  v_advisor UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas admins podem auto-atribuir';
  END IF;

  FOR v_mandate IN
    SELECT id FROM equity_brain.mandates
    WHERE responsavel_id IS NULL
      AND outcome IN ('em_andamento', 'vigente')
    ORDER BY created_at DESC
    LIMIT p_n
  LOOP
    v_advisor := equity_brain.suggest_responsavel(v_mandate.id);
    IF v_advisor IS NOT NULL THEN
      UPDATE equity_brain.mandates
      SET responsavel_id = v_advisor, updated_at = now()
      WHERE id = v_mandate.id;
      mandate_id := v_mandate.id;
      assigned_to := v_advisor;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

DO $$
BEGIN
  ASSERT (SELECT COUNT(*) FROM mari_ops.health_check) >= 0,
    'health_check deve existir';
END $$;