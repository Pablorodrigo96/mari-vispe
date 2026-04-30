
-- ============================================================
-- ETAPA 1 — Fundação ISP Anatel
-- ============================================================

-- 1.1 Estender enum qualification_status
ALTER TYPE equity_brain.qualification_status ADD VALUE IF NOT EXISTS 'cold_market_map';
ALTER TYPE equity_brain.qualification_status ADD VALUE IF NOT EXISTS 'cold_prospect';
ALTER TYPE equity_brain.qualification_status ADD VALUE IF NOT EXISTS 'contacted';
ALTER TYPE equity_brain.qualification_status ADD VALUE IF NOT EXISTS 'relationship_started';
ALTER TYPE equity_brain.qualification_status ADD VALUE IF NOT EXISTS 'lost';
ALTER TYPE equity_brain.qualification_status ADD VALUE IF NOT EXISTS 'do_not_contact';

-- 1.2 Tabelas novas
CREATE TABLE IF NOT EXISTS equity_brain.isp_anatel_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  file_url text,
  period_ref date NOT NULL,
  uploaded_by uuid NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  total_rows int DEFAULT 0,
  inserted_rows int DEFAULT 0,
  rejected_rows int DEFAULT 0,
  dedup_rows int DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  error_log jsonb DEFAULT '[]'::jsonb,
  calc_version text DEFAULT 'v1'
);

CREATE TABLE IF NOT EXISTS equity_brain.isp_market_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_ref date NOT NULL,
  source text NOT NULL DEFAULT 'ANATEL_BANDA_LARGA_FIXA',
  cnpj varchar(14),
  provider_name text NOT NULL,
  provider_name_norm text NOT NULL,
  uf char(2),
  municipio text,
  ibge_code text,
  technology text,
  service_type text DEFAULT 'banda_larga_fixa',
  accesses int,
  raw jsonb,
  import_id uuid REFERENCES equity_brain.isp_anatel_imports(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS isp_market_entries_uniq
  ON equity_brain.isp_market_entries
  (COALESCE(cnpj,''), COALESCE(ibge_code, provider_name_norm), period_ref, COALESCE(technology,''));
CREATE INDEX IF NOT EXISTS isp_market_entries_cnpj   ON equity_brain.isp_market_entries(cnpj);
CREATE INDEX IF NOT EXISTS isp_market_entries_ibge   ON equity_brain.isp_market_entries(ibge_code);
CREATE INDEX IF NOT EXISTS isp_market_entries_period ON equity_brain.isp_market_entries(period_ref);

CREATE TABLE IF NOT EXISTS equity_brain.isp_city_market_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_ref date NOT NULL,
  ibge_code text,
  municipio text,
  uf char(2),
  total_accesses bigint,
  n_providers int,
  leader_cnpj varchar(14),
  leader_share numeric,
  top3_share numeric,
  hhi numeric,
  fragmentation_score numeric,
  rollup_opportunity_score numeric,
  dominant_player boolean DEFAULT false,
  computed_at timestamptz NOT NULL DEFAULT now(),
  calc_version text DEFAULT 'v1',
  UNIQUE (period_ref, ibge_code)
);

CREATE TABLE IF NOT EXISTS equity_brain.isp_company_market_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_ref date NOT NULL,
  cnpj varchar(14) NOT NULL,
  provider_name_norm text,
  total_accesses bigint,
  n_municipios int,
  n_ufs int,
  main_city_ibge text,
  main_city_share numeric,
  geographic_density numeric,
  regional_presence_score numeric,
  growth_vs_prev numeric,
  fragmentation_exposure numeric,
  rollup_target_score numeric,
  local_leader_score numeric,
  subscale_pressure_score numeric,
  sellability_score numeric,
  platform_potential_score numeric,
  computed_at timestamptz NOT NULL DEFAULT now(),
  calc_version text DEFAULT 'v1',
  UNIQUE (period_ref, cnpj)
);

CREATE TABLE IF NOT EXISTS equity_brain.isp_thesis_link (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj varchar(14) NOT NULL,
  thesis_key varchar NOT NULL REFERENCES equity_brain.investment_theses(thesis_key) ON DELETE CASCADE,
  fit_score numeric,
  reasons jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cnpj, thesis_key)
);

CREATE TABLE IF NOT EXISTS equity_brain.isp_promotion_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj varchar(14) NOT NULL,
  from_status equity_brain.qualification_status,
  to_status equity_brain.qualification_status NOT NULL,
  reason text,
  thesis_key varchar,
  promoted_by uuid NOT NULL,
  promoted_at timestamptz NOT NULL DEFAULT now(),
  snapshot jsonb
);

-- 1.3 Flag em matches
ALTER TABLE equity_brain.matches
  ADD COLUMN IF NOT EXISTS is_cold_suggestion boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS matches_cold_idx ON equity_brain.matches(is_cold_suggestion);

