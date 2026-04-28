-- 1) Listings: permitir leitura pública de anúncios ativos
DROP POLICY IF EXISTS "Public can view active listings" ON public.listings;
CREATE POLICY "Public can view active listings"
ON public.listings
FOR SELECT
TO anon, authenticated
USING (status = 'active');

-- 2) Buyer profiles: permitir leitura pública de compradores ativos
DROP POLICY IF EXISTS "Public can view active buyer profiles" ON public.buyer_profiles;
CREATE POLICY "Public can view active buyer profiles"
ON public.buyer_profiles
FOR SELECT
TO anon, authenticated
USING (status = 'active');

-- 3) Garantir GRANT de SELECT nas views públicas para anônimos também
GRANT SELECT ON public.public_listings TO anon, authenticated;
GRANT SELECT ON public.public_buyer_profiles TO anon, authenticated;