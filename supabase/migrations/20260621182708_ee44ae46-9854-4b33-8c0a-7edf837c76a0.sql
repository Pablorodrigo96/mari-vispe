
-- Onda 3: Buyer map enriquecido + DCF/SDE
ALTER TABLE public.equity_valuations
  ADD COLUMN IF NOT EXISTS ebitda_contabil NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS valor_dcf NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS valor_sde NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS valor_triangulado NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS dcf_premissas JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.equity_buyer_map
  ADD COLUMN IF NOT EXISTS setor_alvo TEXT,
  ADD COLUMN IF NOT EXISTS sinergias JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS racional_premio TEXT,
  ADD COLUMN IF NOT EXISTS exemplos_targets JSONB DEFAULT '[]'::jsonb;

-- Tabela de arquétipos de comprador (referência global, leitura ampla)
CREATE TABLE IF NOT EXISTS public.equity_buyer_archetypes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_arquetipo_id TEXT NOT NULL,
  arquetipo_comprador TEXT NOT NULL,
  nome_perfil TEXT NOT NULL,
  setor_alvo TEXT,
  tese_padrao TEXT NOT NULL,
  premio_tipico_min NUMERIC(5,2) DEFAULT 0,
  premio_tipico_max NUMERIC(5,2) DEFAULT 0,
  sinergias_padrao JSONB DEFAULT '[]'::jsonb,
  exemplos_targets JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_buyer_arq_seller ON public.equity_buyer_archetypes(seller_arquetipo_id);
GRANT SELECT ON public.equity_buyer_archetypes TO authenticated;
GRANT ALL ON public.equity_buyer_archetypes TO service_role;
ALTER TABLE public.equity_buyer_archetypes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Buyer archetypes are readable by authenticated" ON public.equity_buyer_archetypes;
CREATE POLICY "Buyer archetypes are readable by authenticated"
  ON public.equity_buyer_archetypes FOR SELECT TO authenticated USING (true);

-- Seed
INSERT INTO public.equity_buyer_archetypes
(seller_arquetipo_id, arquetipo_comprador, nome_perfil, setor_alvo, tese_padrao, premio_tipico_min, premio_tipico_max, sinergias_padrao, exemplos_targets)
VALUES
-- SaaS/Recorrente
('saas_recorrente','estrategico','Player consolidador de SaaS vertical','SaaS','Consolidação de carteira: integra base de clientes recorrentes em portfólio existente para cross-sell',15,30,
 '["cross-sell de produto","redução de CAC pela base unificada","economia em infraestrutura cloud","time comercial compartilhado"]',
 '["TOTVS","Linx","Senior Sistemas","Bling/Locaweb"]'),
('saas_recorrente','financeiro','PE de software mid-market','SaaS','Roll-up: plataforma de M&A para consolidar verticais fragmentadas de software',10,20,
 '["múltiplo de plataforma","alavancagem financeira","profissionalização da gestão"]',
 '["Riverwood","H.I.G.","Crescera","Vinci Partners"]'),
('saas_recorrente','individual','Executivo SaaS com search fund','SaaS','Operador-comprador que assume gestão e escala via PLG',5,12,
 '["expertise operacional","capital paciente"]','[]'),

-- Servicos recorrentes (contábil, jurídico, manutenção)
('servicos_recorrente','estrategico','Grupo nacional de serviços B2B','Serviços','Aquisição de base de contratos para densidade regional e cross-sell de novos produtos',12,25,
 '["densidade geográfica","cross-sell de serviços adjacentes","compartilhamento de backoffice"]',
 '["GPS","Verzani & Sandrini","Atento","grupos contábeis nacionais"]'),
('servicos_recorrente','financeiro','PE focado em serviços','Serviços','Tese de plataforma com IRR alvo de 25%, foco em margem e retenção',10,18,
 '["alavancagem","governança","M&A bolt-on"]',
 '["Pátria","Kinea","IG4","Bain Capital"]'),
('servicos_recorrente','individual','Operador-comprador setor','Serviços','Assume operação para escalar via excelência operacional',3,8,'[]','[]'),

-- Produto/IP
('produto_ip','estrategico','Multinacional do setor','Indústria/Tech','Aquisição de tecnologia/IP defensável para acelerar roadmap próprio',20,40,
 '["IP defensável","time R&D","aceleração de roadmap","entrada em novo mercado"]',
 '["multinacionais do setor","big tech via squad acqui-hire"]'),
('produto_ip','financeiro','PE growth com tese de IP','Indústria/Tech','Plataforma de tecnologia escalável globalmente',15,25,
 '["múltiplos de tech","exit estratégico em 5 anos"]',
 '["General Atlantic","Riverwood","SoftBank LatAm"]'),
('produto_ip','individual','Empreendedor serial de tech','Tech','Captura de IP para reposicionar próprio portfolio',8,15,'[]','[]'),

-- Servico profissional
('servico_profissional','estrategico','Consolidador do segmento','Serviços profissionais','Aquisição de carteira e talento sênior para entrar em vertical/região',5,12,
 '["aquisição de talento","carteira de clientes","cross-sell"]',
 '["grandes escritórios consolidadores"]'),
('servico_profissional','financeiro','PE search fund','Serviços','Tese de profissionalização e processo',3,8,
 '["governança","sistemas"]',
 '["search funds independentes"]'),
('servico_profissional','individual','Sócio sucessor','Serviços profissionais','Sucessão familiar/societária com earn-out',0,5,
 '["continuidade de marca"]','[]'),

-- Projeto/Obra
('projeto_obra','estrategico','Grupo construtor nacional','Construção','Aquisição de backlog e licenças para entrar em região',5,10,
 '["backlog contratado","relacionamento público","know-how regulatório"]',
 '["construtoras nacionais","grupos de infraestrutura"]'),
('projeto_obra','financeiro','Fundo de infraestrutura','Infra','Cashflow contratado de longo prazo',3,7,
 '["yield de longo prazo"]',
 '["IG4","Pátria Infra","Vinci Infra"]'),
('projeto_obra','individual','Empresário do setor','Construção','Continuidade com sucessão familiar',0,3,'[]','[]'),

-- Distribuidor
('distribuidor','estrategico','Indústria fabricante','Distribuição','Verticalização: industria comprando canal próprio para garantir distribuição',15,30,
 '["canal próprio","margem da indústria capturada","dados de sell-out","ponto comercial"]',
 '["fabricantes nacionais e multinacionais do segmento"]'),
('distribuidor','financeiro','PE de consumo/varejo','Distribuição','Consolidação regional com tese de escala',8,15,
 '["escala em compras","logística otimizada"]',
 '["L Catterton","Advent","HIG Capital"]'),
('distribuidor','individual','Family office regional','Distribuição','Sucessão e diversificação patrimonial',0,5,'[]','[]')
ON CONFLICT DO NOTHING;
