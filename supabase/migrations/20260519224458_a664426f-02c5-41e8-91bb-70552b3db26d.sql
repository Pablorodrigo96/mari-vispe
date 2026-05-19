CREATE TABLE IF NOT EXISTS public.deal_qa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL,
  buyer_user_id uuid NOT NULL,
  author_user_id uuid NOT NULL,
  author_role text NOT NULL CHECK (author_role IN ('buyer','advisor','admin','legal')),
  question text NOT NULL,
  answer text,
  answered_at timestamptz,
  answered_by uuid,
  parent_id uuid REFERENCES public.deal_qa(id) ON DELETE CASCADE,
  visible_to_buyer boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deal_qa_deal ON public.deal_qa(deal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deal_qa_buyer ON public.deal_qa(buyer_user_id);

ALTER TABLE public.deal_qa ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_deal_qa_updated_at ON public.deal_qa;
CREATE TRIGGER trg_deal_qa_updated_at
BEFORE UPDATE ON public.deal_qa
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.buyer_has_active_access(p_deal_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.buyer_deal_access
    WHERE deal_id = p_deal_id
      AND buyer_user_id = p_user_id
      AND revoked_at IS NULL
  );
$$;

CREATE POLICY "deal_qa_select_eb_staff"
ON public.deal_qa FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'advisor'::app_role)
  OR has_role(auth.uid(), 'legal'::app_role)
  OR has_role(auth.uid(), 'observer'::app_role)
);

CREATE POLICY "deal_qa_select_buyer_own"
ON public.deal_qa FOR SELECT TO authenticated
USING (buyer_user_id = auth.uid() AND visible_to_buyer = true);

CREATE POLICY "deal_qa_insert_buyer"
ON public.deal_qa FOR INSERT TO authenticated
WITH CHECK (
  author_user_id = auth.uid()
  AND author_role = 'buyer'
  AND buyer_user_id = auth.uid()
  AND public.buyer_has_active_access(deal_id, auth.uid())
);

CREATE POLICY "deal_qa_insert_staff"
ON public.deal_qa FOR INSERT TO authenticated
WITH CHECK (
  author_user_id = auth.uid()
  AND author_role IN ('advisor','admin','legal')
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'advisor'::app_role)
    OR has_role(auth.uid(), 'legal'::app_role)
  )
);

CREATE POLICY "deal_qa_update_staff"
ON public.deal_qa FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'advisor'::app_role)
  OR has_role(auth.uid(), 'legal'::app_role)
);

CREATE POLICY "deal_qa_delete_admin"
ON public.deal_qa FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));