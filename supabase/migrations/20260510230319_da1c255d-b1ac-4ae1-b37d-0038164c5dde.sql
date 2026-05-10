
CREATE SCHEMA IF NOT EXISTS equity_brain;

DO $$ BEGIN
  CREATE TYPE equity_brain.note_entity_type AS ENUM ('mandate','buyer_ma','company');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE equity_brain.note_visibility AS ENUM ('internal','public');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS equity_brain.entity_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type equity_brain.note_entity_type NOT NULL,
  entity_id  text NOT NULL,
  author_id  uuid NOT NULL,
  title      text,
  body_md    text NOT NULL DEFAULT '',
  visibility equity_brain.note_visibility NOT NULL DEFAULT 'internal',
  pinned     boolean NOT NULL DEFAULT false,
  tags       text[]  NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  body_tsv   tsvector GENERATED ALWAYS AS (to_tsvector('portuguese', coalesce(title,'') || ' ' || coalesce(body_md,''))) STORED
);

CREATE INDEX IF NOT EXISTS entity_notes_entity_idx
  ON equity_brain.entity_notes (entity_type, entity_id, pinned DESC, updated_at DESC);
CREATE INDEX IF NOT EXISTS entity_notes_tags_idx
  ON equity_brain.entity_notes USING gin (tags);
CREATE INDEX IF NOT EXISTS entity_notes_tsv_idx
  ON equity_brain.entity_notes USING gin (body_tsv);
CREATE INDEX IF NOT EXISTS entity_notes_author_idx
  ON equity_brain.entity_notes (author_id);

CREATE OR REPLACE FUNCTION equity_brain.entity_notes_touch()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_entity_notes_touch ON equity_brain.entity_notes;
CREATE TRIGGER trg_entity_notes_touch
  BEFORE UPDATE ON equity_brain.entity_notes
  FOR EACH ROW EXECUTE FUNCTION equity_brain.entity_notes_touch();

ALTER TABLE equity_brain.entity_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notes_select ON equity_brain.entity_notes;
CREATE POLICY notes_select ON equity_brain.entity_notes
  FOR SELECT TO authenticated
  USING (
    visibility = 'public'
    OR has_role(auth.uid(), 'advisor'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR author_id = auth.uid()
  );

DROP POLICY IF EXISTS notes_insert ON equity_brain.entity_notes;
CREATE POLICY notes_insert ON equity_brain.entity_notes
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND (
      has_role(auth.uid(), 'advisor'::app_role)
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  );

DROP POLICY IF EXISTS notes_update ON equity_brain.entity_notes;
CREATE POLICY notes_update ON equity_brain.entity_notes
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (author_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS notes_delete ON equity_brain.entity_notes;
CREATE POLICY notes_delete ON equity_brain.entity_notes
  FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE VIEW public.eb_entity_notes
WITH (security_invoker = on)
AS
SELECT
  id, entity_type::text AS entity_type, entity_id, author_id,
  title, body_md, visibility::text AS visibility, pinned, tags,
  created_at, updated_at
FROM equity_brain.entity_notes;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.eb_entity_notes TO authenticated;

-- Seed legacy (idempotente)
DO $$
DECLARE
  v_author uuid;
BEGIN
  SELECT user_id INTO v_author FROM public.user_roles WHERE role='admin'::app_role LIMIT 1;
  IF v_author IS NULL THEN
    SELECT user_id INTO v_author FROM public.user_roles WHERE role='advisor'::app_role LIMIT 1;
  END IF;
  IF v_author IS NULL THEN
    RAISE NOTICE 'Sem admin/advisor — pulando seed legacy';
    RETURN;
  END IF;

  INSERT INTO equity_brain.entity_notes (entity_type, entity_id, author_id, title, body_md, pinned, tags)
  SELECT 'mandate', m.id::text, v_author, 'Observações migradas', m.observacoes, true, ARRAY['legado']
  FROM equity_brain.mandates m
  WHERE coalesce(trim(m.observacoes), '') <> ''
    AND NOT EXISTS (
      SELECT 1 FROM equity_brain.entity_notes n
      WHERE n.entity_type='mandate' AND n.entity_id = m.id::text AND 'legado' = ANY(n.tags)
    );

  INSERT INTO equity_brain.entity_notes (entity_type, entity_id, author_id, title, body_md, pinned, tags)
  SELECT 'buyer_ma', b.id::text, v_author,
         CASE WHEN coalesce(b.cautela_motivo,'') <> '' THEN 'Notas migradas (inclui cautela)' ELSE 'Observações migradas' END,
         coalesce(b.observacoes,'') ||
           CASE WHEN coalesce(b.cautela_motivo,'') <> ''
                THEN E'\n\n**⚠️ Cautela:** ' || b.cautela_motivo
                ELSE '' END,
         true,
         CASE WHEN coalesce(b.cautela_motivo,'') <> '' THEN ARRAY['legado','cautela'] ELSE ARRAY['legado'] END
  FROM equity_brain.buyers b
  WHERE (coalesce(trim(b.observacoes),'') <> '' OR coalesce(trim(b.cautela_motivo),'') <> '')
    AND NOT EXISTS (
      SELECT 1 FROM equity_brain.entity_notes n
      WHERE n.entity_type='buyer_ma' AND n.entity_id = b.id::text AND 'legado' = ANY(n.tags)
    );

  INSERT INTO equity_brain.entity_notes (entity_type, entity_id, author_id, title, body_md, pinned, tags)
  SELECT 'company', c.cnpj, v_author, 'Notas migradas', c.raw_data->>'notas', true, ARRAY['legado']
  FROM equity_brain.companies c
  WHERE coalesce(trim(c.raw_data->>'notas'),'') <> ''
    AND NOT EXISTS (
      SELECT 1 FROM equity_brain.entity_notes n
      WHERE n.entity_type='company' AND n.entity_id = c.cnpj AND 'legado' = ANY(n.tags)
    );
END $$;
