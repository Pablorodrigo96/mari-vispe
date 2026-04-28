
-- Etapa 3: Onda Estrutural (sem dependência de M&A history)
-- Mede pressão por (setor, UF) usando seller_intent agregado e densidade de buyers ativos.
-- wave_score = sigmoid(z(seller_pressure)) * sigmoid(z(buyer_demand)) → tensão estrutural

CREATE TABLE IF NOT EXISTS equity_brain.market_waves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setor text NOT NULL,
  uf text NOT NULL,
  seller_pressure numeric NOT NULL DEFAULT 0,        -- avg seller_intent_score na célula
  seller_count integer NOT NULL DEFAULT 0,
  buyer_demand numeric NOT NULL DEFAULT 0,            -- # buyers ativos compatíveis (normalizado)
  buyer_count integer NOT NULL DEFAULT 0,
  wave_score numeric NOT NULL DEFAULT 0,              -- 0..1 — tensão estrutural
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (setor, uf)
);

CREATE INDEX IF NOT EXISTS idx_market_waves_setor_uf ON equity_brain.market_waves(setor, uf);
CREATE INDEX IF NOT EXISTS idx_market_waves_score ON equity_brain.market_waves(wave_score DESC);

-- RLS: apenas admin lê (cockpit interno)
ALTER TABLE equity_brain.market_waves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view market waves" ON equity_brain.market_waves;
CREATE POLICY "Admins can view market waves"
  ON equity_brain.market_waves FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Service role manages market waves" ON equity_brain.market_waves;
CREATE POLICY "Service role manages market waves"
  ON equity_brain.market_waves FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);
