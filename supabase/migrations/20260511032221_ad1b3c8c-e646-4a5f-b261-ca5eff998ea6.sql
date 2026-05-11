
-- =========================================================================
-- BLOCO 1: Gap fix — colunas faltantes que claude-classify-thesis tenta gravar
-- =========================================================================

ALTER TABLE equity_brain.opportunities_ready
  ADD COLUMN IF NOT EXISTS ai_thesis_summary text,
  ADD COLUMN IF NOT EXISTS ai_confidence numeric;

ALTER TABLE equity_brain.matches
  ADD COLUMN IF NOT EXISTS ai_thesis_summary text,
  ADD COLUMN IF NOT EXISTS ai_confidence numeric;

-- =========================================================================
-- BLOCO 2: Delta schema em entity_notes
-- =========================================================================

ALTER TABLE equity_brain.entity_notes
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_ref_id text,
  ADD COLUMN IF NOT EXISTS section_order int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS version int NOT NULL DEFAULT 1;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'equity_brain.entity_notes'::regclass
      AND conname = 'entity_notes_source_chk'
  ) THEN
    ALTER TABLE equity_brain.entity_notes
      ADD CONSTRAINT entity_notes_source_chk
      CHECK (source IN ('manual','ai_pitch','ai_thesis','ai_call','template'));
  END IF;
END $$;

-- entity_type enum: garantir 'match' e 'listing' se aplicável
DO $$
DECLARE
  enum_oid oid;
  ns text;
  tn text;
BEGIN
  SELECT t.oid, n.nspname, t.typname
    INTO enum_oid, ns, tn
  FROM pg_type t
  JOIN pg_namespace n ON n.oid = t.typnamespace
  JOIN pg_attribute a ON a.atttypid = t.oid
  WHERE a.attrelid = 'equity_brain.entity_notes'::regclass
    AND a.attname = 'entity_type'
    AND t.typtype = 'e';

  IF enum_oid IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = enum_oid AND enumlabel = 'match') THEN
      EXECUTE format('ALTER TYPE %I.%I ADD VALUE IF NOT EXISTS %L', ns, tn, 'match');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = enum_oid AND enumlabel = 'listing') THEN
      EXECUTE format('ALTER TYPE %I.%I ADD VALUE IF NOT EXISTS %L', ns, tn, 'listing');
    END IF;
  END IF;
END $$;

-- Trigger leve de versionamento
CREATE OR REPLACE FUNCTION equity_brain.tg_entity_notes_bump_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, equity_brain
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.body_md IS DISTINCT FROM NEW.body_md THEN
    NEW.version := COALESCE(OLD.version, 1) + 1;
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS entity_notes_bump_version_trigger ON equity_brain.entity_notes;
CREATE TRIGGER entity_notes_bump_version_trigger
BEFORE UPDATE ON equity_brain.entity_notes
FOR EACH ROW
EXECUTE FUNCTION equity_brain.tg_entity_notes_bump_version();

-- Unique parcial para notas IA (1 por entidade/source)
CREATE UNIQUE INDEX IF NOT EXISTS uq_entity_notes_ai_one_per_entity
  ON equity_brain.entity_notes (entity_type, entity_id, source)
  WHERE source IN ('ai_thesis', 'ai_pitch', 'ai_call');

-- =========================================================================
-- BLOCO 8: Triggers Claude → entity_notes
-- =========================================================================

