CREATE OR REPLACE VIEW equity_brain.companies_enriched
WITH (security_invoker = true) AS
SELECT
  c.*,
  COALESCE(
    (
      SELECT jsonb_object_agg(
        s.signal_key,
        jsonb_build_object(
          'value', s.signal_value,
          'weight', s.weight,
          'text', s.signal_text,
          'confidence', s.confidence
        )
      )
      FROM equity_brain.company_signals s
      WHERE s.cnpj = c.cnpj
    ),
    '{}'::jsonb
  ) AS signals,
  (SELECT COUNT(*) FROM equity_brain.company_signals s WHERE s.cnpj = c.cnpj) AS signal_count,
  (SELECT COALESCE(SUM(s.weight), 0) FROM equity_brain.company_signals s WHERE s.cnpj = c.cnpj) AS signal_weight_sum,
  l.title AS listing_title,
  l.asking_price AS listing_asking_price,
  l.created_at AS listing_created_at
FROM equity_brain.companies c
LEFT JOIN public.listings l ON l.id = c.listing_id;

GRANT SELECT ON equity_brain.companies_enriched TO authenticated;
GRANT SELECT ON equity_brain.companies_enriched TO service_role;