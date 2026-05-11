-- 1. Settings rows (apenas insere se não existir)
INSERT INTO public.api_settings(key, value, description) VALUES
  ('anthropic_enabled', 'true', 'Kill switch global para chamadas à Anthropic API'),
  ('anthropic_monthly_budget_usd', '50', 'Teto mensal de gasto em USD para Anthropic'),
  ('anthropic_alert_threshold_pct', '0.8', 'Threshold (0-1) para emitir alerta de orçamento')
ON CONFLICT (key) DO NOTHING;

-- 2. View agregada por provider/dia
CREATE OR REPLACE VIEW public.api_usage_daily_by_provider AS
SELECT
  date_trunc('day', created_at)::date AS day,
  provider,
  COUNT(*)::int AS calls,
  COALESCE(SUM(input_tokens), 0)::bigint AS tokens_in,
  COALESCE(SUM(output_tokens), 0)::bigint AS tokens_out,
  COALESCE(SUM(cost_usd), 0)::numeric(14,6) AS cost_usd,
  COALESCE(SUM(cost_brl), 0)::numeric(14,6) AS cost_brl,
  COUNT(*) FILTER (WHERE http_status >= 400 OR status <> 'success')::int AS errors
FROM public.api_usage_logs
GROUP BY 1, 2;

-- Restringe a view a admins (security_invoker fará a RLS de api_usage_logs valer)
ALTER VIEW public.api_usage_daily_by_provider SET (security_invoker = true);

-- 3. RPC: set_provider_enabled
CREATE OR REPLACE FUNCTION public.set_provider_enabled(_provider text, _enabled boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;
  INSERT INTO public.api_settings(key, value, description, updated_at)
  VALUES (_provider || '_enabled', CASE WHEN _enabled THEN 'true' ELSE 'false' END,
          'Kill switch para ' || _provider, now())
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value, updated_at = now();
END;
$$;

-- 4. RPC: set_provider_budget
CREATE OR REPLACE FUNCTION public.set_provider_budget(_provider text, _usd numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;
  IF _usd < 0 THEN
    RAISE EXCEPTION 'budget must be >= 0';
  END IF;
  INSERT INTO public.api_settings(key, value, description, updated_at)
  VALUES (_provider || '_monthly_budget_usd', _usd::text,
          'Teto mensal USD para ' || _provider, now())
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value, updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_provider_enabled(text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_provider_budget(text, numeric) TO authenticated;