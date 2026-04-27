-- Equity Brain — Fase 4: Motor de Matching
-- DROP + recreate companies_scored (mudança de ordem de coluna),
-- cria tabela matches + view matches_enriched.

-- ============================================================
-- A) Recria companies_scored com `porte`
-- ============================================================
DROP VIEW IF EXISTS equity_brain.companies_scored CASCADE;

CREATE VIEW equity_brain.companies_scored
WITH (security_invoker = true) AS
SELECT
  c.cnpj, c.razao_social, c.nome_fantasia, c.uf, c.municipio,
  c.setor_ma, c.subsetor_ma, c.cnae_principal, c.cnae_descricao,
  c.data_abertura, c.capital_social, c.porte,
  c.qtd_socios, c.has_listing, c.listing_id,
  s.ma_score, s.vispe_score, s.sucessao_score, s.buyer_fit_score,
  s.ma_breakdown, s.vispe_breakdown, s.sucessao_breakdown,
  s.computed_at AS scores_computed_at,
  EXTRACT(YEAR FROM AGE(NOW(), c.data_abertura)) AS idade_empresa
FROM equity_brain.companies c
LEFT JOIN equity_brain.company_scores s
  ON s.cnpj = c.cnpj AND s.is_current = true;

GRANT SELECT ON equity_brain.companies_scored TO authenticated;

-- ============================================================
-- B) Tabela matches
-- ============================================================
CREATE TABLE IF NOT EXISTS equity_brain.matches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj            VARCHAR(14) NOT NULL REFERENCES equity_brain.companies(cnpj) ON DELETE CASCADE,
  buyer_id        UUID NOT NULL REFERENCES equity_brain.buyers(id) ON DELETE CASCADE,
  thesis_key      VARCHAR(40) NOT NULL REFERENCES equity_brain.investment_theses(thesis_key),
  match_score     NUMERIC NOT NULL DEFAULT 0,
  setor_fit       NUMERIC,
  geografia_fit   NUMERIC,
  porte_fit       NUMERIC,
  tese_fit        NUMERIC,
  ma_score_emp    NUMERIC,
  reasons         JSONB,
  ai_thesis_summary TEXT,
  ai_pitch          TEXT,
  ai_confidence     NUMERIC,
  status          VARCHAR(20) DEFAULT 'novo',
  prioridade      INTEGER DEFAULT 3,
  assigned_bdr    UUID,  -- vínculo lógico para auth.users(id), sem FK direta
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_current      BOOLEAN NOT NULL DEFAULT true
);

COMMENT ON COLUMN equity_brain.matches.assigned_bdr IS
  'UUID lógico do BDR (auth.users.id). Sem FK direta para evitar problemas em restore/migrate.';

CREATE UNIQUE INDEX IF NOT EXISTS uniq_matches_current
  ON equity_brain.matches(cnpj, buyer_id, thesis_key)
  WHERE is_current = true;

CREATE INDEX IF NOT EXISTS idx_matches_cnpj_current   ON equity_brain.matches(cnpj) WHERE is_current=true;
CREATE INDEX IF NOT EXISTS idx_matches_buyer_current  ON equity_brain.matches(buyer_id) WHERE is_current=true;
CREATE INDEX IF NOT EXISTS idx_matches_score_current  ON equity_brain.matches(match_score DESC) WHERE is_current=true;
CREATE INDEX IF NOT EXISTS idx_matches_status         ON equity_brain.matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_assigned       ON equity_brain.matches(assigned_bdr) WHERE assigned_bdr IS NOT NULL;

-- ============================================================
-- C) RLS
-- ============================================================
ALTER TABLE equity_brain.matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "matches_read_admins_advisors" ON equity_brain.matches;
CREATE POLICY "matches_read_admins_advisors"
ON equity_brain.matches FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advisor'));

DROP POLICY IF EXISTS "matches_update_assignee" ON equity_brain.matches;
CREATE POLICY "matches_update_assignee"
ON equity_brain.matches FOR UPDATE TO authenticated
USING (assigned_bdr = auth.uid() OR public.has_role(auth.uid(),'admin'))
WITH CHECK (true);

DROP POLICY IF EXISTS "matches_service_full" ON equity_brain.matches;
CREATE POLICY "matches_service_full"
ON equity_brain.matches FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- ============================================================
-- D) View matches_enriched
-- ============================================================
CREATE OR REPLACE VIEW equity_brain.matches_enriched
WITH (security_invoker = true) AS
SELECT
  m.id, m.match_score, m.status, m.prioridade, m.assigned_bdr, m.computed_at,
  m.reasons, m.ai_thesis_summary, m.ai_pitch, m.thesis_key,
  m.setor_fit, m.geografia_fit, m.porte_fit, m.tese_fit, m.ma_score_emp,
  c.cnpj, c.razao_social, c.nome_fantasia, c.uf, c.municipio,
  c.setor_ma, c.subsetor_ma, c.cnae_principal, c.cnae_descricao,
  c.data_abertura, c.capital_social, c.porte, c.qtd_socios, c.has_listing,
  cs.ma_score, cs.vispe_score, cs.sucessao_score,
  b.id AS buyer_id, b.nome AS buyer_nome, b.tipo AS buyer_tipo,
  b.ticket_min, b.ticket_max, b.setores_interesse,
  t.display_name AS thesis_name, t.category AS thesis_category, t.description AS thesis_description
FROM equity_brain.matches m
JOIN equity_brain.companies c ON c.cnpj = m.cnpj
JOIN equity_brain.buyers b    ON b.id = m.buyer_id
JOIN equity_brain.investment_theses t ON t.thesis_key = m.thesis_key
LEFT JOIN equity_brain.company_scores cs ON cs.cnpj = m.cnpj AND cs.is_current = true
WHERE m.is_current = true;

GRANT SELECT ON equity_brain.matches_enriched TO authenticated;