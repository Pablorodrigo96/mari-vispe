
ALTER TABLE public.deal_documents DROP CONSTRAINT IF EXISTS deal_documents_status_check;
ALTER TABLE public.deal_documents
  ADD CONSTRAINT deal_documents_status_check
  CHECK (status IN ('draft','draft_critique_failed','pending_approval','approved','rejected','signed','archived'));
