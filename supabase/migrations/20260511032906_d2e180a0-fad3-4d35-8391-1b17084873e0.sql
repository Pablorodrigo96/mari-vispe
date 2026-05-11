CREATE OR REPLACE FUNCTION public.eb_ai_runs_by_date(p_date date)
RETURNS TABLE (
  id uuid,
  function_name text,
  cnpj text,
  buyer_id uuid,
  match_id uuid,
  status text,
  parsed_output jsonb,
  error_message text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, equity_brain
AS $$
  SELECT
    r.id,
    r.function_name::text,
    r.cnpj::text,
    r.buyer_id,
    r.match_id,
    r.status::text,
    r.parsed_output,
    r.error_message,
    r.created_at
  FROM equity_brain.ai_runs r
  WHERE r.created_at >= p_date::timestamptz
    AND r.created_at <  (p_date + 1)::timestamptz
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'advisor'))
  ORDER BY r.created_at DESC
  LIMIT 30;
$$;

REVOKE ALL ON FUNCTION public.eb_ai_runs_by_date(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.eb_ai_runs_by_date(date) TO authenticated;