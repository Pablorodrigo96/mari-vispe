-- Block 3: Backlinks parser extended to support match, listing, daily
CREATE OR REPLACE FUNCTION equity_brain.sync_note_mentions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'equity_brain'
AS $function$
DECLARE
  m text[];
  t_type text;
  t_id text;
BEGIN
  DELETE FROM equity_brain.entity_note_mentions WHERE note_id = NEW.id;

  IF NEW.body_md IS NULL OR length(NEW.body_md) = 0 THEN
    RETURN NEW;
  END IF;

  -- Match: @mandate|buyer|company|match|listing|daily:ID  (|label opcional ignorado)
  FOR m IN
    SELECT regexp_matches(
      NEW.body_md,
      '@(mandate|buyer|company|match|listing|daily):([A-Za-z0-9_\-:.]+)',
      'g'
    )
  LOOP
    t_type := m[1];
    t_id := m[2];
    IF t_type = 'buyer' THEN t_type := 'buyer_ma'; END IF;

    BEGIN
      INSERT INTO equity_brain.entity_note_mentions (note_id, target_entity_type, target_entity_id)
      VALUES (NEW.id, t_type::equity_brain.note_entity_type, t_id)
      ON CONFLICT (note_id, target_entity_type, target_entity_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;

  RETURN NEW;
END;
$function$;

-- Re-parse existing notes (one-time backfill for new types)
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM equity_brain.entity_notes WHERE body_md ~ '@(match|listing|daily):' LOOP
    UPDATE equity_brain.entity_notes SET body_md = body_md WHERE id = r.id;
  END LOOP;
END$$;