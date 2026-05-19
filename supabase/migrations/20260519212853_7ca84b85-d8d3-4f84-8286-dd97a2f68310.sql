GRANT SELECT ON public.listings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.listings TO authenticated;
GRANT SELECT, INSERT ON public.listing_views TO anon, authenticated;