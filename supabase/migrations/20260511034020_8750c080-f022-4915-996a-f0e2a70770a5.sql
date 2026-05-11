DROP FUNCTION IF EXISTS public.eb_notes_similar(uuid, int, float);
DROP FUNCTION IF EXISTS public.eb_notes_similar(uuid, integer, double precision);

CREATE OR REPLACE FUNCTION public.eb_notes_similar(
  p_note_id uuid,
  p_limit int DEFAULT 5,
  p_min_similarity float DEFAULT 0.05
)
RETURNS TABLE (
  id uuid,
  entity_type text,
  entity_id text,
  title text,
  body_md text,
  tags text[],
  author_id uuid,
  visibility text,
  pinned boolean,
  source text,
  created_at timestamptz,
  updated_at timestamptz,
  similarity double precision,
  embedding_computed_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, equity_brain
AS $func$
DECLARE
  v_tsv tsvector;
  v_query tsquery;
  v_text text;
  v_clean text;
  v_uid uuid := auth.uid();
BEGIN
  SELECT body_tsv, coalesce(title,'') || ' ' || coalesce(body_md,'')
    INTO v_tsv, v_text
  FROM equity_brain.entity_notes WHERE id = p_note_id;

  IF v_tsv IS NULL OR v_text IS NULL OR length(btrim(v_text)) < 4 THEN
    RETURN;
  END IF;

  -- Strip punctuation that can break websearch_to_tsquery parsing.
  v_clean := translate(left(v_text, 1200), E'()[]{}"''\\:;,.!?<>|@#*_`~', '                        ');
  v_query := websearch_to_tsquery('portuguese', v_clean);

  IF v_query IS NULL OR v_query::text = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    n.id,
    n.entity_type::text,
    n.entity_id,
    n.title,
    n.body_md,
    n.tags,
    n.author_id,
    n.visibility::text,
    n.pinned,
    n.source::text,
    n.created_at,
    n.updated_at,
    ts_rank_cd(n.body_tsv, v_query)::double precision AS similarity,
    n.embedding_computed_at
  FROM equity_brain.entity_notes n
  WHERE n.id <> p_note_id
    AND n.body_tsv @@ v_query
    AND ts_rank_cd(n.body_tsv, v_query) >= p_min_similarity
    AND (
      (n.visibility = 'internal'::equity_brain.note_visibility
        AND (public.has_role(v_uid, 'admin') OR public.has_role(v_uid, 'advisor')))
      OR n.author_id = v_uid
    )
  ORDER BY ts_rank_cd(n.body_tsv, v_query) DESC
  LIMIT GREATEST(1, LEAST(p_limit, 50));
END;
$func$;

REVOKE ALL ON FUNCTION public.eb_notes_similar(uuid, int, float) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.eb_notes_similar(uuid, int, float) TO authenticated;