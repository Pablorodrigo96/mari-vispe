-- =====================================================================
-- EQUITY BRAIN V2 — FASE 1: Foundation
-- =====================================================================

-- 1.1 Estender company_signals com sinais probabilísticos
ALTER TABLE equity_brain.company_signals
  ADD COLUMN IF NOT EXISTS p_true NUMERIC DEFAULT 1.0 CHECK (p_true >= 0 AND p_true <= 1),
  ADD COLUMN IF NOT EXISTS evidence_strength TEXT CHECK (evidence_strength IN ('observed','inferred','self_reported')),
  ADD COLUMN IF NOT EXISTS evidence_ts TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS freshness_decay_days INT DEFAULT 90;

-- 1.2 Buyer Archetypes
CREATE TABLE IF NOT EXISTS equity_brain.buyer_archetypes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  default_weights JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE equity_brain.buyer_archetypes ENABLE ROW LEVEL SECURITY;

CREATE POLICY archetypes_read_all_auth ON equity_brain.buyer_archetypes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY archetypes_write_admin ON equity_brain.buyer_archetypes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY archetypes_service ON equity_brain.buyer_archetypes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Seed dos 10 arquétipos
INSERT INTO equity_brain.buyer_archetypes (id, name, description, default_weights) VALUES
('consolidator_regional_strict', 'Consolidador regional estrito',
 'Geografia ultra-pesada; descarta fora da região. Ex: Unifique, Vero',
 '{"geografia":0.40,"tamanho":0.20,"tese":0.15,"setor":0.10,"timing":0.10,"financeiro":0.05}'::jsonb),
('consolidator_national_aggressive', 'Consolidador nacional agressivo',
 'Geografia neutra; densidade local + tamanho. Ex: Brasil TecPar, Alloha',
 '{"geografia":0.05,"tamanho":0.30,"tese":0.20,"densidade_local":0.20,"timing":0.15,"financeiro":0.10}'::jsonb),
('integrated_telco', 'Telco integrada',
 'Prêmio sinergia móvel/5G; só alvos grandes. Ex: Claro, Vivo, TIM',
 '{"tamanho":0.35,"sinergia_movel":0.25,"geografia":0.15,"financeiro":0.10,"timing":0.15}'::jsonb),
('pe_platform_buy_and_build', 'PE platform buy-and-build',
 'Governança limpa, EBITDA mínimo, ano-do-fundo importa. Ex: Vinci, Pátria, EB',
 '{"governanca":0.25,"financeiro":0.25,"tamanho":0.20,"sponsor_age":0.15,"tese":0.15}'::jsonb),
('serial_acquirer_saas_vertical', 'Serial acquirer SaaS vertical',
 'ARR, NRR, churn, LTV/CAC; vertical complementar. Ex: TOTVS, Nuvini',
 '{"recorrencia":0.30,"vertical_fit":0.25,"financeiro":0.20,"tamanho":0.15,"timing":0.10}'::jsonb),
('infra_fund_buy_and_hold', 'Infra fund buy-and-hold',
 'Tickets >R$ 500M; ativos contratados longos. Ex: Macquarie, Brookfield',
 '{"tamanho":0.40,"contratos_longos":0.25,"financeiro":0.20,"regulatorio":0.15}'::jsonb),
('family_office_direct', 'Family office direct',
 'Cheque menor; co-invest; horizonte longo. Ex: BWGI, Brainvest',
 '{"governanca":0.30,"horizonte":0.25,"tamanho":0.20,"tese":0.25}'::jsonb),
('health_strategic_vertical', 'Saúde estratégico vertical',
 'Verticalização da jornada do paciente. Ex: Rede D''Or, Fleury',
 '{"verticalizacao":0.30,"densidade_local":0.25,"governanca":0.20,"tamanho":0.15,"timing":0.10}'::jsonb),
('education_premium_medical', 'Educação premium/médica',
 'Vagas medicina, marca regional, K-12 premium. Ex: Yduqs, Afya, Salta',
 '{"vagas_medicina":0.30,"marca_regional":0.25,"financeiro":0.20,"tese":0.15,"timing":0.10}'::jsonb),
