
-- 1) deal_documents.visible_to_buyer
ALTER TABLE public.deal_documents
  ADD COLUMN IF NOT EXISTS visible_to_buyer boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_deal_documents_visible_to_buyer
  ON public.deal_documents (deal_id) WHERE visible_to_buyer = true;

-- 2) RPC buyer_has_signed_nda
CREATE OR REPLACE FUNCTION public.buyer_has_signed_nda(p_deal_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.deal_documents d
    WHERE d.deal_id = p_deal_id
      AND d.category = 'nda'
      AND d.status = 'signed'
      AND d.uploaded_by = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.buyer_has_signed_nda(uuid) TO authenticated;

-- 3) Update eb_can_view_identity to accept p_deal_id and check NDA
CREATE OR REPLACE FUNCTION public.eb_can_view_identity(
  p_cnpj varchar DEFAULT NULL,
  p_listing uuid DEFAULT NULL,
  p_deal_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, equity_brain
AS $$
DECLARE v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RETURN false; END IF;
  IF public.has_role(v_user,'admin'::app_role)
     OR public.has_role(v_user,'advisor'::app_role)
     OR public.has_role(v_user,'legal'::app_role) THEN RETURN true; END IF;
  IF p_listing IS NOT NULL AND EXISTS (
       SELECT 1 FROM public.listings WHERE id = p_listing AND user_id = v_user
     ) THEN RETURN true; END IF;
  IF EXISTS (
    SELECT 1 FROM equity_brain.disclosure_grants g
    WHERE g.granted_to = v_user
      AND g.revoked_at IS NULL
      AND g.expires_at > now()
      AND ((p_cnpj IS NOT NULL AND g.target_cnpj = p_cnpj)
        OR (p_listing IS NOT NULL AND g.target_listing_id = p_listing))
  ) THEN RETURN true; END IF;
  -- Buyer with active deal access AND signed NDA
  IF p_deal_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.buyer_deal_access bda
    WHERE bda.deal_id = p_deal_id
      AND bda.buyer_user_id = v_user
      AND bda.revoked_at IS NULL
  ) AND public.buyer_has_signed_nda(p_deal_id) THEN
    RETURN true;
  END IF;
  RETURN false;
END $$;

-- 4) buyer_deal_access table
CREATE TABLE IF NOT EXISTS public.buyer_deal_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL,
  buyer_user_id uuid NOT NULL,
  access_level text NOT NULL DEFAULT 'teaser' CHECK (access_level IN ('teaser','full')),
  granted_by uuid,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revoked_by uuid,
  note text,
  UNIQUE (deal_id, buyer_user_id)
);

CREATE INDEX IF NOT EXISTS idx_buyer_deal_access_buyer
  ON public.buyer_deal_access (buyer_user_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_buyer_deal_access_deal
  ON public.buyer_deal_access (deal_id) WHERE revoked_at IS NULL;

ALTER TABLE public.buyer_deal_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "buyer_deal_access_select_admin_advisor"
  ON public.buyer_deal_access FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(),'admin'::app_role)
    OR has_role(auth.uid(),'advisor'::app_role)
    OR has_role(auth.uid(),'legal'::app_role)
    OR has_role(auth.uid(),'observer'::app_role)
    OR buyer_user_id = auth.uid()
  );

CREATE POLICY "buyer_deal_access_insert_admin_advisor"
  ON public.buyer_deal_access FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(),'admin'::app_role)
    OR has_role(auth.uid(),'advisor'::app_role)
  );

CREATE POLICY "buyer_deal_access_update_admin_advisor"
  ON public.buyer_deal_access FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(),'admin'::app_role)
    OR has_role(auth.uid(),'advisor'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(),'admin'::app_role)
    OR has_role(auth.uid(),'advisor'::app_role)
  );

CREATE POLICY "buyer_deal_access_delete_admin"
  ON public.buyer_deal_access FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role));

-- 5) Trigger: when a deal_documents NDA gets signed → audit_events
CREATE OR REPLACE FUNCTION public.fn_audit_nda_signed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.category = 'nda'
     AND NEW.status = 'signed'
     AND (OLD.status IS DISTINCT FROM 'signed')
  THEN
    INSERT INTO public.audit_events (
      event_type, entity_type, entity_id, deal_id,
      actor_user_id, payload
    ) VALUES (
      'nda_signed', 'deal_document', NEW.id, NEW.deal_id,
      COALESCE(NEW.uploaded_by, auth.uid()),
      jsonb_build_object(
        'template_code', NEW.template_code,
        'signed_at', NEW.signed_at,
        'signed_by', NEW.signed_by
      )
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_deal_documents_nda_signed ON public.deal_documents;
CREATE TRIGGER trg_deal_documents_nda_signed
  AFTER UPDATE OF status ON public.deal_documents
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_nda_signed();

-- 6) buyer_deal_room view
CREATE OR REPLACE VIEW public.buyer_deal_room
WITH (security_invoker = true) AS
SELECT
  d.id AS deal_id,
  d.cnpj,
  d.stage,
  d.outcome,
  d.created_at AS deal_created_at,
  d.last_moved_at AS deal_last_moved_at,
  bda.buyer_user_id,
  bda.access_level,
  bda.granted_at,
  public.buyer_has_signed_nda(d.id) AS nda_signed,
  public.eb_can_view_identity(d.cnpj::varchar, NULL, d.id) AS can_view_identity
FROM equity_brain.deals d
JOIN public.buyer_deal_access bda ON bda.deal_id = d.id
WHERE bda.revoked_at IS NULL
  AND (
    bda.buyer_user_id = auth.uid()
    OR has_role(auth.uid(),'admin'::app_role)
    OR has_role(auth.uid(),'advisor'::app_role)
    OR has_role(auth.uid(),'legal'::app_role)
    OR has_role(auth.uid(),'observer'::app_role)
  );

GRANT SELECT ON public.buyer_deal_room TO authenticated;
