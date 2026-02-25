
-- Add ticker column to listings
ALTER TABLE public.listings ADD COLUMN ticker TEXT UNIQUE;

-- Generate tickers for existing listings
DO $$
DECLARE
  r RECORD;
  prefix TEXT;
  seq INT;
  new_ticker TEXT;
BEGIN
  FOR r IN SELECT id, category FROM public.listings ORDER BY created_at ASC LOOP
    prefix := UPPER(LEFT(r.category, 4));
    seq := 1;
    LOOP
      new_ticker := prefix || LPAD(seq::TEXT, 2, '0');
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.listings WHERE ticker = new_ticker);
      seq := seq + 1;
    END LOOP;
    UPDATE public.listings SET ticker = new_ticker WHERE id = r.id;
  END LOOP;
END $$;

-- Recreate the public_listings view to include ticker
DROP VIEW IF EXISTS public.public_listings;
CREATE VIEW public.public_listings AS
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
