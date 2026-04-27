
-- ============================================
-- ETAPA 5 — Mais 13 buyers ISP reais (8 → 21)
-- ============================================

-- Idempotência: limpa execuções anteriores deste seed específico
DELETE FROM equity_brain.buyer_theses
 WHERE buyer_id IN (SELECT id FROM equity_brain.buyers WHERE source = 'seed_isp_phase10b');
DELETE FROM equity_brain.buyers WHERE source = 'seed_isp_phase10b';

WITH inserted AS (
  INSERT INTO equity_brain.buyers
    (nome, tipo, ticket_min, ticket_max, setores_interesse, ufs_interesse,
     porte_alvo, sinergias_chave, status, source, observacoes)
  VALUES
  -- Estratégicos regionais (8)
  ('Mob Telecom',
    'estrategico', 5000000, 80000000,
    ARRAY['telecom']::text[],
    ARRAY['CE','RN','PB','PE']::text[],
    ARRAY['demais','EPP','ME']::text[],
    ARRAY['carteira_clientes','rede_fibra']::text[],
    'ativo', 'seed_isp_phase10b',
    'Operador cearense em fase de consolidação. Adquire ISPs municipais para densificar área de cobertura no NE.'),
  ('Brasil TecPar',
    'estrategico', 8000000, 120000000,
    ARRAY['telecom']::text[],
    ARRAY['SC','PR','RS','SP']::text[],
    ARRAY['demais','EPP']::text[],
    ARRAY['carteira_clientes','b2b','data_center']::text[],
    'ativo', 'seed_isp_phase10b',
    'Player Sul-Sudeste com tese híbrida residencial+B2B. Compra ISPs com infra de fibra estabelecida.'),
  ('Sumicity',
    'estrategico', 5000000, 100000000,
    ARRAY['telecom']::text[],
    ARRAY['RJ','MG','ES']::text[],
    ARRAY['demais','EPP','ME']::text[],
    ARRAY['carteira_clientes','rede_fibra']::text[],
    'ativo', 'seed_isp_phase10b',
    'Consolidador atuante no Sudeste, foco em municípios médios. Aceita ISPs com fibra recente.'),
  ('Giga+ Fibra',
    'estrategico', 5000000, 80000000,
    ARRAY['telecom']::text[],
    ARRAY['BA','SE','AL']::text[],
    ARRAY['demais','EPP','ME']::text[],
    ARRAY['carteira_clientes','rede_fibra','expansao_geografica']::text[],
    'ativo', 'seed_isp_phase10b',
    'Operadora baiana com tese de expansão pelo NE costeiro. Foco em provedores 1-10k assinantes.'),
  ('Ligga Telecom',
    'estrategico', 10000000, 200000000,
    ARRAY['telecom']::text[],
    ARRAY['PR','SC','SP']::text[],
    ARRAY['demais','EPP']::text[],
    ARRAY['rede_backbone','b2b','licenca_anatel']::text[],
    'ativo', 'seed_isp_phase10b',
    'Sucessora da Copel Telecom. Foco em B2B + carteira premium no Paraná. Ticket maior, exigente em qualidade operacional.'),
  ('Veek Internet',
    'estrategico', 3000000, 50000000,
    ARRAY['telecom']::text[],
    ARRAY['SC','RS']::text[],
    ARRAY['demais','EPP','ME']::text[],
    ARRAY['carteira_clientes','marca_local']::text[],
    'ativo', 'seed_isp_phase10b',
    'Provedor catarinense crescente via aquisições. Compra carteiras pequenas (1-5k) para crescer base.'),
  ('Sercomtel',
    'estrategico', 15000000, 250000000,
    ARRAY['telecom']::text[],
    ARRAY['PR']::text[],
    ARRAY['demais','EPP']::text[],
    ARRAY['rede_backbone','b2b','infra_anatel']::text[],
    'ativo', 'seed_isp_phase10b',
    'Operadora histórica de Londrina, hoje com PE como acionista. Adquire ISPs no PR para densificar.'),
  ('Wevo Networks',
    'estrategico', 5000000, 80000000,
    ARRAY['telecom']::text[],
    ARRAY['PA','AM','RO','TO']::text[],
    ARRAY['demais','EPP','ME']::text[],
    ARRAY['carteira_clientes','rede_fibra','expansao_geografica']::text[],
    'ativo', 'seed_isp_phase10b',
    'Player do Norte/Centro-Oeste em tese de consolidação amazônica. Ticket flexível, busca operações com licença Anatel ativa.'),
  -- Fundos PE / family offices (5)
  ('Crescera Capital',
    'financeiro_fundo', 20000000, 200000000,
    ARRAY['telecom','infra']::text[],
    ARRAY['SP','RJ','MG','RS','SC','PR','BA','PE']::text[],
    ARRAY['demais','EPP']::text[],
    ARRAY['plataforma_consolidacao','tese_roll_up']::text[],
    'ativo', 'seed_isp_phase10b',
    'Fundo brasileiro com tese explícita de M&A em telecom. Histórico de plataformas no Sudeste e Sul.'),
  ('Performa Investimentos',
    'financeiro_fundo', 15000000, 150000000,
    ARRAY['telecom']::text[],
    ARRAY['SP','RJ','MG','RS','SC','PR']::text[],
    ARRAY['demais','EPP']::text[],
    ARRAY['turnaround','reestruturacao_divida','plataforma_consolidacao']::text[],
    'ativo', 'seed_isp_phase10b',
    'Fundo de growth/turnaround. Aceita ISPs com estresse operacional desde que carteira seja saneável.'),
  ('Bain Capital LATAM',
    'financeiro_fundo', 100000000, 2000000000,
    ARRAY['telecom','infra']::text[],
    ARRAY['SP','RJ','MG','RS','BA']::text[],
    ARRAY['demais']::text[],
    ARRAY['tese_infra','plataforma_consolidacao']::text[],
    'ativo', 'seed_isp_phase10b',
    'Fundo global ativo em ISPs LATAM. Ticket alto, busca líderes regionais ou plataformas escaláveis.'),
  ('General Atlantic',
    'financeiro_fundo', 80000000, 1500000000,
    ARRAY['telecom','infra','tech']::text[],
    ARRAY['SP','RJ','MG','RS','SC','PR']::text[],
    ARRAY['demais']::text[],
    ARRAY['plataforma_consolidacao','tese_growth']::text[],
    'ativo', 'seed_isp_phase10b',
    'Fundo global de growth. Foco em plataformas tech/digital — telecom como infra digital se houver tese de produto.'),
  ('Family Office Lerner — Telecom Sul',
    'family_office', 10000000, 60000000,
    ARRAY['telecom']::text[],
    ARRAY['RS','SC','PR']::text[],
    ARRAY['demais','EPP','ME']::text[],
    ARRAY['carteira_clientes','b2b']::text[],
    'ativo', 'seed_isp_phase10b',
    'Family office com expertise em telecom Sul. Ticket médio, paciente, preferência por aquisições com sucessão familiar amigável.')
  RETURNING id, nome
)
INSERT INTO equity_brain.buyer_theses (buyer_id, thesis_key, prioridade, active, custom_notes)
SELECT i.id, t.thesis_key, t.prioridade, true, t.notes
FROM inserted i
JOIN (VALUES
  ('Mob Telecom',                   'isp_consolidacao_regional', 1, 'Densificar NE'),
  ('Mob Telecom',                   'isp_sucessao',              2, NULL),
  ('Brasil TecPar',                 'isp_consolidacao_regional', 1, 'Híbrido residencial+B2B'),
  ('Brasil TecPar',                 'isp_carteira_premium',      2, 'B2B premium'),
  ('Sumicity',                      'isp_consolidacao_regional', 1, 'Sudeste municípios médios'),
  ('Sumicity',                      'isp_capex_estresse',        2, NULL),
  ('Giga+ Fibra',                   'isp_consolidacao_regional', 1, 'NE costeiro'),
  ('Giga+ Fibra',                   'isp_sucessao',              2, NULL),
  ('Ligga Telecom',                 'isp_carteira_premium',      1, 'B2B premium PR'),
  ('Ligga Telecom',                 'isp_consolidacao_regional', 2, NULL),
  ('Veek Internet',                 'isp_consolidacao_regional', 1, 'Carteiras pequenas SC/RS'),
  ('Sercomtel',                     'isp_carteira_premium',      1, 'B2B premium Londrina'),
  ('Sercomtel',                     'isp_consolidacao_regional', 2, 'Densificar PR'),
  ('Wevo Networks',                 'isp_consolidacao_regional', 1, 'Consolidação amazônica'),
  ('Wevo Networks',                 'isp_fadiga_regulatoria',    2, 'Aceita ISPs com débito regulatório'),
  ('Crescera Capital',              'isp_consolidacao_regional', 1, 'Plataforma SE/Sul'),
  ('Crescera Capital',              'isp_carteira_premium',      2, NULL),
  ('Crescera Capital',              'isp_capex_estresse',        3, NULL),
  ('Performa Investimentos',        'isp_fadiga_regulatoria',    1, 'Turnaround'),
  ('Performa Investimentos',        'isp_capex_estresse',        2, NULL),
  ('Performa Investimentos',        'isp_consolidacao_regional', 3, NULL),
  ('Bain Capital LATAM',            'isp_carteira_premium',      1, 'Líderes regionais'),
  ('Bain Capital LATAM',            'isp_consolidacao_regional', 2, 'Plataforma'),
  ('General Atlantic',              'isp_carteira_premium',      1, 'Tech/digital adjacente'),
  ('General Atlantic',              'isp_consolidacao_regional', 2, NULL),
  ('Family Office Lerner — Telecom Sul', 'isp_sucessao',         1, 'Sucessão familiar amigável'),
  ('Family Office Lerner — Telecom Sul', 'isp_carteira_premium', 2, NULL)
) AS t(buyer_nome, thesis_key, prioridade, notes)
  ON i.nome = t.buyer_nome;

