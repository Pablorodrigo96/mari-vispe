
ALTER TABLE public.listing_financial_docs
  ADD COLUMN IF NOT EXISTS doc_type text NOT NULL DEFAULT 'outro',
  ADD COLUMN IF NOT EXISTS source_doc_id uuid;

ALTER TABLE public.capital_documents
  ADD COLUMN IF NOT EXISTS source_doc_id uuid;

CREATE INDEX IF NOT EXISTS idx_listing_financial_docs_user_doctype
  ON public.listing_financial_docs(user_id, doc_type);

CREATE INDEX IF NOT EXISTS idx_listing_financial_docs_listing
  ON public.listing_financial_docs(listing_id);

CREATE INDEX IF NOT EXISTS idx_capital_documents_request_doctype
  ON public.capital_documents(request_id, doc_type);