-- 1.4 RLS — admin/advisor only
ALTER TABLE equity_brain.isp_anatel_imports        ENABLE ROW LEVEL SECURITY;
ALTER TABLE equity_brain.isp_market_entries        ENABLE ROW LEVEL SECURITY;
ALTER TABLE equity_brain.isp_city_market_stats     ENABLE ROW LEVEL SECURITY;
ALTER TABLE equity_brain.isp_company_market_stats  ENABLE ROW LEVEL SECURITY;
ALTER TABLE equity_brain.isp_thesis_link           ENABLE ROW LEVEL SECURITY;
ALTER TABLE equity_brain.isp_promotion_log         ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'isp_anatel_imports','isp_market_entries','isp_city_market_stats',
    'isp_company_market_stats','isp_thesis_link','isp_promotion_log'
  ] LOOP
    EXECUTE format($f$
      DROP POLICY IF EXISTS admin_advisor_all ON equity_brain.%I;
      CREATE POLICY admin_advisor_all ON equity_brain.%I
        FOR ALL TO authenticated
        USING (public.has_role(auth.uid(),'admin'::public.app_role)
            OR public.has_role(auth.uid(),'advisor'::public.app_role))
        WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role)
            OR public.has_role(auth.uid(),'advisor'::public.app_role));
    $f$, t, t);
  END LOOP;
END $$;

-- 1.5 Recriar views ISP
DROP VIEW IF EXISTS equity_brain.v_isp_universe CASCADE;
CREATE VIEW equity_brain.v_isp_universe
  WITH (security_invoker = true) AS
SELECT
  c.cnpj, c.razao_social, c.nome_fantasia, c.uf, c.municipio,
  c.qualification_status, c.codename,
  s.period_ref, s.total_accesses, s.n_municipios, s.n_ufs,
  s.rollup_target_score, s.local_leader_score, s.subscale_pressure_score,
  s.sellability_score, s.platform_potential_score
FROM equity_brain.companies c
JOIN equity_brain.isp_company_market_stats s ON s.cnpj = c.cnpj
WHERE c.source = 'ANATEL_BANDA_LARGA_FIXA';

DROP VIEW IF EXISTS equity_brain.v_opportunities_by_municipio CASCADE;
CREATE VIEW equity_brain.v_opportunities_by_municipio
  WITH (security_invoker = true) AS
SELECT period_ref, ibge_code, municipio, uf,
       total_accesses, n_providers, leader_cnpj, leader_share,
       top3_share, hhi, fragmentation_score,
       rollup_opportunity_score, dominant_player
FROM equity_brain.isp_city_market_stats;

DROP VIEW IF EXISTS equity_brain.v_opportunities_by_uf CASCADE;
CREATE VIEW equity_brain.v_opportunities_by_uf
  WITH (security_invoker = true) AS
SELECT period_ref, uf,
       SUM(total_accesses)            AS total_accesses,
       SUM(n_providers)               AS n_providers_sum,
       AVG(hhi)                       AS avg_hhi,
       AVG(fragmentation_score)       AS avg_fragmentation,
       AVG(rollup_opportunity_score)  AS avg_rollup_opportunity
FROM equity_brain.isp_city_market_stats
GROUP BY period_ref, uf;

-- 1.6 Seeds em signal_catalog
INSERT INTO equity_brain.signal_catalog (signal_key, category, description, default_weight, affects_scores) VALUES
 ('isp_rollup_target_score',         'consolidacao', 'ISP candidato a addon de plataforma regional',           0.10, ARRAY['thesis_fit','market_waves']),
 ('isp_local_leader_score',          'premium_asset','ISP líder municipal — ativo premium / plataforma',       0.10, ARRAY['strategic_fit','platform_addon']),
 ('isp_subscale_pressure_score',     'distress',     'ISP subescala em cidade dominada — pressão para vender', 0.10, ARRAY['seller_intent']),
 ('isp_market_fragmentation_score',  'market',       'Cidade fragmentada (HHI baixo) — onda de roll-up',       0.08, ARRAY['market_waves','geographic_expansion']),
 ('isp_density_opportunity_score',   'sinergia',     'Buyer já atua na cidade → densidade local',              0.08, ARRAY['buyer_acquires_seller']),
 ('isp_geographic_expansion_score',  'sinergia',     'Buyer atua em UF/cidade próxima → expansão',             0.08, ARRAY['geographic_expansion']),
 ('isp_platform_potential_score',    'platform',     'ISP com base/regional para virar plataforma',            0.08, ARRAY['platform_addon']),
 ('isp_addon_candidate_score',       'platform',     'ISP pequeno ideal como addon de plataforma existente',   0.08, ARRAY['platform_addon']),
 ('isp_consolidation_wave_score',    'market',       'Onda de consolidação ativa no cluster regional',         0.08, ARRAY['market_waves','thesis_fit']),
 ('isp_sellability_score',           'seller',       'Probabilidade de o ISP aceitar venda no curto prazo',    0.10, ARRAY['seller_intent'])
ON CONFLICT (signal_key) DO NOTHING;

-- 1.7 Trigger guard de promoção
CREATE OR REPLACE FUNCTION equity_brain.guard_isp_promotion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.source = 'ANATEL_BANDA_LARGA_FIXA'
     AND OLD.qualification_status IS DISTINCT FROM NEW.qualification_status
     AND NOT EXISTS (
       SELECT 1 FROM equity_brain.isp_promotion_log
       WHERE cnpj = NEW.cnpj
         AND to_status = NEW.qualification_status
         AND promoted_at > now() - interval '5 seconds'
     ) THEN
    RAISE EXCEPTION 'ISP Anatel: mudança de qualification_status só via promote-cold-isp (cnpj=%)', NEW.cnpj;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_isp_promotion ON equity_brain.companies;
CREATE TRIGGER trg_guard_isp_promotion
  BEFORE UPDATE OF qualification_status ON equity_brain.companies
  FOR EACH ROW EXECUTE FUNCTION equity_brain.guard_isp_promotion();
