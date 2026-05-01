
CREATE OR REPLACE FUNCTION public.get_health_summary_24h()
RETURNS TABLE (
  function_name text,
  total_runs int,
  ok_runs int,
  error_runs int,
  success_rate_pct numeric,
  p50_ms int,
  p95_ms int,
  last_run_at timestamptz,
  last_error text,
  status_color text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, mari_ops
AS $$
  SELECT * FROM mari_ops.health_summary_24h
  WHERE has_role(auth.uid(), 'admin'::app_role)
  ORDER BY
    CASE status_color WHEN 'red' THEN 0 WHEN 'yellow' THEN 1 ELSE 2 END,
    last_run_at DESC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.get_health_summary_24h() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_health_recent_errors(limit_n int DEFAULT 50)
RETURNS TABLE (
  ts timestamptz,
  function_name text,
  status text,
  duration_ms int,
  error_text text,
  request_id text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, mari_ops
AS $$
  SELECT h.ts, h.function_name, h.status, h.duration_ms, h.error_text, h.request_id
  FROM mari_ops.health_check h
  WHERE has_role(auth.uid(), 'admin'::app_role)
    AND h.status IN ('error', 'red', 'warning')
    AND h.ts > now() - INTERVAL '7 days'
  ORDER BY h.ts DESC
  LIMIT GREATEST(1, LEAST(limit_n, 500));
$$;

GRANT EXECUTE ON FUNCTION public.get_health_recent_errors(int) TO authenticated;
