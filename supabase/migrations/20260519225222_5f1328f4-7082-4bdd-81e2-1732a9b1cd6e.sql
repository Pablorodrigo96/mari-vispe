
-- 1. Buyer SELECT em deal_documents quando visible_to_buyer e tem acesso ativo
CREATE POLICY "deal_documents_select_buyer"
ON public.deal_documents
FOR SELECT
TO authenticated
USING (
  visible_to_buyer = true
  AND public.buyer_has_active_access(deal_id, auth.uid())
);

-- 2. Storage bucket deal-documents: buyer pode baixar quando doc é visível
-- Path convention: {deal_id}/...
CREATE POLICY "deal_documents_storage_select_staff"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'deal-documents'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'advisor'::app_role)
    OR has_role(auth.uid(), 'legal'::app_role)
    OR has_role(auth.uid(), 'observer'::app_role)
  )
);

CREATE POLICY "deal_documents_storage_select_buyer"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'deal-documents'
  AND EXISTS (
    SELECT 1 FROM public.deal_documents dd
    WHERE dd.storage_path = storage.objects.name
      AND dd.visible_to_buyer = true
      AND public.buyer_has_active_access(dd.deal_id, auth.uid())
  )
);

CREATE POLICY "deal_documents_storage_write_staff"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'deal-documents'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'advisor'::app_role)
    OR has_role(auth.uid(), 'legal'::app_role)
  )
);

CREATE POLICY "deal_documents_storage_update_staff"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'deal-documents'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'advisor'::app_role)
    OR has_role(auth.uid(), 'legal'::app_role)
  )
);

CREATE POLICY "deal_documents_storage_delete_admin"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'deal-documents'
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- 3. audit_events INSERT precisa exigir que actor_user_id = auth.uid()
DROP POLICY IF EXISTS "audit_events_insert" ON public.audit_events;

CREATE POLICY "audit_events_insert"
ON public.audit_events
FOR INSERT
TO authenticated
WITH CHECK (
  actor_user_id IS NULL OR actor_user_id = auth.uid()
);
