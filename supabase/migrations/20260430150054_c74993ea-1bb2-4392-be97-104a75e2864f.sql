CREATE OR REPLACE FUNCTION equity_brain.is_company_visible_in_crm(_cnpj varchar, _source varchar)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, equity_brain
AS $$
  SELECT CASE
    WHEN _source IS DISTINCT FROM 'ANATEL_BANDA_LARGA_FIXA' THEN true
    ELSE EXISTS (
      SELECT 1 FROM equity_brain.isp_promotion_log p
      WHERE p.cnpj = _cnpj
        AND p.to_status::text <> 'cold_market_map'
    )
  END
$$;

CREATE OR REPLACE VIEW public.eb_companies AS
SELECT * FROM equity_brain.companies
WHERE equity_brain.is_company_visible_in_crm(cnpj, source);

CREATE OR REPLACE VIEW public.eb_companies_enriched AS
SELECT * FROM equity_brain.companies_enriched
WHERE equity_brain.is_company_visible_in_crm(cnpj, source);

CREATE OR REPLACE VIEW public.eb_companies_scored AS
SELECT s.*
FROM equity_brain.companies_scored s
JOIN equity_brain.companies c ON c.cnpj = s.cnpj
WHERE equity_brain.is_company_visible_in_crm(c.cnpj, c.source);

CREATE OR REPLACE VIEW public.eb_opportunities_ready AS
SELECT o.cnpj, o.razao_social, o.nome_fantasia, o.uf, o.municipio,
  o.setor_ma, o.subsetor_ma, o.ma_score, o.vispe_score, o.sucessao_score,
  o.best_thesis_key, o.best_thesis_name, o.top_buyers, o.buyers_count,
  o.ai_pitch, o.default_pitch, o.bubble_size, o.bubble_color, o.status,
  o.assigned_bdr, o.refreshed_at, o.source_match_count,
  c.cnae_principal, c.cnae_descricao, c.data_abertura,
  c.situacao_cadastral, c.has_listing, c.listing_id, c.latitude, c.longitude
FROM equity_brain.opportunities_ready o
LEFT JOIN equity_brain.companies c ON c.cnpj::text = o.cnpj::text
WHERE equity_brain.is_company_visible_in_crm(o.cnpj, c.source);

CREATE OR REPLACE VIEW public.eb_isp_city_stats AS
SELECT * FROM equity_brain.isp_city_market_stats;

CREATE OR REPLACE VIEW public.eb_isp_company_stats AS
SELECT s.*, t.thesis_key AS best_thesis_key, t.fit_score AS best_thesis_score
FROM equity_brain.isp_company_market_stats s
LEFT JOIN LATERAL (
  SELECT thesis_key, fit_score
  FROM equity_brain.isp_thesis_link
  WHERE cnpj = s.cnpj
  ORDER BY fit_score DESC NULLS LAST
  LIMIT 1
) t ON true;

CREATE OR REPLACE VIEW public.eb_isp_market_entries AS
SELECT * FROM equity_brain.isp_market_entries;

CREATE OR REPLACE VIEW public.eb_isp_uf_summary AS
SELECT
  uf,
  period_ref,
  SUM(total_accesses)::bigint AS total_accesses,
  SUM(n_providers)::int       AS n_providers_sum,
  AVG(fragmentation_score)::numeric(5,3) AS avg_fragmentation,
  AVG(rollup_opportunity_score)::numeric(5,3) AS avg_rollup_opportunity,
  COUNT(*)::int               AS n_cities
FROM equity_brain.isp_city_market_stats
GROUP BY uf, period_ref;

GRANT SELECT ON public.eb_isp_city_stats     TO authenticated;
GRANT SELECT ON public.eb_isp_company_stats  TO authenticated;
GRANT SELECT ON public.eb_isp_market_entries TO authenticated;
GRANT SELECT ON public.eb_isp_uf_summary     TO authenticated;

ALTER VIEW public.eb_isp_city_stats     SET (security_invoker = true);
ALTER VIEW public.eb_isp_company_stats  SET (security_invoker = true);
ALTER VIEW public.eb_isp_market_entries SET (security_invoker = true);
ALTER VIEW public.eb_isp_uf_summary     SET (security_invoker = true);