-- ============================================
-- ETAPA 6.a — Versionamento da fórmula de score (Fase 12)
-- ============================================

CREATE TABLE IF NOT EXISTS equity_brain.score_engine_versions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version         text UNIQUE NOT NULL,
  description     text,
  weights_json    jsonb NOT NULL,
  thresholds_json jsonb NOT NULL,
  activated_at    timestamptz,
  deactivated_at  timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid REFERENCES auth.users(id),
  notes           text
);

ALTER TABLE equity_brain.score_engine_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage score_engine_versions" ON equity_brain.score_engine_versions;
CREATE POLICY "Admins manage score_engine_versions"
  ON equity_brain.score_engine_versions
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Advisors view score_engine_versions" ON equity_brain.score_engine_versions;
CREATE POLICY "Advisors view score_engine_versions"
  ON equity_brain.score_engine_versions
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'advisor'::public.app_role));

GRANT SELECT, INSERT, UPDATE ON equity_brain.score_engine_versions TO authenticated;

-- Coluna de rastreabilidade no company_scores
ALTER TABLE equity_brain.company_scores
  ADD COLUMN IF NOT EXISTS score_engine_version text NOT NULL DEFAULT 'v1.0';

CREATE INDEX IF NOT EXISTS company_scores_engine_version_idx
  ON equity_brain.company_scores (score_engine_version);

-- Seed v1.0: snapshot dos pesos atuais
INSERT INTO equity_brain.score_engine_versions (version, description, weights_json, thresholds_json, activated_at, notes)
SELECT
  'v1.0',
  'Versão inicial em produção. Snapshot dos pesos do signal_catalog ao final da Fase 10 (vertical ISP), mantendo thresholds clássicos.',
  jsonb_build_object(
    'signals', (
      SELECT jsonb_object_agg(signal_key, default_weight)
      FROM equity_brain.signal_catalog
    )
  ),
  jsonb_build_object(
    'tier_premium_min',   80,
    'tier_strong_min',    60,
    'tier_standard_min',  0,
    'opportunity_min',    50
  ),
  now(),
  'Versão automaticamente seedada via migração da Fase 12 (bloco 5).'
ON CONFLICT (version) DO NOTHING;