('b2b_services_consolidator', 'B2B services consolidator',
 'Carteira regional, recorrência, cross-sell. Ex: Alper, GPS',
 '{"recorrencia":0.30,"densidade_local":0.25,"cross_sell":0.20,"tamanho":0.15,"timing":0.10}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  default_weights = EXCLUDED.default_weights,
  updated_at = now();

-- 1.3 Estender buyers
ALTER TABLE equity_brain.buyers
  ADD COLUMN IF NOT EXISTS archetype_id TEXT REFERENCES equity_brain.buyer_archetypes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pause_signal BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deals_last_12m INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pe_sponsor_name TEXT,
  ADD COLUMN IF NOT EXISTS pe_sponsor_entry_date DATE,
  ADD COLUMN IF NOT EXISTS recent_capital_raise_brl NUMERIC,
  ADD COLUMN IF NOT EXISTS recent_capital_raise_date DATE,
  ADD COLUMN IF NOT EXISTS avg_multiple_paid_recent NUMERIC,
  ADD COLUMN IF NOT EXISTS median_target_size_recent NUMERIC;

CREATE INDEX IF NOT EXISTS idx_buyers_archetype ON equity_brain.buyers(archetype_id);

-- 1.4 Estender matches com decisão completa + engine_version
ALTER TABLE equity_brain.matches
  ADD COLUMN IF NOT EXISTS p_close_12m NUMERIC,
  ADD COLUMN IF NOT EXISTS p_close_ci_lower NUMERIC,
  ADD COLUMN IF NOT EXISTS p_close_ci_upper NUMERIC,
  ADD COLUMN IF NOT EXISTS ev_p10 NUMERIC,
  ADD COLUMN IF NOT EXISTS ev_p50 NUMERIC,
  ADD COLUMN IF NOT EXISTS ev_p90 NUMERIC,
  ADD COLUMN IF NOT EXISTS multiple_p10 NUMERIC,
  ADD COLUMN IF NOT EXISTS multiple_p50 NUMERIC,
  ADD COLUMN IF NOT EXISTS multiple_p90 NUMERIC,
  ADD COLUMN IF NOT EXISTS price_per_client_p50 NUMERIC,
  ADD COLUMN IF NOT EXISTS data_confidence TEXT CHECK (data_confidence IN ('low','medium','high')),
  ADD COLUMN IF NOT EXISTS abstain BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS abstain_reason TEXT,
  ADD COLUMN IF NOT EXISTS buyer_archetype TEXT,
  ADD COLUMN IF NOT EXISTS sector_cycle_phase INT,
  ADD COLUMN IF NOT EXISTS counterfactual TEXT,
  ADD COLUMN IF NOT EXISTS comparables JSONB,
  ADD COLUMN IF NOT EXISTS feature_contributions JSONB,
  ADD COLUMN IF NOT EXISTS engine_version TEXT DEFAULT 'v1';

CREATE INDEX IF NOT EXISTS idx_matches_engine_version ON equity_brain.matches(engine_version);
CREATE INDEX IF NOT EXISTS idx_matches_p_close ON equity_brain.matches(p_close_12m DESC) WHERE engine_version = 'v2';

-- 1.5 Bayesian Buyer Model: revealed thetas
CREATE TABLE IF NOT EXISTS equity_brain.buyer_revealed_thetas (
  buyer_id UUID NOT NULL REFERENCES equity_brain.buyers(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL,
  posterior_mean NUMERIC NOT NULL,
  posterior_std NUMERIC NOT NULL,
  n_observations INT NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (buyer_id, feature_name)
);

ALTER TABLE equity_brain.buyer_revealed_thetas ENABLE ROW LEVEL SECURITY;

CREATE POLICY thetas_read_admin_advisor ON equity_brain.buyer_revealed_thetas
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'advisor'::app_role));

CREATE POLICY thetas_write_service ON equity_brain.buyer_revealed_thetas
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 1.6 Deal events (feedback de BDR)
CREATE TABLE IF NOT EXISTS equity_brain.deal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES equity_brain.matches(id) ON DELETE CASCADE,
  cnpj VARCHAR(14),
  buyer_id UUID,
  event_type TEXT NOT NULL CHECK (event_type IN
    ('rejected','contacted','reply_received','nda_signed','loi_received',
     'term_sheet','closed','dropped')),
  event_ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  rejection_reason TEXT CHECK (rejection_reason IS NULL OR rejection_reason IN
    ('geo_fora_radar','tamanho_pequeno','tamanho_grande','governanca_problema',
     'setor_secundario','timing_ruim','preco_alto','sem_resposta',
     'fit_fraco','outro')),
  notes TEXT,
  bdr_user_id UUID,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_deal_events_match ON equity_brain.deal_events(match_id);
