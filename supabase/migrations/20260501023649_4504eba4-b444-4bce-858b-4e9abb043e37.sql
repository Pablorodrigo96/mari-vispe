
-- Enum para tipos de evento de notícia
DO $$ BEGIN
  CREATE TYPE equity_brain.news_event_type AS ENUM (
    'ma_closed','ma_announced','funding_round','ipo',
    'leadership_change','expansion','regulatory','generic'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Tabela principal de notícias
CREATE TABLE IF NOT EXISTS equity_brain.company_news (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj            varchar(14),
  buyer_id        uuid,
  listing_id      uuid,
  source_url      text NOT NULL,
  source_domain   text,
  title           text NOT NULL,
  summary         text,
  published_at    timestamptz,
  ingested_at     timestamptz NOT NULL DEFAULT now(),
  event_type      equity_brain.news_event_type NOT NULL DEFAULT 'generic',
  event_data      jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw_perplexity  jsonb,
  status          text NOT NULL DEFAULT 'ingested',
  dedupe_hash     text NOT NULL UNIQUE,
  alert_sent      boolean NOT NULL DEFAULT false,
  scope_origin    text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_news_cnpj
  ON equity_brain.company_news(cnpj) WHERE cnpj IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_company_news_buyer
  ON equity_brain.company_news(buyer_id) WHERE buyer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_company_news_listing
  ON equity_brain.company_news(listing_id) WHERE listing_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_company_news_event
  ON equity_brain.company_news(event_type, published_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_company_news_status
  ON equity_brain.company_news(status) WHERE status = 'ingested';
CREATE INDEX IF NOT EXISTS idx_company_news_published
  ON equity_brain.company_news(published_at DESC NULLS LAST);

ALTER TABLE equity_brain.company_news ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and advisors view news" ON equity_brain.company_news;
CREATE POLICY "Admins and advisors view news"
  ON equity_brain.company_news
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'advisor'::public.app_role)
  );

DROP POLICY IF EXISTS "Service role manages news" ON equity_brain.company_news;
CREATE POLICY "Service role manages news"
  ON equity_brain.company_news
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Permissões básicas para anon/auth roles via RLS
GRANT SELECT ON equity_brain.company_news TO authenticated;
GRANT ALL    ON equity_brain.company_news TO service_role;

-- Sinais novos no catálogo (idempotente)
INSERT INTO equity_brain.signal_catalog (signal_key, category, description, default_weight, affects_scores)
VALUES
  ('news_ma_signal',  'market', 'Empresa ou setor com M&A noticiado nos últimos 90 dias', 0.15, ARRAY['ma_score','vispe_score']),
  ('news_funding',    'market', 'Empresa captou rodada de equity ou dívida nos últimos 180 dias', 0.10, ARRAY['ma_score']),
  ('news_leadership', 'signal', 'Mudança de liderança/sucessão noticiada nos últimos 180 dias', 0.20, ARRAY['sucessao_score'])
ON CONFLICT (signal_key) DO NOTHING;
