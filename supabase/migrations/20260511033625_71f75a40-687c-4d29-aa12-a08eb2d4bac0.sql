DROP FUNCTION IF EXISTS public.eb_notes_similar(uuid, int, float);
DROP FUNCTION IF EXISTS public.eb_notes_similar(uuid, integer, double precision);

CREATE OR REPLACE FUNCTION public.eb_notes_similar(
  p_note_id uuid,
  p_limit int DEFAULT 5,
  p_min_similarity float DEFAULT 0.55
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
AS $$
DECLARE
  v_emb vector;
  v_uid uuid := auth.uid();
BEGIN
  SELECT embedding INTO v_emb FROM equity_brain.entity_notes WHERE id = p_note_id;
  IF v_emb IS NULL THEN
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
    (1 - (n.embedding <=> v_emb))::double precision AS similarity,
    n.embedding_computed_at
  FROM equity_brain.entity_notes n
  WHERE n.id <> p_note_id
    AND n.embedding IS NOT NULL
    AND (1 - (n.embedding <=> v_emb)) >= p_min_similarity
    AND (
      (n.visibility = 'internal'::equity_brain.note_visibility
        AND (public.has_role(v_uid, 'admin') OR public.has_role(v_uid, 'advisor')))
      OR n.author_id = v_uid
    )
  ORDER BY n.embedding <=> v_emb ASC
  LIMIT GREATEST(1, LEAST(p_limit, 50));
END;
$$;

REVOKE ALL ON FUNCTION public.eb_notes_similar(uuid, int, float) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.eb_notes_similar(uuid, int, float) TO authenticated;

-- Schedule embed-note every 10 minutes (idempotent)
DO $$
DECLARE v_url text; v_jobid bigint;
BEGIN
  v_url := 'https://eiprjgotjruiutztjavp.supabase.co/functions/v1/embed-note';
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'embed-notes-batch';
  IF v_jobid IS NOT NULL THEN PERFORM cron.unschedule(v_jobid); END IF;

  PERFORM cron.schedule(
    'embed-notes-batch',
    '*/10 * * * *',
    format($job$
      SELECT net.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || %L),
        body := '{"limit":40}'::jsonb
      );
    $job$, v_url, current_setting('app.settings.anon_key', true))
  );
END$$;