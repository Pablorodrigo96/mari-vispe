
CREATE OR REPLACE FUNCTION public.mari_ops_record_smoke(
  p_test_name text,
  p_status text,
  p_duration_ms int,
  p_actual jsonb DEFAULT NULL,
  p_message text DEFAULT NULL
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, mari_ops
AS $$
  INSERT INTO mari_ops.smoke_tests (test_name, status, duration_ms, actual, message)
  VALUES (p_test_name, p_status, p_duration_ms, p_actual, p_message);
$$;

GRANT EXECUTE ON FUNCTION public.mari_ops_record_smoke(text,text,int,jsonb,text) TO service_role, authenticated;
