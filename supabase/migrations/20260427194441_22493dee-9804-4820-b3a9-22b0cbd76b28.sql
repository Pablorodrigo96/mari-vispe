-- 1) call_feedback.next_pitch
ALTER TABLE equity_brain.call_feedback
  ADD COLUMN IF NOT EXISTS next_pitch jsonb;

-- 2) company_signals.embedding (768 dims = text-embedding-004 / gemini)
ALTER TABLE equity_brain.company_signals
  ADD COLUMN IF NOT EXISTS embedding vector(768);

-- HNSW index for cosine similarity on signal embeddings
CREATE INDEX IF NOT EXISTS idx_company_signals_embedding_hnsw
  ON equity_brain.company_signals
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 3) Trigger: enfileira signal.embed_pending quando há signal_text e ainda sem embedding
CREATE OR REPLACE FUNCTION equity_brain.trg_enqueue_signal_embed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = equity_brain, public
AS $$
BEGIN
  IF NEW.signal_text IS NOT NULL
     AND length(NEW.signal_text) >= 8
     AND NEW.embedding IS NULL THEN
    INSERT INTO equity_brain.events
      (event_type, entity_type, entity_id, payload, triggered_by)
    VALUES
      ('signal.embed_pending', 'signal', NEW.id::text,
       jsonb_build_object('cnpj', NEW.cnpj, 'signal_key', NEW.signal_key),
       'trigger:signal_insert');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_signal_embed_enqueue ON equity_brain.company_signals;
CREATE TRIGGER trg_signal_embed_enqueue
AFTER INSERT ON equity_brain.company_signals
FOR EACH ROW
EXECUTE FUNCTION equity_brain.trg_enqueue_signal_embed();