-- GIN index for fast tag containment / unnest queries
CREATE INDEX IF NOT EXISTS entity_notes_tags_gin
  ON equity_brain.entity_notes USING gin (tags);

-- RPC: list notes that carry a tag (optionally including descendants)
CREATE OR REPLACE FUNCTION public.eb_notes_by_tag(
  p_tag text,
  p_include_descendants boolean DEFAULT true,
  p_limit int DEFAULT 50
)
RETURNS SETOF public.eb_entity_notes
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, equity_brain
AS $$
  SELECT n.*
  FROM public.eb_entity_notes n
  WHERE
    p_tag = ANY(n.tags)
    OR (
      p_include_descendants
      AND EXISTS (
        SELECT 1 FROM unnest(n.tags) t
        WHERE t LIKE (p_tag || '/%')
      )
    )
  ORDER BY n.updated_at DESC
  LIMIT GREATEST(p_limit, 1);
$$;

GRANT EXECUTE ON FUNCTION public.eb_notes_by_tag(text, boolean, int) TO authenticated;

-- RPC: top tags by usage in the last N days, optionally scoped to one author
CREATE OR REPLACE FUNCTION public.eb_top_tags(
  p_author uuid DEFAULT NULL,
  p_days int DEFAULT 30,
  p_limit int DEFAULT 20
)
RETURNS TABLE(tag text, count bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, equity_brain
AS $$
  SELECT t AS tag, COUNT(*)::bigint AS count
  FROM public.eb_entity_notes n,
       LATERAL unnest(n.tags) AS t
  WHERE n.updated_at >= now() - make_interval(days => GREATEST(p_days, 1))
    AND (p_author IS NULL OR n.author_id = p_author)
    AND t <> ''
  GROUP BY t
  ORDER BY count DESC, t ASC
  LIMIT GREATEST(p_limit, 1);
$$;

GRANT EXECUTE ON FUNCTION public.eb_top_tags(uuid, int, int) TO authenticated;