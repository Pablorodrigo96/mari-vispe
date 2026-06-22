
-- ============ DEEPDIVE ============
CREATE TABLE public.equity_initiative_deepdive (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id uuid NOT NULL UNIQUE REFERENCES public.equity_initiatives(id) ON DELETE CASCADE,
  assessment_id uuid NOT NULL REFERENCES public.equity_assessments(id) ON DELETE CASCADE,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  compiled_prompt text,
  status text NOT NULL DEFAULT 'pendente',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.equity_initiative_deepdive TO authenticated;
GRANT ALL ON public.equity_initiative_deepdive TO service_role;

ALTER TABLE public.equity_initiative_deepdive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deepdive follow assessment"
ON public.equity_initiative_deepdive
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.equity_assessments a
  WHERE a.id = equity_initiative_deepdive.assessment_id
    AND (a.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'advisor'::app_role))
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.equity_assessments a
  WHERE a.id = equity_initiative_deepdive.assessment_id
    AND (a.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'advisor'::app_role))
));

CREATE TRIGGER trg_eq_deepdive_upd
BEFORE UPDATE ON public.equity_initiative_deepdive
FOR EACH ROW EXECUTE FUNCTION public.equity_set_updated_at();

CREATE INDEX idx_eq_deepdive_assess ON public.equity_initiative_deepdive(assessment_id);

-- ============ ANNUAL PLAN ============
CREATE TABLE public.equity_annual_plan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL UNIQUE REFERENCES public.equity_assessments(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  plan_data jsonb NOT NULL,
  source_prompts jsonb,
  model_used text,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.equity_annual_plan TO authenticated;
GRANT ALL ON public.equity_annual_plan TO service_role;

ALTER TABLE public.equity_annual_plan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Annual plan follow assessment"
ON public.equity_annual_plan
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.equity_assessments a
  WHERE a.id = equity_annual_plan.assessment_id
    AND (a.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'advisor'::app_role))
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.equity_assessments a
  WHERE a.id = equity_annual_plan.assessment_id
    AND (a.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'advisor'::app_role))
));

CREATE TRIGGER trg_eq_annual_plan_upd
BEFORE UPDATE ON public.equity_annual_plan
FOR EACH ROW EXECUTE FUNCTION public.equity_set_updated_at();

CREATE INDEX idx_eq_annual_plan_assess ON public.equity_annual_plan(assessment_id);
