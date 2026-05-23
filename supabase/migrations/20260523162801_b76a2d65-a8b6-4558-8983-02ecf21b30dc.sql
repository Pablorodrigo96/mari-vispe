
ALTER TABLE public.deal_documents
  ADD COLUMN IF NOT EXISTS critique_score numeric,
  ADD COLUMN IF NOT EXISTS critique_errors jsonb,
  ADD COLUMN IF NOT EXISTS critique_passed boolean;
