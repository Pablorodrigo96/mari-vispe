ALTER TABLE public.capital_requests
ADD COLUMN IF NOT EXISTS sector text,
ADD COLUMN IF NOT EXISTS company_age text,
ADD COLUMN IF NOT EXISTS approval_score integer;