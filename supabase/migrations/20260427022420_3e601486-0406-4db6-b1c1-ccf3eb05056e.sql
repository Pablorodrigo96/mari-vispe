-- Equity Brain — Fase 5: Warm Layer (Opportunities Ready)

-- ============================================================
-- A) Tabela opportunities_ready
-- ============================================================
CREATE TABLE IF NOT EXISTS equity_brain.opportunities_ready (
  cnpj            VARCHAR(14) PRIMARY KEY REFERENCES equity_brain.companies(cnpj) ON DELETE CASCADE,
  razao_social    TEXT NOT NULL,
  nome_fantasia   TEXT,
  uf              VARCHAR(2),
  municipio       TEXT,
  setor_ma        VARCHAR(50),
  subsetor_ma     VARCHAR(50),
  ma_score        NUMERIC,
  vispe_score     NUMERIC,
  sucessao_score  NUMERIC,
  best_thesis_key VARCHAR(40),
  best_thesis_name TEXT,
  top_buyers      JSONB,
  buyers_count    INTEGER DEFAULT 0,
  ai_pitch        TEXT,
  default_pitch   TEXT,
  bubble_size     NUMERIC,
  bubble_color    VARCHAR(20),
  status          VARCHAR(20) DEFAULT 'novo',
  assigned_bdr    UUID,                    -- vínculo lógico p/ auth.users(id), sem FK
  refreshed_at    TIMESTAMPTZ DEFAULT NOW(),
  source_match_count INTEGER
);

COMMENT ON COLUMN equity_brain.opportunities_ready.assigned_bdr IS
  'UUID lógico do BDR (auth.users.id). Sem FK direta para evitar problemas em restore/migrate.';

CREATE INDEX IF NOT EXISTS idx_opp_setor_uf      ON equity_brain.opportunities_ready(setor_ma, uf);
CREATE INDEX IF NOT EXISTS idx_opp_ma_score      ON equity_brain.opportunities_ready(ma_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_opp_bubble_color  ON equity_brain.opportunities_ready(bubble_color);
CREATE INDEX IF NOT EXISTS idx_opp_status        ON equity_brain.opportunities_ready(status);
CREATE INDEX IF NOT EXISTS idx_opp_assigned      ON equity_brain.opportunities_ready(assigned_bdr) WHERE assigned_bdr IS NOT NULL;

-- ============================================================
-- B) RLS
-- ============================================================
ALTER TABLE equity_brain.opportunities_ready ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "opp_read_admins_advisors" ON equity_brain.opportunities_ready;
CREATE POLICY "opp_read_admins_advisors"
ON equity_brain.opportunities_ready FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'admin') OR
  public.has_role(auth.uid(),'advisor') OR
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_partner_accountant = true)
);

DROP POLICY IF EXISTS "opp_update_assignee" ON equity_brain.opportunities_ready;
CREATE POLICY "opp_update_assignee"
ON equity_brain.opportunities_ready FOR UPDATE TO authenticated
USING (assigned_bdr = auth.uid() OR public.has_role(auth.uid(),'admin'))
WITH CHECK (true);

DROP POLICY IF EXISTS "opp_service_full" ON equity_brain.opportunities_ready;
CREATE POLICY "opp_service_full"
ON equity_brain.opportunities_ready FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- ============================================================
-- C) View pública (PII ofuscada)
-- ============================================================
CREATE OR REPLACE VIEW equity_brain.opportunities_public
WITH (security_invoker = true) AS
SELECT
  cnpj,
  CASE WHEN ma_score >= 70 THEN razao_social ELSE 'Empresa #' || RIGHT(cnpj, 4) END AS display_name,
  uf, municipio, setor_ma, subsetor_ma,
  ma_score, vispe_score, sucessao_score,
  best_thesis_key, best_thesis_name,
  buyers_count, bubble_size, bubble_color
FROM equity_brain.opportunities_ready;

GRANT SELECT ON equity_brain.opportunities_public TO anon, authenticated;