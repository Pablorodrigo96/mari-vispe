
CREATE OR REPLACE FUNCTION public.mari_ops_record_health(
  p_function_name text,
  p_status text,
  p_duration_ms int,
  p_error_text text DEFAULT NULL,
  p_payload_summary jsonb DEFAULT NULL,
  p_request_id text DEFAULT NULL,
  p_source text DEFAULT 'edge_function'
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, mari_ops
AS $$
  INSERT INTO mari_ops.health_check (function_name, status, duration_ms, error_text, payload_summary, request_id, source)
  VALUES (p_function_name, p_status, p_duration_ms, p_error_text, p_payload_summary, p_request_id, p_source);
$$;

GRANT EXECUTE ON FUNCTION public.mari_ops_record_health(text,text,int,text,jsonb,text,text) TO service_role, authenticated;

CREATE OR REPLACE FUNCTION public.mari_ops_health_volume_recent(p_minutes int DEFAULT 30)
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, mari_ops
AS $$
  SELECT COUNT(*)::int FROM mari_ops.health_check
  WHERE ts > now() - make_interval(mins => GREATEST(p_minutes, 1));
$$;

GRANT EXECUTE ON FUNCTION public.mari_ops_health_volume_recent(int) TO service_role, authenticated;
