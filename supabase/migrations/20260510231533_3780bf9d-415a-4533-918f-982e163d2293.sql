
CREATE TABLE IF NOT EXISTS equity_brain.entity_note_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES equity_brain.entity_notes(id) ON DELETE CASCADE,
  target_entity_type equity_brain.note_entity_type NOT NULL,
  target_entity_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (note_id, target_entity_type, target_entity_id)
);

CREATE INDEX IF NOT EXISTS idx_entity_note_mentions_target
  ON equity_brain.entity_note_mentions (target_entity_type, target_entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_note_mentions_note
  ON equity_brain.entity_note_mentions (note_id);

ALTER TABLE equity_brain.entity_note_mentions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "advisors admins read mentions" ON equity_brain.entity_note_mentions;
CREATE POLICY "advisors admins read mentions"
  ON equity_brain.entity_note_mentions
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'advisor'::public.app_role)
  );

-- Function: extract & sync mentions for a single note
CREATE OR REPLACE FUNCTION equity_brain.sync_note_mentions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, equity_brain
AS $$
DECLARE
  m text[];
  t_type text;
  t_id text;
BEGIN
  -- Delete previous mentions for this note
  DELETE FROM equity_brain.entity_note_mentions WHERE note_id = NEW.id;

  IF NEW.body_md IS NULL OR length(NEW.body_md) = 0 THEN
    RETURN NEW;
  END IF;

  -- Match: @mandate:UUID, @buyer:UUID, @company:CNPJ (optional |label ignored)
  FOR m IN
    SELECT regexp_matches(
      NEW.body_md,
      '@(mandate|buyer|company):([A-Za-z0-9-]+)',
      'g'
    )
  LOOP
    t_type := m[1];
    t_id := m[2];
    -- Map "buyer" → enum "buyer_ma"
    IF t_type = 'buyer' THEN t_type := 'buyer_ma'; END IF;

    BEGIN
      INSERT INTO equity_brain.entity_note_mentions (note_id, target_entity_type, target_entity_id)
      VALUES (NEW.id, t_type::equity_brain.note_entity_type, t_id)
      ON CONFLICT (note_id, target_entity_type, target_entity_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      -- Skip malformed mentions silently
      NULL;
    END;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_note_mentions ON equity_brain.entity_notes;
CREATE TRIGGER trg_sync_note_mentions
AFTER INSERT OR UPDATE OF body_md ON equity_brain.entity_notes
FOR EACH ROW
EXECUTE FUNCTION equity_brain.sync_note_mentions();

-- Backfill mentions from existing notes
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id FROM equity_brain.entity_notes LOOP
    UPDATE equity_brain.entity_notes SET body_md = body_md WHERE id = r.id;
  END LOOP;
END $$;

-- Public view for client consumption (security invoker honors RLS of underlying tables)
DROP VIEW IF EXISTS public.eb_entity_note_mentions;
CREATE VIEW public.eb_entity_note_mentions
WITH (security_invoker = on)
AS
SELECT
  m.id,
  m.note_id,
  m.target_entity_type::text AS target_entity_type,
  m.target_entity_id,
  m.created_at,
  n.entity_type::text AS source_entity_type,
  n.entity_id AS source_entity_id,
  n.title,
  n.visibility::text AS visibility,
  n.pinned,
  n.author_id,
  n.updated_at AS note_updated_at,
  substring(n.body_md FROM 1 FOR 240) AS body_preview
FROM equity_brain.entity_note_mentions m
JOIN equity_brain.entity_notes n ON n.id = m.note_id;

GRANT SELECT ON public.eb_entity_note_mentions TO authenticated;
