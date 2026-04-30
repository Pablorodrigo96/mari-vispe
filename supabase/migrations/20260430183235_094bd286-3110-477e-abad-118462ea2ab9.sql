ALTER TABLE equity_brain.companies
  ADD COLUMN IF NOT EXISTS external_ref text,
  ADD COLUMN IF NOT EXISTS needs_cnpj_enrichment boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS companies_external_ref_unique
  ON equity_brain.companies (external_ref)
  WHERE external_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS buyers_nome_lower_idx
  ON equity_brain.buyers (lower(nome));