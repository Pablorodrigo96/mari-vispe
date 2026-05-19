
-- Bloco 1.1: Pipeline 12 etapas + benchmark (retrocompatível)
-- Adiciona colunas benchmark/meta em eb_pipeline_stages
ALTER TABLE public.eb_pipeline_stages
  ADD COLUMN IF NOT EXISTS target_days numeric,
  ADD COLUMN IF NOT EXISTS target_hours numeric,
  ADD COLUMN IF NOT EXISTS baseline_days numeric,
  ADD COLUMN IF NOT EXISTS baseline_hours numeric,
  ADD COLUMN IF NOT EXISTS is_v2_only boolean NOT NULL DEFAULT false;

-- Preenche benchmark e meta nas 6 etapas existentes (Match, NBO, DD, SPA, Closing, Closed)
UPDATE public.eb_pipeline_stages SET baseline_days=15, baseline_hours=8,  target_days=7.5, target_hours=4  WHERE key='match';
UPDATE public.eb_pipeline_stages SET baseline_days=5,  baseline_hours=4,  target_days=2.5, target_hours=2  WHERE key='nbo';
UPDATE public.eb_pipeline_stages SET baseline_days=40, baseline_hours=140,target_days=20,  target_hours=70 WHERE key='due_diligence';
UPDATE public.eb_pipeline_stages SET baseline_days=20, baseline_hours=24, target_days=10,  target_hours=12 WHERE key='spa';
UPDATE public.eb_pipeline_stages SET baseline_days=14, baseline_hours=8,  target_days=7,   target_hours=4  WHERE key='closing';
UPDATE public.eb_pipeline_stages SET baseline_days=0,  baseline_hours=0,  target_days=0,   target_hours=0  WHERE key='closed';

-- Reposiciona as 6 etapas existentes para abrir espaço (match=6, nbo=9, dd=10, spa=12, closing=13, closed=14)
UPDATE public.eb_pipeline_stages SET position=6  WHERE key='match';
UPDATE public.eb_pipeline_stages SET position=9  WHERE key='nbo';
UPDATE public.eb_pipeline_stages SET position=10 WHERE key='due_diligence';
UPDATE public.eb_pipeline_stages SET position=12 WHERE key='spa';
UPDATE public.eb_pipeline_stages SET position=13 WHERE key='closing';
UPDATE public.eb_pipeline_stages SET position=14 WHERE key='closed';

-- Insere as 6 novas etapas v2 (flag is_v2_only=true => escondidas até feature flag ligar)
INSERT INTO public.eb_pipeline_stages (key, label, position, sla_days, is_terminal, color, baseline_days, baseline_hours, target_days, target_hours, is_v2_only) VALUES
  ('prospeccao', 'Prospecção',    1, 30, false, 'slate',   30, 50, 15,  25, true),
  ('mandato',    'Mandato',       2,  3, false, 'indigo',   3,  8,  1.5, 4, true),
  ('qna_prelim', 'Q&A Preliminar',3,  3, false, 'sky',      3,  8,  1.5, 4, true),
  ('teaser',     'Teaser',        4,  3, false, 'teal',     3,  2,  1.5, 1, true),
  ('roadshow',   'RoadShow',      5, 15, false, 'fuchsia', 15, 30,  7.5,15, true),
  ('nda',        'NDA',           7,  2, false, 'rose',     2,  2,  1,   1, true),
  ('qna',        'Q&A',           8, 15, false, 'sky',     15, 16,  7.5, 8, true),
  ('negociacoes','Negociações',  11, 20, false, 'amber',   20, 80, 10,  40, true)
ON CONFLICT (key) DO NOTHING;

-- Estende eb_pipeline_transitions com instrumentação SLA (todas nullable)
ALTER TABLE public.eb_pipeline_transitions
  ADD COLUMN IF NOT EXISTS actual_hours numeric,
  ADD COLUMN IF NOT EXISTS target_days numeric,
  ADD COLUMN IF NOT EXISTS target_hours numeric,
  ADD COLUMN IF NOT EXISTS delta_days numeric,
  ADD COLUMN IF NOT EXISTS delta_hours numeric,
  ADD COLUMN IF NOT EXISTS responsible_user_id uuid,
  ADD COLUMN IF NOT EXISTS exit_reason text;

-- Feature flag global (default OFF) — UI lê via api_settings
INSERT INTO public.api_settings (key, value, description)
VALUES ('pipeline_v2_full', 'false', 'Quando true, expõe as 12 etapas v2 (prospeccao..spa) no Kanban e relatórios. Default false.')
ON CONFLICT (key) DO NOTHING;

-- View consolidada de SLA por transição (lê benchmark/meta da própria stages)
CREATE OR REPLACE VIEW public.deal_sla_report AS
SELECT
  t.id              AS transition_id,
  t.mandate_id,
  t.from_stage,
  t.to_stage,
  t.moved_at,
  t.moved_by,
  t.time_in_previous_stage_seconds,
  ROUND((COALESCE(t.time_in_previous_stage_seconds,0)::numeric / 86400.0)::numeric, 2) AS actual_days,
  ROUND((COALESCE(t.time_in_previous_stage_seconds,0)::numeric / 3600.0 )::numeric, 2) AS actual_hours_calc,
  s.target_days,
  s.target_hours,
  s.baseline_days,
  s.baseline_hours,
  ROUND((COALESCE(t.time_in_previous_stage_seconds,0)::numeric / 86400.0) - COALESCE(s.target_days,0), 2)  AS delta_target_days,
  ROUND((COALESCE(t.time_in_previous_stage_seconds,0)::numeric / 3600.0)  - COALESCE(s.target_hours,0), 2) AS delta_target_hours,
  t.exit_reason,
  t.responsible_user_id
FROM public.eb_pipeline_transitions t
LEFT JOIN public.eb_pipeline_stages s ON s.key = t.from_stage
WHERE t.from_stage IS NOT NULL;

GRANT SELECT ON public.deal_sla_report TO authenticated;
