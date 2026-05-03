
-- ============ TABELAS ============

CREATE TABLE public.api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  provider TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'llm',
  model TEXT,
  function_name TEXT,
  feature TEXT,
  user_id UUID,
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  request_count INTEGER NOT NULL DEFAULT 1,
  cost_usd NUMERIC(12,6) DEFAULT 0,
  cost_brl NUMERIC(12,4) DEFAULT 0,
  latency_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'success',
  http_status INTEGER,
  error_message TEXT,
  metadata JSONB
);

CREATE INDEX idx_api_usage_created ON public.api_usage_logs (created_at DESC);
CREATE INDEX idx_api_usage_provider ON public.api_usage_logs (provider, created_at DESC);
CREATE INDEX idx_api_usage_function ON public.api_usage_logs (function_name);
CREATE INDEX idx_api_usage_user ON public.api_usage_logs (user_id);
CREATE INDEX idx_api_usage_status ON public.api_usage_logs (status);

ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all api usage logs"
  ON public.api_usage_logs FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert api usage logs"
  ON public.api_usage_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ============ PRICING ============

CREATE TABLE public.api_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'default',
  category TEXT NOT NULL DEFAULT 'llm',
  input_per_1m_usd NUMERIC(10,4) DEFAULT 0,
  output_per_1m_usd NUMERIC(10,4) DEFAULT 0,
  flat_per_call_usd NUMERIC(10,6) DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, model)
);

ALTER TABLE public.api_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read pricing"
  ON public.api_pricing FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage pricing"
  ON public.api_pricing FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_api_pricing_updated_at
  BEFORE UPDATE ON public.api_pricing
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed
INSERT INTO public.api_pricing (provider, model, category, input_per_1m_usd, output_per_1m_usd, flat_per_call_usd, notes) VALUES
  ('lovable_ai', 'google/gemini-2.5-flash', 'llm', 0.075, 0.30, 0, 'Default fast model'),
  ('lovable_ai', 'google/gemini-2.5-flash-lite', 'llm', 0.0375, 0.15, 0, 'Cheapest tier'),
  ('lovable_ai', 'google/gemini-2.5-pro', 'llm', 1.25, 5.00, 0, 'Heavy reasoning'),
  ('lovable_ai', 'google/gemini-3-flash-preview', 'llm', 0.10, 0.40, 0, 'Preview'),
  ('lovable_ai', 'openai/gpt-5-mini', 'llm', 0.25, 2.00, 0, 'Balanced'),
  ('lovable_ai', 'openai/gpt-5', 'llm', 1.25, 10.00, 0, 'Premium'),
  ('lovable_ai', 'openai/gpt-5-nano', 'llm', 0.05, 0.40, 0, 'Cheap'),
  ('anthropic', 'claude-3-5-sonnet-20241022', 'llm', 3.00, 15.00, 0, 'Sonnet 3.5'),
  ('anthropic', 'claude-3-5-haiku-20241022', 'llm', 0.80, 4.00, 0, 'Haiku 3.5'),
  ('anthropic', 'claude-sonnet-4-20250514', 'llm', 3.00, 15.00, 0, 'Sonnet 4'),
  ('anthropic', 'default', 'llm', 3.00, 15.00, 0, 'Fallback'),
  ('perplexity', 'sonar', 'llm', 0.20, 0.20, 0.001, 'Online sonar'),
  ('perplexity', 'sonar-pro', 'llm', 1.00, 1.00, 0.005, 'Pro online'),
  ('perplexity', 'llama-3.1-sonar-small-128k-online', 'llm', 0.20, 0.20, 0.001, 'Legacy small'),
  ('perplexity', 'default', 'llm', 0.50, 0.50, 0.005, 'Fallback'),
  ('stripe', 'default', 'payments', 0, 0, 0, 'Tracked for monitoring only'),
  ('brasilapi', 'default', 'data_enrichment', 0, 0, 0, 'Free tier'),
  ('cnpj_ws', 'default', 'data_enrichment', 0, 0, 0.01, 'Adjustable per plan'),
  ('meta_whatsapp', 'default', 'messaging', 0, 0, 0.005, 'Conversation pricing avg'),
  ('nominatim', 'default', 'geocoding', 0, 0, 0, 'Free OSM tier');

-- ============ SETTINGS ============

CREATE TABLE public.api_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.api_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read api settings"
  ON public.api_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage api settings"
  ON public.api_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.api_settings (key, value, description) VALUES
  ('usd_brl_rate', '5.20', 'Câmbio USD→BRL aplicado ao cálculo de custo'),
  ('monthly_budget_brl', '5000', 'Orçamento mensal de IA (R$) — para alertas'),
  ('log_retention_days', '180', 'Dias de retenção dos logs');

-- ============ DAILY SUMMARY VIEW ============

CREATE OR REPLACE VIEW public.api_usage_daily_summary AS
SELECT
  date_trunc('day', created_at)::date AS day,
  provider,
  category,
  model,
  function_name,
  COUNT(*) AS calls,
  SUM(COALESCE(input_tokens, 0)) AS input_tokens,
  SUM(COALESCE(output_tokens, 0)) AS output_tokens,
  SUM(COALESCE(total_tokens, 0)) AS total_tokens,
  SUM(COALESCE(cost_usd, 0)) AS cost_usd,
  SUM(COALESCE(cost_brl, 0)) AS cost_brl,
  ROUND(AVG(NULLIF(latency_ms, 0))::numeric, 0) AS avg_latency_ms,
  SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS errors,
  ROUND(100.0 * SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2) AS error_rate_pct
FROM public.api_usage_logs
GROUP BY 1, 2, 3, 4, 5;