CREATE INDEX IF NOT EXISTS idx_deal_events_buyer ON equity_brain.deal_events(buyer_id);
CREATE INDEX IF NOT EXISTS idx_deal_events_type_ts ON equity_brain.deal_events(event_type, event_ts DESC);
CREATE INDEX IF NOT EXISTS idx_deal_events_cnpj ON equity_brain.deal_events(cnpj);

ALTER TABLE equity_brain.deal_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY deal_events_read_admin_advisor ON equity_brain.deal_events
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'advisor'::app_role));

CREATE POLICY deal_events_insert_self ON equity_brain.deal_events
  FOR INSERT TO authenticated
  WITH CHECK (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'advisor'::app_role))
    AND (bdr_user_id IS NULL OR bdr_user_id = auth.uid())
  );

CREATE POLICY deal_events_service ON equity_brain.deal_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 1.7 Canonical transactions (comparáveis de mercado)
CREATE TABLE IF NOT EXISTS equity_brain.canonical_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_name TEXT NOT NULL,
  target_name TEXT NOT NULL,
  sector TEXT,
  deal_date DATE,
  ev_brl NUMERIC,
  ebitda_multiple NUMERIC,
  revenue_multiple NUMERIC,
  price_per_client NUMERIC,
  geography TEXT,
  thesis TEXT,
  buyer_archetype TEXT REFERENCES equity_brain.buyer_archetypes(id) ON DELETE SET NULL,
  source TEXT DEFAULT 'manual_seed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_canonical_archetype ON equity_brain.canonical_transactions(buyer_archetype);
CREATE INDEX IF NOT EXISTS idx_canonical_sector ON equity_brain.canonical_transactions(sector);
CREATE INDEX IF NOT EXISTS idx_canonical_date ON equity_brain.canonical_transactions(deal_date DESC);

ALTER TABLE equity_brain.canonical_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY canonical_read_admin_advisor ON equity_brain.canonical_transactions
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'advisor'::app_role));

CREATE POLICY canonical_write_admin ON equity_brain.canonical_transactions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY canonical_service ON equity_brain.canonical_transactions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Seed das 21 transações canônicas
INSERT INTO equity_brain.canonical_transactions
  (buyer_name, target_name, sector, deal_date, ev_brl, ebitda_multiple, price_per_client, geography, thesis, buyer_archetype) VALUES
('Claro','Desktop','telecom_isp','2026-03-01',4000000000,6.2,3333,'SP','telco_integra_isp','integrated_telco'),
('Brasil TecPar','Ligga','telecom_isp','2026-02-01',1770000000,5.6,5145,'PR','consolidador_grande','consolidator_national_aggressive'),
('Brasil TecPar','Sempre Internet','telecom_isp','2024-12-01',500000000,NULL,2900,'MG','adensamento_regional','consolidator_national_aggressive'),
('Brasil TecPar','Nova Telecom','telecom_isp','2024-06-01',74750000,NULL,1660,'MG','tuck_in_pme','consolidator_national_aggressive'),
('Alloha','Atex','telecom_isp','2024-10-01',73000000,NULL,NULL,'MA','adensamento_NE','consolidator_national_aggressive'),
('Unifique','CCS Telecom','telecom_isp','2025-11-01',70600000,5.2,2828,'SC','overlap_litoral','consolidator_regional_strict'),
('Unifique','MKS Net','telecom_isp','2021-10-01',51800000,4.5,2466,'SC','overlap_litoral','consolidator_regional_strict'),
('Unifique','Naja Telecom','telecom_isp','2021-04-01',NULL,NULL,NULL,'RS','entrada_RS','consolidator_regional_strict'),
('Unifique','Guaiba Telecom','telecom_isp','2021-12-01',60930000,NULL,3046,'RS','adensamento_RMPOA','consolidator_regional_strict'),
('Unifique','3SNet','telecom_isp','2025-11-01',12400000,NULL,2371,'SC','carteira_pura','consolidator_regional_strict'),
('Desktop','Net Barretos','telecom_isp','2021-11-01',191300000,6.2,2855,'SP','adjacencia_SP','consolidator_regional_strict'),
('Desktop','LPNet','telecom_isp','2021-12-01',340000000,NULL,2677,'SP','adjacencia_SP','consolidator_regional_strict'),
('Desktop','Fasternet','telecom_isp','2022-07-01',324800000,5.55,2825,'SP','adjacencia_SP','consolidator_regional_strict'),
('TOTVS','TBDC','tech_saas','2025-12-01',80000000,NULL,NULL,'MT','vertical_agro','serial_acquirer_saas_vertical'),
('TOTVS','Exact Sales','tech_saas','2024-01-01',51000000,NULL,NULL,'BR','recorrencia','serial_acquirer_saas_vertical'),
('TOTVS','Agger','tech_saas','2024-06-01',260000000,NULL,NULL,'BR','vertical_seguros','serial_acquirer_saas_vertical'),
('TOTVS','RD Station','tech_saas','2021-01-01',1861000000,NULL,NULL,'BR','plataforma','serial_acquirer_saas_vertical'),
('TIM','V8 Consulting','b2b_services','2025-11-01',140000000,NULL,NULL,'BR','adjacencia_B2B','integrated_telco'),
('Yduqs','Hardwork','education','2024-01-01',102000000,NULL,NULL,'BR','medicina','education_premium_medical'),
('Yduqs','Unifametro','education','2024-06-01',62000000,NULL,NULL,'CE','campus_regional','education_premium_medical'),
('Rede D''Or','SulAmerica','health','2022-01-01',13000000000,NULL,NULL,'BR','verticalizacao','health_strategic_vertical')
ON CONFLICT DO NOTHING;

