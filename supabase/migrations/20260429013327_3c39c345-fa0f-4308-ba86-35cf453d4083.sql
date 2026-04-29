CREATE TABLE IF NOT EXISTS public.cnpj_cache (
  cnpj TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cnpj_cache_cached_at ON public.cnpj_cache (cached_at DESC);

ALTER TABLE public.cnpj_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cnpj cache"
  ON public.cnpj_cache FOR SELECT
  USING (true);

CREATE POLICY "Service role can write cnpj cache"
  ON public.cnpj_cache FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);