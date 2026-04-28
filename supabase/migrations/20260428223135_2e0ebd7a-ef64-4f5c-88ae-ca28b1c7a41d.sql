-- Etapa 2: Embeddings semânticos para companies + buyers
ALTER TABLE equity_brain.companies
  ADD COLUMN IF NOT EXISTS embedding vector(768),
  ADD COLUMN IF NOT EXISTS embedding_computed_at timestamptz,
  ADD COLUMN IF NOT EXISTS embedding_text_hash text;

ALTER TABLE equity_brain.buyers
  ADD COLUMN IF NOT EXISTS embedding vector(768),
  ADD COLUMN IF NOT EXISTS embedding_computed_at timestamptz,
  ADD COLUMN IF NOT EXISTS embedding_text_hash text;

-- Indexes HNSW para cosine similarity (eficientes em consultas)
CREATE INDEX IF NOT EXISTS idx_companies_embedding_hnsw
  ON equity_brain.companies USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_buyers_embedding_hnsw
  ON equity_brain.buyers USING hnsw (embedding vector_cosine_ops);