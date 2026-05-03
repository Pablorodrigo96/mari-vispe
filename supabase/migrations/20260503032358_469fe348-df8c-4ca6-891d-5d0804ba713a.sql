-- F1: Geocoding columns + view + buyer detail fields

ALTER TABLE equity_brain.companies
  ADD COLUMN IF NOT EXISTS geocoded_at timestamptz,
  ADD COLUMN IF NOT EXISTS geocoded_source text;

CREATE INDEX IF NOT EXISTS idx_companies_geo
  ON equity_brain.companies(latitude, longitude)
  WHERE latitude IS NOT NULL;

CREATE OR REPLACE VIEW equity_brain.eb_v_mandate_pins AS
SELECT
  m.id,
  m.deal_phase AS fase,
  m.pipeline_stage,
  m.outcome,
  m.company_cnpj,
  c.razao_social,
  c.municipio,
  c.uf,
  c.faturamento_estimado,
  c.latitude,
  c.longitude,
  c.cep
FROM equity_brain.mandates m
LEFT JOIN equity_brain.companies c ON c.cnpj = m.company_cnpj
WHERE c.latitude IS NOT NULL
  AND c.longitude IS NOT NULL;

GRANT SELECT ON equity_brain.eb_v_mandate_pins TO authenticated, anon;

ALTER TABLE equity_brain.buyers
  ADD COLUMN IF NOT EXISTS tese_text text,
  ADD COLUMN IF NOT EXISTS criterios_exclusao text,
  ADD COLUMN IF NOT EXISTS notas_estrategicas text,
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS email_contato_principal text,
  ADD COLUMN IF NOT EXISTS telefone_contato text;
-- buyers.website já existe no schema