CREATE OR REPLACE FUNCTION equity_brain.upsert_ai_note(
  p_entity_type text,
  p_entity_id   text,
  p_source      text,
  p_title       text,
  p_body_md     text,
  p_source_ref  text DEFAULT NULL,
  p_pinned      boolean DEFAULT false
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, equity_brain
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_body_md IS NULL OR length(trim(p_body_md)) = 0 THEN
    RETURN NULL;
  END IF;

  INSERT INTO equity_brain.entity_notes (
    entity_type, entity_id, author_id, title, body_md,
    visibility, pinned, tags, source, source_ref_id
  ) VALUES (
    p_entity_type::text::equity_brain.note_entity_type,
    p_entity_id, NULL,
    p_title, p_body_md,
    'internal', p_pinned, ARRAY[]::text[],
    p_source, p_source_ref
  )
  ON CONFLICT (entity_type, entity_id, source)
    WHERE source IN ('ai_thesis', 'ai_pitch', 'ai_call')
  DO UPDATE SET
    title         = EXCLUDED.title,
    body_md       = EXCLUDED.body_md,
    source_ref_id = EXCLUDED.source_ref_id,
    pinned        = EXCLUDED.pinned OR equity_brain.entity_notes.pinned,
    updated_at    = now()
  RETURNING id INTO v_id;

  RETURN v_id;
EXCEPTION WHEN undefined_object THEN
  -- entity_type não é enum, retry sem cast
  INSERT INTO equity_brain.entity_notes (
    entity_type, entity_id, author_id, title, body_md,
    visibility, pinned, tags, source, source_ref_id
  ) VALUES (
    p_entity_type, p_entity_id, NULL,
    p_title, p_body_md,
    'internal', p_pinned, ARRAY[]::text[],
    p_source, p_source_ref
  )
  ON CONFLICT (entity_type, entity_id, source)
    WHERE source IN ('ai_thesis', 'ai_pitch', 'ai_call')
  DO UPDATE SET
    title         = EXCLUDED.title,
    body_md       = EXCLUDED.body_md,
    source_ref_id = EXCLUDED.source_ref_id,
    pinned        = EXCLUDED.pinned OR equity_brain.entity_notes.pinned,
    updated_at    = now()
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Trigger A: opportunities_ready.ai_thesis_summary → nota pinned
CREATE OR REPLACE FUNCTION equity_brain.tg_opp_thesis_to_note()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, equity_brain
AS $$
BEGIN
  IF NEW.ai_thesis_summary IS NULL
     OR length(trim(NEW.ai_thesis_summary)) = 0
     OR (TG_OP = 'UPDATE' AND NEW.ai_thesis_summary IS NOT DISTINCT FROM OLD.ai_thesis_summary)
  THEN
    RETURN NEW;
  END IF;
  IF NEW.cnpj IS NULL THEN RETURN NEW; END IF;

  PERFORM equity_brain.upsert_ai_note(
    'company',
    NEW.cnpj::text,
    'ai_thesis',
    'Tese sugerida pela Mari',
    NEW.ai_thesis_summary,
    NULL,
    true
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS opp_thesis_to_note_trigger ON equity_brain.opportunities_ready;
CREATE TRIGGER opp_thesis_to_note_trigger
AFTER INSERT OR UPDATE OF ai_thesis_summary ON equity_brain.opportunities_ready
FOR EACH ROW
EXECUTE FUNCTION equity_brain.tg_opp_thesis_to_note();

-- Trigger B1: matches.ai_pitch → nota
CREATE OR REPLACE FUNCTION equity_brain.tg_match_pitch_to_note()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, equity_brain
AS $$
BEGIN
  IF NEW.ai_pitch IS NULL
     OR length(trim(NEW.ai_pitch)) = 0
     OR (TG_OP = 'UPDATE' AND NEW.ai_pitch IS NOT DISTINCT FROM OLD.ai_pitch)
  THEN
    RETURN NEW;
  END IF;

  PERFORM equity_brain.upsert_ai_note(
    'match',
    NEW.id::text,
    'ai_pitch',
    'Pitch gerado pela Mari',
    NEW.ai_pitch,
    NULL,
    false
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS match_pitch_to_note_trigger ON equity_brain.matches;
CREATE TRIGGER match_pitch_to_note_trigger
AFTER INSERT OR UPDATE OF ai_pitch ON equity_brain.matches
FOR EACH ROW
EXECUTE FUNCTION equity_brain.tg_match_pitch_to_note();

-- Trigger B2: opportunities_ready.ai_pitch → nota na empresa
CREATE OR REPLACE FUNCTION equity_brain.tg_opp_pitch_to_note()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, equity_brain
AS $$
BEGIN
  IF NEW.ai_pitch IS NULL
     OR length(trim(NEW.ai_pitch)) = 0
     OR (TG_OP = 'UPDATE' AND NEW.ai_pitch IS NOT DISTINCT FROM OLD.ai_pitch)
  THEN
    RETURN NEW;
  END IF;
  IF NEW.cnpj IS NULL THEN RETURN NEW; END IF;

  PERFORM equity_brain.upsert_ai_note(
    'company',
    NEW.cnpj::text,
    'ai_pitch',
    'Pitch gerado pela Mari',
    NEW.ai_pitch,
    NULL,
    false
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS opp_pitch_to_note_trigger ON equity_brain.opportunities_ready;
CREATE TRIGGER opp_pitch_to_note_trigger
AFTER INSERT OR UPDATE OF ai_pitch ON equity_brain.opportunities_ready
FOR EACH ROW
EXECUTE FUNCTION equity_brain.tg_opp_pitch_to_note();

-- Trigger C: ai_runs (claude-analyze-call) → nota
CREATE OR REPLACE FUNCTION equity_brain.tg_ai_call_to_note()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, equity_brain
AS $$
DECLARE
  v_summary text;
  v_next text;
  v_temp text;
  v_body text;
  v_et text;
  v_eid text;
BEGIN
  IF NEW.function_name IS DISTINCT FROM 'claude-analyze-call'
     AND NEW.function_name IS DISTINCT FROM 'analyze_call' THEN
    RETURN NEW;
  END IF;
  IF NEW.status IS NOT NULL AND NEW.status NOT IN ('success','ok','completed') THEN
    RETURN NEW;
  END IF;
  IF NEW.parsed_output IS NULL THEN RETURN NEW; END IF;

  v_summary := COALESCE(NEW.parsed_output->>'summary', NEW.parsed_output->>'resumo', '');
  v_next    := COALESCE(NEW.parsed_output->>'next_steps', NEW.parsed_output->>'proximos_passos', '');
  v_temp    := COALESCE(NEW.parsed_output->>'temperature', NEW.parsed_output->>'temperatura', '');

  v_body := '';
  IF v_temp <> '' THEN v_body := v_body || '**Temperatura:** ' || v_temp || E'\n\n'; END IF;
  IF v_summary <> '' THEN v_body := v_body || '## Resumo' || E'\n' || v_summary || E'\n\n'; END IF;
  IF v_next <> '' THEN v_body := v_body || '## Próximos passos' || E'\n' || v_next; END IF;

  IF length(trim(v_body)) = 0 THEN RETURN NEW; END IF;

  -- Resolver entidade: cnpj → company; match_id → match; buyer_id → buyer
  IF NEW.cnpj IS NOT NULL THEN
    v_et := 'company'; v_eid := NEW.cnpj;
  ELSIF NEW.match_id IS NOT NULL THEN
    v_et := 'match'; v_eid := NEW.match_id::text;
  ELSIF NEW.buyer_id IS NOT NULL THEN
    v_et := 'buyer'; v_eid := NEW.buyer_id::text;
  ELSE
    RETURN NEW;
  END IF;

  PERFORM equity_brain.upsert_ai_note(
    v_et,
    v_eid,
    'ai_call',
    'Análise de call · Mari',
    v_body,
    NEW.id::text,
    false
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ai_call_to_note_trigger ON equity_brain.ai_runs;
CREATE TRIGGER ai_call_to_note_trigger
AFTER INSERT ON equity_brain.ai_runs
FOR EACH ROW
EXECUTE FUNCTION equity_brain.tg_ai_call_to_note();
