
CREATE TABLE IF NOT EXISTS public.eb_pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  color text NOT NULL DEFAULT 'zinc',
  position integer NOT NULL DEFAULT 0,
  sla_days integer NOT NULL DEFAULT 14,
  is_terminal boolean NOT NULL DEFAULT false,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_eb_pipeline_stages_position
  ON public.eb_pipeline_stages(position) WHERE archived_at IS NULL;

ALTER TABLE public.eb_pipeline_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view stages"
  ON public.eb_pipeline_stages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert stages"
  ON public.eb_pipeline_stages FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update stages"
  ON public.eb_pipeline_stages FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete stages"
  ON public.eb_pipeline_stages FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.eb_pipeline_stages (key, label, color, position, sla_days, is_terminal) VALUES
  ('match',         'Match',          'blue',     1, 7,  false),
  ('nbo',           'NBO',            'cyan',     2, 14, false),
  ('due_diligence', 'Due Diligence',  'amber',    3, 30, false),
  ('spa',           'SPA',            'purple',   4, 21, false),
  ('closing',       'Closing',        'orange',   5, 14, false),
  ('closed',        'Closed',         'emerald',  6, 0,  true)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.eb_pipeline_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mandate_id uuid NOT NULL,
  from_stage text,
  to_stage text,
  from_outcome text,
  to_outcome text,
  moved_by uuid,
  moved_at timestamptz NOT NULL DEFAULT now(),
  time_in_previous_stage_seconds bigint,
  note text
);
CREATE INDEX IF NOT EXISTS idx_eb_transitions_mandate
  ON public.eb_pipeline_transitions(mandate_id, moved_at DESC);
CREATE INDEX IF NOT EXISTS idx_eb_transitions_moved_at
  ON public.eb_pipeline_transitions(moved_at DESC);

ALTER TABLE public.eb_pipeline_transitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view transitions"
  ON public.eb_pipeline_transitions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage transitions"
  ON public.eb_pipeline_transitions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.eb_log_pipeline_transition()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, equity_brain
AS $$
DECLARE v_elapsed bigint; v_changed boolean := false;
BEGIN
  IF NEW.pipeline_stage IS DISTINCT FROM OLD.pipeline_stage
     OR NEW.outcome IS DISTINCT FROM OLD.outcome THEN
    v_changed := true;
  END IF;
  IF NOT v_changed THEN RETURN NEW; END IF;

  v_elapsed := EXTRACT(EPOCH FROM (now() - COALESCE(OLD.stage_changed_at, OLD.updated_at, OLD.created_at, now())))::bigint;

  INSERT INTO public.eb_pipeline_transitions(
    mandate_id, from_stage, to_stage, from_outcome, to_outcome,
    moved_by, moved_at, time_in_previous_stage_seconds
  ) VALUES (
    NEW.id, OLD.pipeline_stage::text, NEW.pipeline_stage::text,
    OLD.outcome::text, NEW.outcome::text,
    auth.uid(), now(), GREATEST(v_elapsed, 0)
  );

  IF NEW.pipeline_stage IS DISTINCT FROM OLD.pipeline_stage THEN
    NEW.stage_changed_at := now();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_eb_log_pipeline_transition ON equity_brain.mandates;
CREATE TRIGGER trg_eb_log_pipeline_transition
BEFORE UPDATE ON equity_brain.mandates
FOR EACH ROW EXECUTE FUNCTION public.eb_log_pipeline_transition();

CREATE OR REPLACE FUNCTION public.eb_pipeline_stages_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_eb_pipeline_stages_updated ON public.eb_pipeline_stages;
CREATE TRIGGER trg_eb_pipeline_stages_updated
BEFORE UPDATE ON public.eb_pipeline_stages
FOR EACH ROW EXECUTE FUNCTION public.eb_pipeline_stages_set_updated_at();
