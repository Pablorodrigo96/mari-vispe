-- ============================================================
-- EQUITY BRAIN - FASE 1: CAMADA DE DADOS ESTRUTURADOS
-- Schema isolado: equity_brain (já existe da Fase 0)
-- ============================================================

-- ------------------------------------------------------------
-- Função utilitária: updated_at
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION equity_brain.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================
-- 1.1 — equity_brain.companies
-- ============================================================
CREATE TABLE IF NOT EXISTS equity_brain.companies (
  -- Identificação
  cnpj            VARCHAR(14) PRIMARY KEY,
  razao_social    TEXT NOT NULL,
  nome_fantasia   TEXT,

  -- Classificação
  cnae_principal     VARCHAR(10),
  cnae_descricao     TEXT,
  cnae_secundarios   JSONB DEFAULT '[]'::jsonb,
  natureza_juridica  VARCHAR(10),
  natureza_descricao TEXT,
  porte              VARCHAR(20),

  -- Geografia
  uf                  VARCHAR(2),
  municipio           TEXT,
  bairro              TEXT,
  cep                 VARCHAR(8),
  endereco_logradouro TEXT,
  endereco_numero     TEXT,
  latitude            NUMERIC(10,7),
  longitude           NUMERIC(10,7),

  -- Tempo / Status
  data_abertura            DATE,
  situacao_cadastral       VARCHAR(20),
  data_situacao_cadastral  DATE,

  -- Capital / Operacional
  capital_social  NUMERIC(15,2),

  -- Sócios (snapshot agregado; detalhe vai em company_partners)
  qtd_socios  INTEGER DEFAULT 0,
  socios_pf   INTEGER DEFAULT 0,
  socios_pj   INTEGER DEFAULT 0,

  -- Enriquecimento estimado
  faturamento_estimado   NUMERIC(15,2),
  funcionarios_estimado  INTEGER,
  ebitda_estimado        NUMERIC(15,2),

  -- Vínculos com plataforma
  has_listing  BOOLEAN DEFAULT false,
  listing_id   UUID REFERENCES public.listings(id) ON DELETE SET NULL,

  -- Setor M&A normalizado
  setor_ma     VARCHAR(50),
  subsetor_ma  VARCHAR(50),

  -- Metadata
  source            VARCHAR(30) DEFAULT 'national_db',
  raw_data          JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_enriched_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_companies_cnae      ON equity_brain.companies(cnae_principal);
CREATE INDEX IF NOT EXISTS idx_companies_uf        ON equity_brain.companies(uf);
CREATE INDEX IF NOT EXISTS idx_companies_municipio ON equity_brain.companies(municipio);
CREATE INDEX IF NOT EXISTS idx_companies_setor_ma  ON equity_brain.companies(setor_ma);
CREATE INDEX IF NOT EXISTS idx_companies_situacao  ON equity_brain.companies(situacao_cadastral);
CREATE INDEX IF NOT EXISTS idx_companies_abertura  ON equity_brain.companies(data_abertura);
CREATE INDEX IF NOT EXISTS idx_companies_porte     ON equity_brain.companies(porte);
CREATE INDEX IF NOT EXISTS idx_companies_listing   ON equity_brain.companies(listing_id) WHERE listing_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_companies_uf_cnae   ON equity_brain.companies(uf, cnae_principal);

DROP TRIGGER IF EXISTS trg_companies_updated_at ON equity_brain.companies;
CREATE TRIGGER trg_companies_updated_at
BEFORE UPDATE ON equity_brain.companies
FOR EACH ROW EXECUTE FUNCTION equity_brain.set_updated_at();

ALTER TABLE equity_brain.companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "companies_read_admins_advisors" ON equity_brain.companies;
CREATE POLICY "companies_read_admins_advisors"
ON equity_brain.companies FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'advisor'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.is_partner_accountant = true
  )
);

DROP POLICY IF EXISTS "companies_write_service_only" ON equity_brain.companies;
CREATE POLICY "companies_write_service_only"
ON equity_brain.companies FOR ALL
TO service_role
USING (true) WITH CHECK (true);

-- ============================================================
-- 1.2 — equity_brain.company_partners
-- ============================================================
CREATE TABLE IF NOT EXISTS equity_brain.company_partners (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj          VARCHAR(14) NOT NULL REFERENCES equity_brain.companies(cnpj) ON DELETE CASCADE,

  nome          TEXT NOT NULL,
  cpf_cnpj      VARCHAR(14),
  tipo          VARCHAR(2),
  qualificacao  VARCHAR(50),
  data_entrada  DATE,

  -- Inferências (preenchidas pelo compute-signals)
  idade_estimada       INTEGER,
  is_provavel_fundador BOOLEAN,

  raw_data    JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partners_cnpj  ON equity_brain.company_partners(cnpj);
CREATE INDEX IF NOT EXISTS idx_partners_idade ON equity_brain.company_partners(idade_estimada);
CREATE INDEX IF NOT EXISTS idx_partners_tipo  ON equity_brain.company_partners(tipo);

DROP TRIGGER IF EXISTS trg_partners_updated_at ON equity_brain.company_partners;
CREATE TRIGGER trg_partners_updated_at
BEFORE UPDATE ON equity_brain.company_partners
FOR EACH ROW EXECUTE FUNCTION equity_brain.set_updated_at();

ALTER TABLE equity_brain.company_partners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "partners_read_admins_advisors" ON equity_brain.company_partners;
CREATE POLICY "partners_read_admins_advisors"
ON equity_brain.company_partners FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'advisor'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.is_partner_accountant = true
  )
);

