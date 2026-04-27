-- ============================================================
-- FASE 3 — Compradores Estratégicos e Teses (Equity Brain)
-- ============================================================

-- A) Catálogo de teses de investimento
CREATE TABLE IF NOT EXISTS equity_brain.investment_theses (
  thesis_key      VARCHAR(40) PRIMARY KEY,
  category        VARCHAR(30),
  display_name    VARCHAR(80),
  description     TEXT,
  required_signals TEXT[],
  boosting_signals TEXT[],
  default_pitch_template TEXT,
  active          BOOLEAN DEFAULT true
);

ALTER TABLE equity_brain.investment_theses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "theses_read_authenticated" ON equity_brain.investment_theses;
CREATE POLICY "theses_read_authenticated"
ON equity_brain.investment_theses FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "theses_write_admin" ON equity_brain.investment_theses;
CREATE POLICY "theses_write_admin"
ON equity_brain.investment_theses FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Seed do catálogo
INSERT INTO equity_brain.investment_theses (thesis_key, category, display_name, description, required_signals, boosting_signals, default_pitch_template) VALUES
  ('consolidacao_regional', 'consolidacao',
   'Consolidação regional',
   'Compradores regionais buscam densidade comprando players locais. Empresa-alvo é provedor maduro em região com consolidação ativa.',
   ARRAY['setor_consolidando','regiao_com_compradores_ativos'],
   ARRAY['idade_empresa_15_plus','porte_atrativo_ma','cnae_recorrente'],
   'Vi que vocês operam há {idade_empresa} anos em {regiao}. Estamos vendo {qtd_compradores} grupos ativos consolidando o setor na região. Empresas como a sua, com base recorrente, costumam atrair múltiplos acima da média.'),
  ('sucessao_familiar', 'sucessao',
   'Sucessão familiar',
   'Empresa madura com fundador acima de 55 anos sem sucessor operacional claro. Compradores oferecem saída líquida.',
   ARRAY['fundador_55_plus','idade_empresa_15_plus'],
   ARRAY['multiplos_socios_familia','socios_apenas_pf','sucessao_provavel'],
   'Empresas com perfil similar ao seu (operação consolidada de {idade_empresa} anos, fundador atuante) costumam enfrentar 3 caminhos: sucessão, expansão ou venda estratégica. Posso compartilhar como outros donos lidaram?'),
  ('roll_up_setor', 'consolidacao',
   'Roll-up setorial por fundo',
   'Fundo busca múltiplas empresas pequenas/médias do mesmo setor para criar plataforma maior e revender com prêmio.',
   ARRAY['setor_consolidando','porte_atrativo_ma'],
   ARRAY['cnae_recorrente','capital_social_alto'],
   'Existe um fundo ativo no setor de {setor} comprando empresas como a sua para formar plataforma. Isso pode ser oportunidade ou ameaça, dependendo de quem chegar primeiro.'),
  ('aquisicao_carteira', 'sinergia',
   'Aquisição de carteira',
   'Comprador maior na mesma região quer absorver carteira de clientes para ganho de eficiência.',
   ARRAY['cnae_recorrente','regiao_com_compradores_ativos'],
   ARRAY['idade_empresa_10_a_15','porte_atrativo_ma'],
   'O grupo {comprador} está expandindo carteira em {regiao}. Empresas como a sua, com base recorrente fidelizada, são alvo prioritário.'),
  ('ganho_margem_governanca', 'sinergia',
   'Ganho de margem via governança (entrada Vispe)',
   'Empresa-alvo tem margem comprimida por desorganização. Antes de vender, ganhar 2-5pp de margem multiplica valuation.',
   ARRAY['oportunidade_cfo_vispe'],
   ARRAY['governanca_baixa','desorganizacao_financeira_provavel'],
   'Antes de pensar em venda ou crescimento, o que está deixando dinheiro na mesa hoje é {gap_governanca}. Em 6-12 meses isso pode dobrar seu valuation.')
