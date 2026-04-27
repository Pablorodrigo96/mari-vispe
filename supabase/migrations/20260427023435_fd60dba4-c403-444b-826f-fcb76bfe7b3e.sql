-- Equity Brain — Fase 6: Auditoria de chamadas de IA (Claude)

CREATE TABLE IF NOT EXISTS equity_brain.ai_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name   VARCHAR(40) NOT NULL,    -- 'classify_thesis' | 'generate_pitch' | 'analyze_call'
  cnpj            VARCHAR(14),
  buyer_id        UUID,                    -- sem FK (preserva log histórico)
  match_id        UUID,                    -- sem FK (preserva log histórico)

  model           VARCHAR(40) DEFAULT 'claude-sonnet-4-20250514',
  prompt_input    JSONB,
  raw_response    TEXT,
  parsed_output   JSONB,

  tokens_input    INTEGER,
  tokens_output   INTEGER,
  cost_usd        NUMERIC(10,6),
  latency_ms      INTEGER,
  status          VARCHAR(20),             -- 'success' | 'error' | 'partial'
  error_message   TEXT,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  triggered_by    UUID                     -- vínculo lógico p/ auth.users(id), sem FK
);

COMMENT ON COLUMN equity_brain.ai_runs.triggered_by IS
  'UUID lógico do usuário (auth.users.id). Sem FK direta para evitar problemas em restore/migrate.';

CREATE INDEX IF NOT EXISTS idx_ai_runs_function ON equity_brain.ai_runs(function_name);
CREATE INDEX IF NOT EXISTS idx_ai_runs_cnpj     ON equity_brain.ai_runs(cnpj);
CREATE INDEX IF NOT EXISTS idx_ai_runs_created  ON equity_brain.ai_runs(created_at DESC);

ALTER TABLE equity_brain.ai_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_runs_read_admin" ON equity_brain.ai_runs;
CREATE POLICY "ai_runs_read_admin"
ON equity_brain.ai_runs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "ai_runs_service" ON equity_brain.ai_runs;
CREATE POLICY "ai_runs_service"
ON equity_brain.ai_runs FOR ALL TO service_role
USING (true) WITH CHECK (true);