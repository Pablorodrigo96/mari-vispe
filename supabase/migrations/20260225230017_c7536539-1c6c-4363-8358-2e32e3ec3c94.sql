CREATE TABLE public.listing_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL,
  user_id uuid,
  event_type text NOT NULL DEFAULT 'view',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.listing_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert listing views"
  ON public.listing_views FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Listing owners can view their listing views"
  ON public.listing_views FOR SELECT
  USING (listing_id IN (
    SELECT id FROM public.listings WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all listing views"
  ON public.listing_views FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_listing_views_listing_id ON public.listing_views(listing_id);
CREATE INDEX idx_listing_views_event_type ON public.listing_views(event_type);
CREATE INDEX idx_listing_views_composite ON public.listing_views(listing_id, event_type);