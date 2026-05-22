-- Proxy views em public para tabelas que vivem em equity_brain
-- Resolve erros 500/404 em /rest/v1/matches e /rest/v1/buyer_revealed_thetas
CREATE OR REPLACE VIEW public.matches
WITH (security_invoker=on) AS
  SELECT * FROM equity_brain.matches;

CREATE OR REPLACE VIEW public.buyer_revealed_thetas
WITH (security_invoker=on) AS
  SELECT * FROM equity_brain.buyer_revealed_thetas;

GRANT SELECT ON public.matches TO anon, authenticated;
GRANT SELECT ON public.buyer_revealed_thetas TO anon, authenticated;