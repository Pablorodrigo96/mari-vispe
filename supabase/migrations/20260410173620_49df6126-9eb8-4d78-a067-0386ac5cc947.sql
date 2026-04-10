-- 1. Remove public SELECT on listings base table (CNPJ/address exposure)
DROP POLICY IF EXISTS "Public can view active listings" ON public.listings;

-- 2. Remove insecure INSERT/UPDATE on subscriptions
DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.subscriptions;

-- 3. Remove insecure UPDATE on valuation_purchases
DROP POLICY IF EXISTS "Users can update own purchases" ON public.valuation_purchases;

-- 4. Remove insecure INSERT on valuation_purchases (should only be inserted by service_role via verify-payment)
DROP POLICY IF EXISTS "Users can insert own purchases" ON public.valuation_purchases;