ON CONFLICT (thesis_key) DO UPDATE SET
  category = EXCLUDED.category,
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  required_signals = EXCLUDED.required_signals,
  boosting_signals = EXCLUDED.boosting_signals,
  default_pitch_template = EXCLUDED.default_pitch_template;

-- ============================================================
-- B) Tabela buyers
-- ============================================================
CREATE TABLE IF NOT EXISTS equity_brain.buyers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            TEXT NOT NULL,
  tipo            VARCHAR(20) NOT NULL,
  cnpj            VARCHAR(14),
  website         TEXT,
  ticket_min      NUMERIC(15,2),
  ticket_max      NUMERIC(15,2),
  porte_alvo      TEXT[],
  setores_interesse TEXT[],
  subsetores_interesse TEXT[],
  ufs_interesse   TEXT[],
  municipios_interesse TEXT[],
  sinergias_chave TEXT[],
  status          VARCHAR(20) DEFAULT 'ativo',
  ultimo_contato_em DATE,
  observacoes     TEXT,
  deals_realizados INTEGER DEFAULT 0,
  responsavel_id  UUID, -- vínculo lógico para auth.users(id), sem FK direta
  source          VARCHAR(30) DEFAULT 'manual',
  raw_data        JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buyers_setores ON equity_brain.buyers USING GIN (setores_interesse);
CREATE INDEX IF NOT EXISTS idx_buyers_ufs     ON equity_brain.buyers USING GIN (ufs_interesse);
CREATE INDEX IF NOT EXISTS idx_buyers_status  ON equity_brain.buyers(status);

DROP TRIGGER IF EXISTS trg_buyers_updated_at ON equity_brain.buyers;
CREATE TRIGGER trg_buyers_updated_at
BEFORE UPDATE ON equity_brain.buyers
FOR EACH ROW EXECUTE FUNCTION equity_brain.set_updated_at();

ALTER TABLE equity_brain.buyers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "buyers_read_admins_advisors" ON equity_brain.buyers;
CREATE POLICY "buyers_read_admins_advisors" ON equity_brain.buyers FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advisor'));

DROP POLICY IF EXISTS "buyers_write_admin" ON equity_brain.buyers;
CREATE POLICY "buyers_write_admin" ON equity_brain.buyers FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "buyers_service_full" ON equity_brain.buyers;
CREATE POLICY "buyers_service_full" ON equity_brain.buyers FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- ============================================================
-- C) Tabela buyer_theses (vínculo buyer ↔ tese)
-- ============================================================
CREATE TABLE IF NOT EXISTS equity_brain.buyer_theses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id        UUID NOT NULL REFERENCES equity_brain.buyers(id) ON DELETE CASCADE,
  thesis_key      VARCHAR(40) NOT NULL REFERENCES equity_brain.investment_theses(thesis_key),
  prioridade      INTEGER DEFAULT 1,
  custom_notes    TEXT,
  custom_pitch    TEXT,
  active          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (buyer_id, thesis_key)
);

CREATE INDEX IF NOT EXISTS idx_buyer_theses_buyer ON equity_brain.buyer_theses(buyer_id);

ALTER TABLE equity_brain.buyer_theses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "buyer_theses_read" ON equity_brain.buyer_theses;
CREATE POLICY "buyer_theses_read" ON equity_brain.buyer_theses FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advisor'));

