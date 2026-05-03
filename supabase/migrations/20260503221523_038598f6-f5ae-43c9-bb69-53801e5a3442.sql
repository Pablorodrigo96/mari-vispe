CREATE OR REPLACE VIEW public.eb_matches_enriched
WITH (security_invoker = true) AS
SELECT m.*
  FROM equity_brain.matches_enriched m
  JOIN equity_brain.companies c ON c.cnpj = m.cnpj
  LEFT JOIN equity_brain.buyers b ON b.id = m.buyer_id
 WHERE equity_brain.is_company_visible_in_crm(c.cnpj, c.source)
   AND coalesce(b.is_synthetic, false) = false;
GRANT SELECT ON public.eb_matches_enriched TO authenticated;