
CREATE OR REPLACE FUNCTION equity_brain.tg_track_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = equity_brain, public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (OLD.pipeline_stage IS DISTINCT FROM NEW.pipeline_stage OR OLD.outcome IS DISTINCT FROM NEW.outcome) THEN
    BEGIN
      INSERT INTO equity_brain.crm_activities
        (entity_type, entity_id, kind, body, created_by, metadata)
      VALUES
        ('mandate', NEW.id, 'note',
         'Status: '||COALESCE(OLD.outcome::text,'-')||' → '||COALESCE(NEW.outcome::text,'-')
          ||' / Estágio: '||COALESCE(OLD.pipeline_stage::text,'-')||' → '||COALESCE(NEW.pipeline_stage::text,'-'),
         auth.uid(),
         jsonb_build_object('source','tg_track_stage_change'));
    EXCEPTION WHEN OTHERS THEN
      -- não bloquear update do mandato se log falhar
      NULL;
    END;
    NEW.stage_changed_at := now();
  END IF;
  RETURN NEW;
END $$;