-- 1.8 Sinais novos no signal_catalog
INSERT INTO equity_brain.signal_catalog (signal_key, category, description, default_weight, affects_scores) VALUES
('pe_sponsor_age_4plus', 'temporal', 'PE sponsor entrou >= 4 anos atrás (pressão de exit)', 40, ARRAY['ma','sucessao']),
('mandate_active_proba_high', 'temporal', 'Bayesian fusion: P(mandato ativo 12m) > 0.5', 50, ARRAY['ma','vispe','sucessao']),
('leverage_trajectory_rising', 'financeiro', 'Slope da alavancagem subindo nos últimos 180d', 25, ARRAY['ma','vispe','sucessao']),
('time_since_last_deal_buyer_low', 'comportamental', 'Buyer em modo ativo (deal nos últimos 6 meses)', 0, ARRAY[]::text[]),
('buyer_recent_capital_raise', 'comportamental', 'Buyer captou capital nos últimos 12 meses', 0, ARRAY[]::text[]),
('buyer_pause_signal', 'comportamental', 'Buyer sem deals nos últimos 12 meses após streak', 0, ARRAY[]::text[]),
('valuation_arbitrage_window_open', 'mercado', 'Spread múltiplo público-privado > 1x EBITDA', 30, ARRAY['ma']),
('sector_cycle_phase_3_or_4', 'mercado', 'Setor em consolidação avançada (telco/saúde/edu)', 25, ARRAY['ma']),
('buyer_acquisition_velocity_high', 'comportamental', 'Buyer fez >= 5 deals nos últimos 3 anos', 0, ARRAY[]::text[]),
('target_advisor_engagement_90d', 'temporal', 'Empresa contratou banco/advisor em <90d', 45, ARRAY['ma','vispe','sucessao']),
('target_response_velocity_fast', 'comportamental', 'Empresa respondeu outreach < 14d', 20, ARRAY['ma']),
('founder_60_plus_high_confidence', 'sucessao', 'Fundador 60+ com p_true >= 0.8', 35, ARRAY['ma','sucessao']),
('lider_microregional', 'mercado', 'Alvo é #1 ou #2 em microrregião', 25, ARRAY['ma']),
('arpu_above_sector_median', 'comercial', 'ARPU > mediana setorial', 15, ARRAY['ma']),
('ftth_pct_high', 'operacional', 'FTTH > 90% (telecom)', 20, ARRAY['ma']),
('arr_recurring_high', 'comercial', 'ARR > 75% receita (SaaS)', 25, ARRAY['ma','vispe']),
('churn_low', 'comercial', 'Churn mensal < 1% (telecom) ou < 0.8% (SaaS)', 20, ARRAY['ma','vispe']),
('governanca_change_recent', 'governanca', 'Reorganização societária/holding nos últimos 12m', 15, ARRAY['ma','sucessao']),
('ma_team_hiring', 'comportamental', 'Buyer contratou MA/CorpDev nos últimos 6m', 0, ARRAY[]::text[]),
('strategic_asset_score_high', 'estrategico', 'Tem licença/espectro/contrato governo/anchor', 20, ARRAY['ma'])
ON CONFLICT (signal_key) DO UPDATE SET
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  default_weight = EXCLUDED.default_weight,
  affects_scores = EXCLUDED.affects_scores;

