
-- Onda C — Equity Planner
-- 1) RPC equity_assessment_full: entrega assessment + filhos + benchmarks + market_scan em 1 round-trip
-- 2) RPC equity_compute_rate_check: valida cota de compute (5/24h) para o user

CREATE OR REPLACE FUNCTION public.equity_assessment_full(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_assess public.equity_assessments%ROWTYPE;
  v_is_privileged boolean;
  v_porte text;
  v_val_id uuid;
  v_result jsonb;
BEGIN
  SELECT * INTO v_assess FROM public.equity_assessments WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  v_is_privileged := public.has_role(v_uid, 'admin') OR public.has_role(v_uid, 'advisor');
  IF v_assess.user_id <> v_uid AND NOT v_is_privileged THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  SELECT porte INTO v_porte FROM public.equity_companies WHERE id = v_assess.company_id;
  SELECT id INTO v_val_id FROM public.equity_valuations WHERE assessment_id = p_id LIMIT 1;

  SELECT jsonb_build_object(
    'assessment', to_jsonb(v_assess),
    'company_porte', v_porte,
    'dim_scores', COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM public.equity_dimension_scores x WHERE x.assessment_id = p_id), '[]'::jsonb),
    'valuation', (SELECT to_jsonb(x) FROM public.equity_valuations x WHERE x.assessment_id = p_id LIMIT 1),
    'bridge', COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.ordem) FROM public.equity_value_bridge_items x WHERE x.valuation_id = v_val_id), '[]'::jsonb),
    'initiatives', COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.prioridade) FROM public.equity_initiatives x WHERE x.assessment_id = p_id), '[]'::jsonb),
    'buyers', COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.prioridade) FROM public.equity_buyer_map x WHERE x.assessment_id = p_id), '[]'::jsonb),
    'progress_log', COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_at) FROM public.equity_progress_log x WHERE x.company_id = v_assess.company_id), '[]'::jsonb),
    'deepdive', COALESCE((SELECT jsonb_agg(jsonb_build_object('initiative_id', x.initiative_id, 'status', x.status, 'questions', x.questions, 'answers', x.answers)) FROM public.equity_initiative_deepdive x WHERE x.assessment_id = p_id), '[]'::jsonb),
    'annual_plan', (SELECT to_jsonb(x) FROM public.equity_annual_plan x WHERE x.assessment_id = p_id LIMIT 1),
    'dim_benchmarks', CASE WHEN v_assess.arquetipo_id IS NOT NULL AND v_porte IS NOT NULL
      THEN COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM public.equity_dimension_benchmarks x WHERE x.arquetipo_id = v_assess.arquetipo_id AND x.porte = v_porte), '[]'::jsonb)
      ELSE '[]'::jsonb END,
    'comp_bench', CASE WHEN v_assess.arquetipo_id IS NOT NULL AND v_porte IS NOT NULL
      THEN (SELECT to_jsonb(x) FROM public.equity_comps_benchmarks x WHERE x.arquetipo_id = v_assess.arquetipo_id AND x.porte = v_porte LIMIT 1)
      ELSE NULL END,
    'market_scan', (SELECT payload FROM public.equity_market_scans WHERE assessment_id = p_id AND status = 'done' ORDER BY completed_at DESC NULLS LAST LIMIT 1)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.equity_assessment_full(uuid) TO authenticated, service_role;

-- Rate limit helper: retorna número de computes do usuário nas últimas 24h
CREATE OR REPLACE FUNCTION public.equity_compute_count_24h(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.rate_limits
  WHERE identifier = p_user_id::text
    AND action = 'equity_compute'
    AND created_at > now() - interval '24 hours';
$$;

GRANT EXECUTE ON FUNCTION public.equity_compute_count_24h(uuid) TO authenticated, service_role;