DROP POLICY IF EXISTS "partners_write_service" ON equity_brain.company_partners;
CREATE POLICY "partners_write_service"
ON equity_brain.company_partners FOR ALL
TO service_role
USING (true) WITH CHECK (true);

-- ============================================================
-- 1.3 — equity_brain.company_signals + signal_catalog
-- ============================================================
CREATE TABLE IF NOT EXISTS equity_brain.company_signals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj          VARCHAR(14) NOT NULL REFERENCES equity_brain.companies(cnpj) ON DELETE CASCADE,

  signal_key    VARCHAR(60) NOT NULL,
  signal_value  NUMERIC,
  signal_text   TEXT,
  weight        NUMERIC DEFAULT 1,

  source        VARCHAR(40),
  confidence    NUMERIC DEFAULT 0.5,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (cnpj, signal_key)
);

CREATE INDEX IF NOT EXISTS idx_signals_cnpj   ON equity_brain.company_signals(cnpj);
CREATE INDEX IF NOT EXISTS idx_signals_key    ON equity_brain.company_signals(signal_key);
CREATE INDEX IF NOT EXISTS idx_signals_source ON equity_brain.company_signals(source);

DROP TRIGGER IF EXISTS trg_signals_updated_at ON equity_brain.company_signals;
CREATE TRIGGER trg_signals_updated_at
BEFORE UPDATE ON equity_brain.company_signals
FOR EACH ROW EXECUTE FUNCTION equity_brain.set_updated_at();

-- Catálogo de signals válidos
CREATE TABLE IF NOT EXISTS equity_brain.signal_catalog (
  signal_key      VARCHAR(60) PRIMARY KEY,
  category        VARCHAR(30),
  description     TEXT,
  default_weight  NUMERIC DEFAULT 1,
  affects_scores  TEXT[]
);

INSERT INTO equity_brain.signal_catalog (signal_key, category, description, default_weight, affects_scores) VALUES
  ('idade_empresa_15_plus',              'estrutural', 'Empresa com 15+ anos de operação',                                              20, ARRAY['ma_score']),
  ('idade_empresa_10_a_15',              'estrutural', 'Empresa entre 10 e 15 anos',                                                    12, ARRAY['ma_score']),
  ('fundador_55_plus',                   'sucessao',   'Sócio principal com 55+ anos (estimativa)',                                     25, ARRAY['ma_score','sucessao_score']),
  ('fundador_60_plus',                   'sucessao',   'Sócio principal com 60+ anos (estimativa)',                                     35, ARRAY['ma_score','sucessao_score']),
  ('socios_apenas_pf',                   'estrutural', 'Todos os sócios são pessoas físicas',                                           15, ARRAY['ma_score']),
  ('socio_unico',                        'estrutural', 'Apenas 1 sócio',                                                                10, ARRAY['vispe_score']),
  ('setor_consolidando',                 'mercado',    'Setor com M&A ativo',                                                           20, ARRAY['ma_score']),
  ('regiao_com_compradores_ativos',      'mercado',    'Região tem buyers cadastrados',                                                 15, ARRAY['ma_score']),
  ('cnae_recorrente',                    'estrutural', 'CNAE de receita recorrente (telecom, saúde, software)',                         10, ARRAY['ma_score']),
  ('porte_atrativo_ma',                  'estrutural', 'Porte médio (faturamento estimado R$5M-R$50M)',                                 15, ARRAY['ma_score']),
  ('capital_social_alto',                'estrutural', 'Capital social acima de R$ 500k',                                                5, ARRAY['ma_score']),
  ('sucessao_provavel',                  'sucessao',   'Combinação de idade do fundador + ausência de sócios jovens',                   30, ARRAY['ma_score','sucessao_score']),
  ('intencao_venda_explicita',           'comercial',  'Empresa cadastrada como listing PME.B3',                                        50, ARRAY['ma_score']),
  ('governanca_baixa',                   'governanca', 'Sem segregação societária, CNPJ familiar',                                       8, ARRAY['vispe_score']),
  ('oportunidade_cfo_vispe',             'governanca', 'Combinação de governança baixa + porte atrativo',                               25, ARRAY['vispe_score']),
  ('desorganizacao_financeira_provavel', 'governanca', 'Sinais de gestão informal (capital baixo + poucos funcionários + faturamento alto)', 20, ARRAY['vispe_score']),
  ('multiplos_socios_familia',           'sucessao',   'Sócios com mesmo sobrenome',                                                    10, ARRAY['sucessao_score']),
  ('empresa_ativa_situacao_regular',     'estrutural', 'Situação cadastral ATIVA na Receita',                                            5, ARRAY['ma_score','vispe_score'])
