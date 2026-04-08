
-- 1. Add is_partner_accountant flag to profiles
ALTER TABLE public.profiles ADD COLUMN is_partner_accountant BOOLEAN NOT NULL DEFAULT false;

-- 2. Add equity_score to listings
ALTER TABLE public.listings ADD COLUMN equity_score NUMERIC;

-- 3. Create listing_financial_docs table
CREATE TABLE public.listing_financial_docs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL,
  user_id UUID NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_type TEXT,
  equity_score JSONB,
  ai_extracted_data JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.listing_financial_docs ENABLE ROW LEVEL SECURITY;

-- Uploader can view own docs
CREATE POLICY "Uploaders can view own docs"
ON public.listing_financial_docs
FOR SELECT
USING (auth.uid() = user_id);

-- Listing owners can view docs for their listings
CREATE POLICY "Listing owners can view docs"
ON public.listing_financial_docs
FOR SELECT
USING (listing_id IN (SELECT id FROM public.listings WHERE user_id = auth.uid()));

-- Admins can view all docs
CREATE POLICY "Admins can view all financial docs"
ON public.listing_financial_docs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Authenticated users can insert their own docs
CREATE POLICY "Users can insert own financial docs"
ON public.listing_financial_docs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Service role can update docs (for edge function)
CREATE POLICY "Service role can update financial docs"
ON public.listing_financial_docs
FOR UPDATE
TO service_role
USING (true);

-- Service role can update listings equity_score
-- (already covered by existing admin policies, but service_role has full access)

-- 4. Create private storage bucket for financial docs
INSERT INTO storage.buckets (id, name, public)
VALUES ('financial-docs', 'financial-docs', false);

-- Storage policies: authenticated users can upload to their own folder
CREATE POLICY "Users can upload financial docs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'financial-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can view their own uploaded files
CREATE POLICY "Users can view own financial docs"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'financial-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Admins can view all financial docs
CREATE POLICY "Admins can view all financial doc files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'financial-docs' AND public.has_role(auth.uid(), 'admin'));

-- Service role needs to read files for AI analysis (service_role has full access by default)
