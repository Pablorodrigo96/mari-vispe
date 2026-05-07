-- Investor simulator attempts
CREATE TABLE public.investor_sim_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  abandoned boolean NOT NULL DEFAULT false,
  total_questions int NOT NULL DEFAULT 0,
  complete_count int NOT NULL DEFAULT 0,
  partial_count int NOT NULL DEFAULT 0,
  noinfo_count int NOT NULL DEFAULT 0,
  score int NOT NULL DEFAULT 0,
  score_final int NOT NULL DEFAULT 0,
  classification text,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb
);

ALTER TABLE public.investor_sim_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users insert own investor attempts"
  ON public.investor_sim_attempts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users update own investor attempts"
  ON public.investor_sim_attempts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "users select own investor attempts"
  ON public.investor_sim_attempts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "admins select all investor attempts"
  ON public.investor_sim_attempts FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_investor_sim_user_created ON public.investor_sim_attempts(user_id, created_at DESC);

-- Due diligence audits
CREATE TABLE public.due_diligence_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_items int NOT NULL DEFAULT 0,
  yes_count int NOT NULL DEFAULT 0,
  score_pct numeric NOT NULL DEFAULT 0,
  classification text,
  completed boolean NOT NULL DEFAULT false
);

ALTER TABLE public.due_diligence_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users insert own dd audits"
  ON public.due_diligence_audits FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users update own dd audits"
  ON public.due_diligence_audits FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "users select own dd audits"
  ON public.due_diligence_audits FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "users delete own dd audits"
  ON public.due_diligence_audits FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "admins select all dd audits"
  ON public.due_diligence_audits FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_dd_audits_user_created ON public.due_diligence_audits(user_id, created_at DESC);

CREATE TRIGGER update_dd_audits_updated_at
  BEFORE UPDATE ON public.due_diligence_audits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();