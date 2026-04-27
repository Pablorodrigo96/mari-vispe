-- Equity Brain Fase 2: tabela company_scores + view companies_scored

CREATE TABLE IF NOT EXISTS equity_brain.company_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj            VARCHAR(14) NOT NULL REFERENCES equity_brain.companies(cnpj) ON DELETE CASCADE,
  ma_score        NUMERIC NOT NULL DEFAULT 0,
  vispe_score     NUMERIC NOT NULL DEFAULT 0,
  sucessao_score  NUMERIC NOT NULL DEFAULT 0,
  buyer_fit_score NUMERIC,
  ma_breakdown        JSONB,
  vispe_breakdown     JSONB,
  sucessao_breakdown  JSONB,
  formula_version VARCHAR(10) NOT NULL DEFAULT 'v1.0',
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_current      BOOLEAN NOT NULL DEFAULT true
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_scores_current_per_cnpj_version
  ON equity_brain.company_scores(cnpj, formula_version)
  WHERE is_current = true;

CREATE INDEX IF NOT EXISTS idx_scores_cnpj_current  ON equity_brain.company_scores(cnpj, is_current);
CREATE INDEX IF NOT EXISTS idx_scores_ma_current    ON equity_brain.company_scores(ma_score DESC) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_scores_vispe_current ON equity_brain.company_scores(vispe_score DESC) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_scores_suc_current   ON equity_brain.company_scores(sucessao_score DESC) WHERE is_current = true;

ALTER TABLE equity_brain.company_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scores_read_admins_advisors"
ON equity_brain.company_scores FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'advisor')
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_partner_accountant = true)
);

CREATE POLICY "scores_write_service"
ON equity_brain.company_scores FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE OR REPLACE VIEW equity_brain.companies_scored
WITH (security_invoker = true) AS
SELECT
  c.cnpj, c.razao_social, c.nome_fantasia, c.uf, c.municipio,
  c.setor_ma, c.subsetor_ma, c.cnae_principal, c.cnae_descricao,
  c.data_abertura, c.capital_social, c.qtd_socios,
  c.has_listing, c.listing_id,
  COALESCE(s.ma_score, 0)        AS ma_score,
  COALESCE(s.vispe_score, 0)     AS vispe_score,
  COALESCE(s.sucessao_score, 0)  AS sucessao_score,
  s.buyer_fit_score,
  s.ma_breakdown, s.vispe_breakdown, s.sucessao_breakdown,
  s.computed_at AS scores_computed_at,
  EXTRACT(YEAR FROM AGE(NOW(), c.data_abertura))::int AS idade_empresa
FROM equity_brain.companies c
LEFT JOIN equity_brain.company_scores s
  ON s.cnpj = c.cnpj AND s.is_current = true AND s.formula_version = 'v1.0';

GRANT SELECT ON equity_brain.companies_scored TO authenticated;