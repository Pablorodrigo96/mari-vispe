
-- Create teaser_views table for tracking blind teaser page views
CREATE TABLE public.teaser_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL,
  viewer_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookups by listing
CREATE INDEX idx_teaser_views_listing_id ON public.teaser_views (listing_id);
CREATE INDEX idx_teaser_views_viewer_id ON public.teaser_views (viewer_id);

-- Enable RLS
ALTER TABLE public.teaser_views ENABLE ROW LEVEL SECURITY;

-- Anyone (anon + authenticated) can insert views
CREATE POLICY "Anyone can insert teaser views"
ON public.teaser_views
FOR INSERT
WITH CHECK (true);

-- Listing owners can view their teaser views
CREATE POLICY "Listing owners can view teaser views"
ON public.teaser_views
FOR SELECT
USING (
  listing_id IN (
    SELECT id FROM public.listings WHERE user_id = auth.uid()
  )
);

-- Admins can view all teaser views
CREATE POLICY "Admins can view all teaser views"
ON public.teaser_views
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));
