
-- 1) Permitir deal_documents vinculado a um pair (sem deal individual)
ALTER TABLE public.deal_documents
  ALTER COLUMN deal_id DROP NOT NULL;

ALTER TABLE public.deal_documents
  ADD COLUMN IF NOT EXISTS deal_pair_id uuid REFERENCES public.deal_pairs(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_deal_documents_deal_pair_id
  ON public.deal_documents(deal_pair_id) WHERE deal_pair_id IS NOT NULL;

ALTER TABLE public.deal_documents
  DROP CONSTRAINT IF EXISTS deal_documents_target_chk;

ALTER TABLE public.deal_documents
  ADD CONSTRAINT deal_documents_target_chk
  CHECK (deal_id IS NOT NULL OR deal_pair_id IS NOT NULL);

-- 2) Tabela de rascunhos do NBO Wizard (auto-save por passo)
CREATE TABLE IF NOT EXISTS public.nbo_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_pair_id uuid NOT NULL REFERENCES public.deal_pairs(id) ON DELETE CASCADE,
  template_code text NOT NULL DEFAULT 'legal_nbo_v1',
  current_step integer NOT NULL DEFAULT 1,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_saved_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (deal_pair_id, template_code)
);

CREATE INDEX IF NOT EXISTS idx_nbo_drafts_pair ON public.nbo_drafts(deal_pair_id);

ALTER TABLE public.nbo_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS nbo_drafts_select ON public.nbo_drafts;
CREATE POLICY nbo_drafts_select ON public.nbo_drafts
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'advisor'::app_role)
    OR has_role(auth.uid(), 'legal'::app_role)
    OR created_by = auth.uid()
  );

DROP POLICY IF EXISTS nbo_drafts_write ON public.nbo_drafts;
CREATE POLICY nbo_drafts_write ON public.nbo_drafts
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'advisor'::app_role)
    OR created_by = auth.uid()
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'advisor'::app_role)
    OR created_by = auth.uid()
  );

DROP POLICY IF EXISTS nbo_drafts_service ON public.nbo_drafts;
CREATE POLICY nbo_drafts_service ON public.nbo_drafts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.touch_nbo_drafts_last_saved()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.last_saved_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_nbo_drafts_touch ON public.nbo_drafts;
CREATE TRIGGER trg_nbo_drafts_touch
BEFORE UPDATE ON public.nbo_drafts
FOR EACH ROW EXECUTE FUNCTION public.touch_nbo_drafts_last_saved();
