-- Equity Brain — Fase 7: Event-Driven + Feedback Loop

-- ============================================================
-- A) Tabela events (log central)
-- ============================================================
CREATE TABLE IF NOT EXISTS equity_brain.events (
  id               BIGSERIAL PRIMARY KEY,
  event_type       TEXT NOT NULL,
  entity_type      TEXT NOT NULL,
  entity_id        TEXT NOT NULL,
  payload          JSONB NOT NULL DEFAULT '{}'::jsonb,
  triggered_by     TEXT,
  retry_count      INTEGER NOT NULL DEFAULT 0,
  processed_at     TIMESTAMPTZ,
  processed_status TEXT,
  error_message    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_unprocessed
  ON equity_brain.events (created_at)
  WHERE processed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_events_entity
  ON equity_brain.events (entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_type
  ON equity_brain.events (event_type, created_at DESC);

-- ============================================================
-- B) Tabela call_feedback
-- ============================================================
CREATE TABLE IF NOT EXISTS equity_brain.call_feedback (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj                 VARCHAR(14) NOT NULL,
  bdr_user_id          UUID,                      -- vínculo lógico p/ auth.users(id), sem FK
  call_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_seconds     INTEGER,
  outcome              TEXT NOT NULL,
  interest_level       INTEGER CHECK (interest_level BETWEEN 1 AND 5),
  timing_estimado      TEXT,
  dor_principal        TEXT,
  faturamento_revelado NUMERIC(18,2),
  ebitda_revelado      NUMERIC(18,2),
  num_socios_real      INTEGER,
  raw_notes            TEXT,
  ai_extracted         JSONB,
  signals_added        TEXT[],
  followup_at          TIMESTAMPTZ,
  followup_action      TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN equity_brain.call_feedback.bdr_user_id IS
  'UUID lógico do BDR (auth.users.id). Sem FK direta para evitar problemas em restore/migrate.';

CREATE INDEX IF NOT EXISTS idx_call_feedback_cnpj    ON equity_brain.call_feedback (cnpj, call_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_feedback_bdr     ON equity_brain.call_feedback (bdr_user_id, call_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_feedback_outcome ON equity_brain.call_feedback (outcome, call_at DESC);

-- Trigger updated_at (reusa função existente)
DROP TRIGGER IF EXISTS trg_call_feedback_updated_at ON equity_brain.call_feedback;
CREATE TRIGGER trg_call_feedback_updated_at
BEFORE UPDATE ON equity_brain.call_feedback
FOR EACH ROW EXECUTE FUNCTION equity_brain.set_updated_at();

-- ============================================================
-- C) Trigger: emite event quando company_signals INSERT
-- (schema real: weight, confidence, signal_value — sem severity/value/created_by)
-- ============================================================
CREATE OR REPLACE FUNCTION equity_brain.trg_emit_signal_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = equity_brain, public
AS $$
BEGIN
  INSERT INTO equity_brain.events (event_type, entity_type, entity_id, payload, triggered_by)
  VALUES (
    'company.signal_added',
    'company',
    NEW.cnpj,
    jsonb_build_object(
      'signal_key', NEW.signal_key,
      'weight',     NEW.weight,
      'confidence', NEW.confidence,
      'source',     NEW.source,
      'signal_value', NEW.signal_value
    ),
    COALESCE(NEW.source, 'system')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS company_signals_event ON equity_brain.company_signals;
CREATE TRIGGER company_signals_event
AFTER INSERT ON equity_brain.company_signals
FOR EACH ROW EXECUTE FUNCTION equity_brain.trg_emit_signal_event();

-- ============================================================
-- D) Trigger: emite event quando call_feedback INSERT
-- ============================================================
CREATE OR REPLACE FUNCTION equity_brain.trg_emit_call_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = equity_brain, public
AS $$
BEGIN
  INSERT INTO equity_brain.events (event_type, entity_type, entity_id, payload, triggered_by)
  VALUES (
    'call.completed',
    'company',
    NEW.cnpj,
    jsonb_build_object(
      'feedback_id',    NEW.id,
      'outcome',        NEW.outcome,
      'interest_level', NEW.interest_level,
      'timing',         NEW.timing_estimado,
      'dor',            NEW.dor_principal
    ),
    COALESCE('bdr:' || NEW.bdr_user_id::text, 'bdr:unknown')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS call_feedback_event ON equity_brain.call_feedback;
CREATE TRIGGER call_feedback_event
AFTER INSERT ON equity_brain.call_feedback
FOR EACH ROW EXECUTE FUNCTION equity_brain.trg_emit_call_event();

-- ============================================================
-- E) Trigger: emite event quando buyer_theses INSERT
-- (schema real: thesis_key, prioridade, active — sem cnaes_target/ufs_target/thesis_id)
-- ============================================================
CREATE OR REPLACE FUNCTION equity_brain.trg_emit_buyer_thesis_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = equity_brain, public
AS $$
BEGIN
  INSERT INTO equity_brain.events (event_type, entity_type, entity_id, payload, triggered_by)
  VALUES (
    'buyer.thesis_added',
    'buyer',
    NEW.buyer_id::text,
    jsonb_build_object(
      'thesis_key', NEW.thesis_key,
      'prioridade', NEW.prioridade,
      'active',     NEW.active
    ),
    'system'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS buyer_theses_event ON equity_brain.buyer_theses;
CREATE TRIGGER buyer_theses_event
AFTER INSERT ON equity_brain.buyer_theses
FOR EACH ROW EXECUTE FUNCTION equity_brain.trg_emit_buyer_thesis_event();

-- ============================================================
-- F) RLS
-- ============================================================
ALTER TABLE equity_brain.events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE equity_brain.call_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_admin_read" ON equity_brain.events;
CREATE POLICY "events_admin_read"
ON equity_brain.events FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "events_service_all" ON equity_brain.events;
CREATE POLICY "events_service_all"
ON equity_brain.events FOR ALL TO service_role
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "callfb_bdr_read" ON equity_brain.call_feedback;
CREATE POLICY "callfb_bdr_read"
ON equity_brain.call_feedback FOR SELECT TO authenticated
USING (
  bdr_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'advisor')
);

DROP POLICY IF EXISTS "callfb_bdr_write" ON equity_brain.call_feedback;
CREATE POLICY "callfb_bdr_write"
ON equity_brain.call_feedback FOR INSERT TO authenticated
WITH CHECK (
  bdr_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "callfb_bdr_update" ON equity_brain.call_feedback;
CREATE POLICY "callfb_bdr_update"
ON equity_brain.call_feedback FOR UPDATE TO authenticated
USING (bdr_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (true);

DROP POLICY IF EXISTS "callfb_service_all" ON equity_brain.call_feedback;
CREATE POLICY "callfb_service_all"
ON equity_brain.call_feedback FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- ============================================================
-- G) View v_bdr_history
-- ============================================================
CREATE OR REPLACE VIEW equity_brain.v_bdr_history
WITH (security_invoker = true) AS
SELECT
  cf.id,
  cf.cnpj,
  c.razao_social,
  cf.bdr_user_id,
  cf.call_at,
  cf.outcome,
  cf.interest_level,
  cf.timing_estimado,
  cf.dor_principal,
  cf.followup_at,
  cf.followup_action,
  cs.ma_score,
  cs.vispe_score,
  cs.sucessao_score
FROM equity_brain.call_feedback cf
LEFT JOIN equity_brain.companies      c  ON c.cnpj  = cf.cnpj
LEFT JOIN equity_brain.company_scores cs ON cs.cnpj = cf.cnpj AND cs.is_current = true;

GRANT SELECT ON equity_brain.v_bdr_history TO authenticated;