-- 1.9 Backfill de archetype_id nos buyers existentes (heurística)
-- Telcos integradas (top 5 com nome conhecido)
UPDATE equity_brain.buyers
SET archetype_id = 'integrated_telco'
WHERE archetype_id IS NULL
  AND tipo = 'estrategico'
  AND vertical_principal = 'telecom'
  AND (
    nome ILIKE '%claro%' OR nome ILIKE '%vivo%' OR nome ILIKE '%tim%'
    OR nome ILIKE '%oi telecom%' OR nome ILIKE '%telefônica%' OR nome ILIKE '%telefonica%'
  );

-- Consolidador regional estrito: telco/infra estratégica com 1-2 UFs
UPDATE equity_brain.buyers
SET archetype_id = 'consolidator_regional_strict'
WHERE archetype_id IS NULL
  AND tipo = 'estrategico'
  AND vertical_principal IN ('telecom','infra_digital')
  AND ufs_interesse IS NOT NULL
  AND array_length(ufs_interesse, 1) BETWEEN 1 AND 2;

-- Consolidador nacional agressivo: telco/infra com 4+ UFs ou nacional
UPDATE equity_brain.buyers
SET archetype_id = 'consolidator_national_aggressive'
WHERE archetype_id IS NULL
  AND tipo = 'estrategico'
  AND vertical_principal IN ('telecom','infra_digital')
  AND (ufs_interesse IS NULL OR array_length(ufs_interesse, 1) >= 4);

-- Resto de telecom/infra estratégico (3 UFs) → regional como default
UPDATE equity_brain.buyers
SET archetype_id = 'consolidator_regional_strict'
WHERE archetype_id IS NULL
  AND tipo = 'estrategico'
  AND vertical_principal IN ('telecom','infra_digital');

-- PE platform buy-and-build
UPDATE equity_brain.buyers
SET archetype_id = 'pe_platform_buy_and_build'
WHERE archetype_id IS NULL
  AND tipo = 'plataforma_pe';

-- Serial acquirer SaaS
UPDATE equity_brain.buyers
SET archetype_id = 'serial_acquirer_saas_vertical'
WHERE archetype_id IS NULL
  AND tipo = 'estrategico'
  AND vertical_principal = 'saas';

-- Saúde estratégico
UPDATE equity_brain.buyers
SET archetype_id = 'health_strategic_vertical'
WHERE archetype_id IS NULL
  AND tipo = 'estrategico'
  AND vertical_principal = 'saude';

-- Educação premium/médica
UPDATE equity_brain.buyers
SET archetype_id = 'education_premium_medical'
WHERE archetype_id IS NULL
  AND tipo = 'estrategico'
  AND vertical_principal = 'educacao';

-- B2B services consolidator
UPDATE equity_brain.buyers
SET archetype_id = 'b2b_services_consolidator'
WHERE archetype_id IS NULL
  AND tipo = 'estrategico'
  AND vertical_principal = 'servicos_b2b';

-- Family office
UPDATE equity_brain.buyers
SET archetype_id = 'family_office_direct'
WHERE archetype_id IS NULL
  AND tipo = 'family_office';

-- Infra fund (financeiro_fundo + vertical infra/energia)
UPDATE equity_brain.buyers
SET archetype_id = 'infra_fund_buy_and_hold'
WHERE archetype_id IS NULL
  AND tipo = 'financeiro_fundo'
  AND vertical_principal IN ('infra_digital','energia');

-- Resto de financeiro_fundo → PE platform como default
UPDATE equity_brain.buyers
SET archetype_id = 'pe_platform_buy_and_build'
WHERE archetype_id IS NULL
  AND tipo = 'financeiro_fundo';

-- Demais estratégicos por vertical (varejo, indústria, agro, energia, multi)
UPDATE equity_brain.buyers
SET archetype_id = 'b2b_services_consolidator'
WHERE archetype_id IS NULL
  AND tipo = 'estrategico'
  AND vertical_principal IN ('varejo','industria','agro','energia','multi');

-- Engine version flag em integrations_config
INSERT INTO public.integrations_config (key, value, active)
VALUES ('equity_brain_engine_version', 'v1', true)
ON CONFLICT (key) DO NOTHING;