DROP POLICY IF EXISTS "buyer_theses_write_admin" ON equity_brain.buyer_theses;
CREATE POLICY "buyer_theses_write_admin" ON equity_brain.buyer_theses FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "buyer_theses_service_full" ON equity_brain.buyer_theses;
CREATE POLICY "buyer_theses_service_full" ON equity_brain.buyer_theses FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- ============================================================
-- D) Seed de buyers ISP placeholder (idempotente por nome)
-- ============================================================
INSERT INTO equity_brain.buyers (nome, tipo, ticket_min, ticket_max, porte_alvo, setores_interesse, subsetores_interesse, ufs_interesse, sinergias_chave, status, observacoes, source)
SELECT * FROM (VALUES
  ('ISP Consolidador Sul', 'estrategico', 1000000::numeric, 30000000::numeric, ARRAY['ME','EPP','MEDIA'], ARRAY['isp_telecom'], ARRAY['isp_local','isp_provedor'], ARRAY['RS','SC','PR'], ARRAY['densidade_geografica','base_clientes'], 'ativo', 'Placeholder — ajustar com dados reais', 'manual'),
  ('Grupo ISP Nacional', 'estrategico', 5000000::numeric, 200000000::numeric, ARRAY['MEDIA','GRANDE'], ARRAY['isp_telecom'], ARRAY['isp_provedor','isp_movel'], NULL::text[], ARRAY['densidade_geografica','tecnologia'], 'ativo', 'Placeholder', 'manual'),
  ('Fundo Roll-up Telecom', 'financeiro_fundo', 3000000::numeric, 80000000::numeric, ARRAY['EPP','MEDIA'], ARRAY['isp_telecom'], ARRAY['isp_local','isp_provedor'], NULL::text[], ARRAY['base_clientes','carteira'], 'ativo', 'Placeholder', 'manual'),
  ('Family Office RS Telecom', 'family_office', 500000::numeric, 15000000::numeric, ARRAY['ME','EPP'], ARRAY['isp_telecom'], ARRAY['isp_local'], ARRAY['RS'], ARRAY['densidade_geografica'], 'ativo', 'Placeholder', 'manual'),
  ('Concorrente Regional Caxias', 'concorrente', 800000::numeric, 12000000::numeric, ARRAY['ME','EPP'], ARRAY['isp_telecom'], ARRAY['isp_local','isp_provedor'], ARRAY['RS'], ARRAY['densidade_geografica','base_clientes'], 'ativo', 'Placeholder', 'manual')
) AS v(nome, tipo, ticket_min, ticket_max, porte_alvo, setores_interesse, subsetores_interesse, ufs_interesse, sinergias_chave, status, observacoes, source)
WHERE NOT EXISTS (
  SELECT 1 FROM equity_brain.buyers b WHERE b.nome = v.nome
);

-- ============================================================
-- E) Vinculação de teses por buyer (idempotente via UNIQUE)
-- ============================================================
WITH b AS (
  SELECT id, nome FROM equity_brain.buyers
  WHERE source='manual' AND setores_interesse @> ARRAY['isp_telecom']::text[]
)
INSERT INTO equity_brain.buyer_theses (buyer_id, thesis_key, prioridade)
SELECT b.id, t.thesis_key,
  CASE
    WHEN b.nome LIKE '%Consolidador%' AND t.thesis_key='consolidacao_regional' THEN 1
    WHEN b.nome LIKE '%Nacional%'     AND t.thesis_key IN ('consolidacao_regional','aquisicao_carteira') THEN 1
    WHEN b.nome LIKE '%Fundo%'        AND t.thesis_key='roll_up_setor' THEN 1
    WHEN b.nome LIKE '%Family%'       AND t.thesis_key IN ('sucessao_familiar','consolidacao_regional') THEN 1
    WHEN b.nome LIKE '%Concorrente%'  AND t.thesis_key='aquisicao_carteira' THEN 1
    ELSE 2
  END
FROM b CROSS JOIN equity_brain.investment_theses t
WHERE
  (b.nome LIKE '%Consolidador%' AND t.thesis_key IN ('consolidacao_regional','aquisicao_carteira')) OR
  (b.nome LIKE '%Nacional%'     AND t.thesis_key IN ('consolidacao_regional','aquisicao_carteira','roll_up_setor')) OR
  (b.nome LIKE '%Fundo%'        AND t.thesis_key IN ('roll_up_setor','consolidacao_regional')) OR
  (b.nome LIKE '%Family%'       AND t.thesis_key IN ('sucessao_familiar','consolidacao_regional')) OR
  (b.nome LIKE '%Concorrente%'  AND t.thesis_key IN ('aquisicao_carteira','consolidacao_regional'))
ON CONFLICT (buyer_id, thesis_key) DO NOTHING;