-- Bloco 7.1: Indexes on unindexed FKs (improves JOIN/cascade performance)
CREATE INDEX IF NOT EXISTS idx_notifications_listing_id ON public.notifications(listing_id) WHERE listing_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mari_leads_listing_id ON public.mari_leads(listing_id) WHERE listing_id IS NOT NULL;

-- Bloco 7.2: Restrict LIST on storage buckets to authenticated users.
-- Direct URL access still works because buckets are public=true (bypasses RLS for /object/public/).
DROP POLICY IF EXISTS "Avatars publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Public can view listing images" ON storage.objects;

CREATE POLICY "Avatars readable by authenticated (list)"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'avatars');

CREATE POLICY "Listing images readable by authenticated (list)"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'listing-images');