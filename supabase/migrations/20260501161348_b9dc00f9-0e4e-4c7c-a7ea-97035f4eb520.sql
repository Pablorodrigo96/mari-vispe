-- Public wrapper views for analytical dashboards
CREATE OR REPLACE VIEW public.mv_dashboard_executivo
WITH (security_invoker = true) AS
SELECT * FROM equity_brain.mv_dashboard_executivo;

CREATE OR REPLACE VIEW public.mv_dashboard_mandato
WITH (security_invoker = true) AS
SELECT * FROM equity_brain.mv_dashboard_mandato;

CREATE OR REPLACE VIEW public.mv_dashboard_match
WITH (security_invoker = true) AS
SELECT * FROM equity_brain.mv_dashboard_match;

CREATE OR REPLACE VIEW public.mv_dashboard_nbo
WITH (security_invoker = true) AS
SELECT * FROM equity_brain.mv_dashboard_nbo;

-- Grant read access (RLS protege via security_invoker em tabelas-fonte;
-- como MVs não suportam RLS, aplicamos check via revoke + grant restrito)
REVOKE ALL ON public.mv_dashboard_executivo FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.mv_dashboard_mandato   FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.mv_dashboard_match     FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.mv_dashboard_nbo       FROM PUBLIC, anon, authenticated;

-- Função SECURITY DEFINER que checa role e devolve os 4 dashboards
CREATE OR REPLACE FUNCTION public.get_dashboard_executivo()
RETURNS SETOF equity_brain.mv_dashboard_executivo
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, equity_brain
AS $$
  SELECT * FROM equity_brain.mv_dashboard_executivo
  WHERE has_role(auth.uid(), 'admin'::app_role)
     OR has_role(auth.uid(), 'advisor'::app_role);
$$;

CREATE OR REPLACE FUNCTION public.get_dashboard_mandato()
RETURNS SETOF equity_brain.mv_dashboard_mandato
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, equity_brain
AS $$
  SELECT * FROM equity_brain.mv_dashboard_mandato
  WHERE has_role(auth.uid(), 'admin'::app_role)
     OR has_role(auth.uid(), 'advisor'::app_role);
$$;

CREATE OR REPLACE FUNCTION public.get_dashboard_match()
RETURNS SETOF equity_brain.mv_dashboard_match
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, equity_brain
AS $$
  SELECT * FROM equity_brain.mv_dashboard_match
  WHERE has_role(auth.uid(), 'admin'::app_role)
     OR has_role(auth.uid(), 'advisor'::app_role);
$$;

CREATE OR REPLACE FUNCTION public.get_dashboard_nbo()
RETURNS SETOF equity_brain.mv_dashboard_nbo
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, equity_brain
AS $$
  SELECT * FROM equity_brain.mv_dashboard_nbo
  WHERE has_role(auth.uid(), 'admin'::app_role)
     OR has_role(auth.uid(), 'advisor'::app_role);
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_executivo() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_mandato()   TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_match()     TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_nbo()       TO authenticated;