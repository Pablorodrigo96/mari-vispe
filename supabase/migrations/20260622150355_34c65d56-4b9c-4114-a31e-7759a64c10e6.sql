CREATE TABLE public.equity_market_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assessment_id uuid REFERENCES public.equity_assessments(id) ON DELETE SET NULL,
  cnpj text,
  razao_social text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','done','error')),
  payload jsonb,
  error_msg text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX equity_market_scans_user_cnpj_idx ON public.equity_market_scans(user_id, cnpj);
CREATE INDEX equity_market_scans_assessment_idx ON public.equity_market_scans(assessment_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.equity_market_scans TO authenticated;
GRANT ALL ON public.equity_market_scans TO service_role;

ALTER TABLE public.equity_market_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own market scans"
  ON public.equity_market_scans
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER equity_market_scans_updated_at
  BEFORE UPDATE ON public.equity_market_scans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();