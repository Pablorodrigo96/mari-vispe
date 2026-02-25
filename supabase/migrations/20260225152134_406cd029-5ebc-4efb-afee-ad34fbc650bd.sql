
-- Fix: recreate public_listings as a security invoker view
DROP VIEW IF EXISTS public.public_listings;
CREATE VIEW public.public_listings WITH (security_invoker = true) AS
SELECT
  id,
  title,
  category,
  description,
  foundation_year,
  annual_revenue,
  annual_profit,
  asking_price,
  hide_price,
  city,
  state,
  neighborhood,
  square_meters,
  rent_value,
  iptu_value,
  sale_reason,
  images,
  plan,
  status,
  ticker,
  created_at,
  updated_at
FROM public.listings
WHERE status = 'active';