ON CONFLICT (signal_key) DO UPDATE SET
  description     = EXCLUDED.description,
  default_weight  = EXCLUDED.default_weight,
  affects_scores  = EXCLUDED.affects_scores;

ALTER TABLE equity_brain.company_signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "signals_read_admins_advisors" ON equity_brain.company_signals;
CREATE POLICY "signals_read_admins_advisors"
ON equity_brain.company_signals FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'advisor'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.is_partner_accountant = true
  )
);

DROP POLICY IF EXISTS "signals_write_service" ON equity_brain.company_signals;
CREATE POLICY "signals_write_service"
ON equity_brain.company_signals FOR ALL
TO service_role
USING (true) WITH CHECK (true);

ALTER TABLE equity_brain.signal_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "catalog_read_all_authenticated" ON equity_brain.signal_catalog;
CREATE POLICY "catalog_read_all_authenticated"
ON equity_brain.signal_catalog FOR SELECT
TO authenticated
USING (true);

-- ============================================================
-- 1.4 — equity_brain.cnae_setor_map
-- ============================================================
CREATE TABLE IF NOT EXISTS equity_brain.cnae_setor_map (
  cnae_principal   VARCHAR(10) PRIMARY KEY,
  setor_ma         VARCHAR(50) NOT NULL,
  subsetor_ma      VARCHAR(50),
  is_recorrente    BOOLEAN DEFAULT false,
  is_consolidando  BOOLEAN DEFAULT false,
  description      TEXT
);

INSERT INTO equity_brain.cnae_setor_map (cnae_principal, setor_ma, subsetor_ma, is_recorrente, is_consolidando, description) VALUES
  -- ISP / Telecom
  ('6110801', 'isp_telecom', 'isp_local',     true,  true,  'Serviços de telefonia fixa comutada (STFC)'),
  ('6110802', 'isp_telecom', 'isp_local',     true,  true,  'Telefonia fixa não comutada'),
  ('6190601', 'isp_telecom', 'isp_provedor',  true,  true,  'Provedores de acesso às redes de comunicações'),
  ('6190602', 'isp_telecom', 'isp_provedor',  true,  true,  'Provedores de voz por telefone IP - VOIP'),
  ('6190699', 'isp_telecom', 'isp_outros',    true,  true,  'Outras atividades de telecomunicações n.e.'),
  ('6120501', 'isp_telecom', 'isp_movel',     true,  true,  'Telefonia móvel celular'),
  ('6141800', 'isp_telecom', 'isp_tv',        true,  true,  'Operadoras de televisão por assinatura por cabo'),
  ('6142600', 'isp_telecom', 'isp_satelite',  true,  true,  'Operadoras de televisão por assinatura por microondas'),
  -- Saúde
  ('8630501', 'saude',       'clinica_medica', true, true,  'Atividade médica ambulatorial'),
  ('8630502', 'saude',       'clinica_medica', true, true,  'Atividade médica ambulatorial com recursos diagnósticos'),
  ('8630503', 'saude',       'clinica_medica', true, true,  'Atividade médica ambulatorial restrita a consultas'),
  ('8640201', 'saude',       'laboratorio',    true, true,  'Laboratórios de anatomia patológica e citológica'),
  ('8640202', 'saude',       'laboratorio',    true, true,  'Laboratórios clínicos'),
  -- Indústria
  ('2511000', 'industria',   'metal',          false, false, 'Fabricação de estruturas metálicas'),
  ('1610203', 'industria',   'madeira',        false, false, 'Serrarias com desdobramento de madeira em bruto'),
  -- Tecnologia / SaaS
  ('6201501', 'tecnologia',  'desenvolvimento_software', true, true, 'Desenvolvimento de programas de computador sob encomenda'),
  ('6202300', 'tecnologia',  'software_pronto',          true, true, 'Desenvolvimento e licenciamento de programas de computador customizáveis'),
  ('6311900', 'tecnologia',  'data_center',              true, true, 'Tratamento de dados, hospedagem e atividades relacionadas')
ON CONFLICT (cnae_principal) DO UPDATE SET
  setor_ma        = EXCLUDED.setor_ma,
  subsetor_ma     = EXCLUDED.subsetor_ma,
  is_recorrente   = EXCLUDED.is_recorrente,
  is_consolidando = EXCLUDED.is_consolidando;

CREATE INDEX IF NOT EXISTS idx_cnae_map_setor ON equity_brain.cnae_setor_map(setor_ma);

ALTER TABLE equity_brain.cnae_setor_map ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cnae_map_read_all" ON equity_brain.cnae_setor_map;
CREATE POLICY "cnae_map_read_all"
ON equity_brain.cnae_setor_map FOR SELECT
TO authenticated
USING (true);