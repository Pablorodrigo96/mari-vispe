
CREATE OR REPLACE FUNCTION public.get_teaser_view_count(p_listing_id uuid)
RETURNS TABLE(total_views bigint, unique_views bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    COUNT(*)::bigint AS total_views,
    COUNT(DISTINCT viewer_id)::bigint AS unique_views
  FROM public.teaser_views
  WHERE listing_id = p_listing_id;
$$;
