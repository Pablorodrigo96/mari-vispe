
-- 3. FIX REALTIME LEAKS: Remove tables from realtime publication (no IF EXISTS)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.notifications;
  EXCEPTION WHEN undefined_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.capital_messages;
  EXCEPTION WHEN undefined_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.capital_timeline;
  EXCEPTION WHEN undefined_object THEN NULL;
  END;
END;
$$;

-- 4. FIX SECURITY DEFINER VIEW: Recreate public_listings with security_invoker
DROP VIEW IF EXISTS public.public_listings;
CREATE VIEW public.public_listings
WITH (security_invoker = on)
AS
SELECT
  id, title, category, description, city, state, neighborhood,
  asking_price, annual_revenue, annual_profit, equity_score,
  foundation_year, images, plan, status, ticker,
  hide_price, sale_reason, additional_info,
  square_meters, rent_value, iptu_value,
  created_at, updated_at
FROM public.listings
WHERE status = 'active';

GRANT SELECT ON public.public_listings TO anon, authenticated;
