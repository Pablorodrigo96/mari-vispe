-- Bloco 7: Semantic Search for Notes (pgvector)

-- 1) Columns
ALTER TABLE equity_brain.entity_notes
  ADD COLUMN IF NOT EXISTS embedding vector(768),
  ADD COLUMN IF NOT EXISTS embedding_computed_at timestamptz,
  ADD COLUMN IF NOT EXISTS embedding_text_hash text;

-- 2) HNSW index for cosine similarity
CREATE INDEX IF NOT EXISTS entity_notes_embedding_hnsw
  ON equity_brain.entity_notes
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 3) Update public view to expose embedding_computed_at (NOT the vector itself)
CREATE OR REPLACE VIEW public.eb_entity_notes
WITH (security_invoker = on)
AS
SELECT
  id, entity_type::text AS entity_type, entity_id, author_id,
  title, body_md, visibility::text AS visibility, pinned, tags,
  created_at, updated_at,
  embedding_computed_at
FROM equity_brain.entity_notes;

-- 4) RPC: similar notes
CREATE OR REPLACE FUNCTION public.eb_notes_similar(
  p_note_id uuid,
  p_limit int DEFAULT 10,
  p_min_similarity float DEFAULT 0.55
)
RETURNS TABLE (
  id uuid,
  entity_type text,
  entity_id text,
  author_id uuid,
  title text,
  body_md text,
  visibility text,
  pinned boolean,
  tags text[],
  created_at timestamptz,
  updated_at timestamptz,
  embedding_computed_at timestamptz,
  similarity float
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, equity_brain
AS $$
  WITH base AS (
    SELECT embedding FROM equity_brain.entity_notes WHERE id = p_note_id
  )
  SELECT
    n.id, n.entity_type::text, n.entity_id, n.author_id,
    n.title, n.body_md, n.visibility::text, n.pinned, n.tags,
    n.created_at, n.updated_at, n.embedding_computed_at,
    (1 - (n.embedding <=> (SELECT embedding FROM base)))::float AS similarity
  FROM equity_brain.entity_notes n
  WHERE n.id <> p_note_id
    AND n.embedding IS NOT NULL
    AND (SELECT embedding FROM base) IS NOT NULL
    AND (1 - (n.embedding <=> (SELECT embedding FROM base))) >= p_min_similarity
  ORDER BY n.embedding <=> (SELECT embedding FROM base) ASC
  LIMIT GREATEST(1, LEAST(p_limit, 50));
$$;

GRANT EXECUTE ON FUNCTION public.eb_notes_similar(uuid, int, float) TO authenticated;

-- 5) RPC: hybrid search (BM25 + semantic)
CREATE OR REPLACE FUNCTION public.eb_notes_search_hybrid(
  p_query text,
  p_query_embedding vector,
  p_entity_type text DEFAULT NULL,
  p_limit int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  entity_type text,
  entity_id text,
  author_id uuid,
  title text,
  body_md text,
  visibility text,
  pinned boolean,
  tags text[],
  created_at timestamptz,
  updated_at timestamptz,
  embedding_computed_at timestamptz,
  bm25 float,
  semantic float,
  score float
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, equity_brain
AS $$
  WITH q AS (
    SELECT
      plainto_tsquery('portuguese', coalesce(p_query, '')) AS tsq,
      p_query_embedding AS emb,
      coalesce(p_query, '') AS qtext
  ),
  scored AS (
    SELECT
      n.id, n.entity_type::text AS entity_type, n.entity_id, n.author_id,
      n.title, n.body_md, n.visibility::text AS visibility, n.pinned, n.tags,
      n.created_at, n.updated_at, n.embedding_computed_at,
      ts_rank_cd(n.body_tsv, (SELECT tsq FROM q))::float AS bm25_raw,
      CASE
        WHEN n.embedding IS NULL OR (SELECT emb FROM q) IS NULL THEN 0::float
        ELSE (1 - (n.embedding <=> (SELECT emb FROM q)))::float
      END AS semantic_raw
    FROM equity_brain.entity_notes n
    WHERE (p_entity_type IS NULL OR n.entity_type::text = p_entity_type)
      AND (
        (SELECT qtext FROM q) = ''
        OR n.body_tsv @@ (SELECT tsq FROM q)
        OR n.embedding IS NOT NULL
      )
  ),
  normalized AS (
    SELECT
      *,
      CASE WHEN MAX(bm25_raw) OVER () > 0
           THEN bm25_raw / MAX(bm25_raw) OVER ()
           ELSE 0::float
      END AS bm25_norm
    FROM scored
  )
  SELECT
    id, entity_type, entity_id, author_id,
    title, body_md, visibility, pinned, tags,
    created_at, updated_at, embedding_computed_at,
    bm25_norm AS bm25,
    semantic_raw AS semantic,
    (0.4 * bm25_norm + 0.6 * semantic_raw)::float AS score
  FROM normalized
  WHERE (bm25_norm > 0 OR semantic_raw >= 0.5)
  ORDER BY score DESC, updated_at DESC
  LIMIT GREATEST(1, LEAST(p_limit, 100));
$$;

GRANT EXECUTE ON FUNCTION public.eb_notes_search_hybrid(text, vector, text, int) TO authenticated;