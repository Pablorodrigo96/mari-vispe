
ALTER TABLE public.equity_progress_log
  ADD COLUMN IF NOT EXISTS dim_snapshot jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS valor_alvo numeric,
  ADD COLUMN IF NOT EXISTS top_destruidores jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS arquetipo_id text,
  ADD COLUMN IF NOT EXISTS veredito_liquidez text;

ALTER TABLE public.equity_assessments
  ADD COLUMN IF NOT EXISTS parent_assessment_id uuid REFERENCES public.equity_assessments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rodada integer DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_equity_assessments_parent ON public.equity_assessments(parent_assessment_id);
CREATE INDEX IF NOT EXISTS idx_equity_progress_log_company_created ON public.equity_progress_log(company_id, created_at);
