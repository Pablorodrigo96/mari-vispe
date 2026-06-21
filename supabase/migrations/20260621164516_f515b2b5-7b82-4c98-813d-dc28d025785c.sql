
-- =====================================================
-- EQUITY PLANNER — Schema, RLS, Grants, Seeds
-- =====================================================

-- 1) ARQUÉTIPOS (calibração)
CREATE TABLE public.equity_archetypes (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  exemplos_setor TEXT[],
  pesos_dimensoes JSONB NOT NULL, -- {independencia_dono: 0.16, ...}
  kpis JSONB DEFAULT '[]'::jsonb,
  killers JSONB DEFAULT '[]'::jsonb,
  universo_compradores JSONB DEFAULT '[]'::jsonb,
  faixa_multiplo_min NUMERIC(5,2) NOT NULL,
  faixa_multiplo_max NUMERIC(5,2) NOT NULL,
  piso_liquidez INT NOT NULL DEFAULT 45,
  ordem INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.equity_archetypes TO authenticated, anon;
GRANT ALL ON public.equity_archetypes TO service_role;
ALTER TABLE public.equity_archetypes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Archetypes readable by all" ON public.equity_archetypes FOR SELECT USING (true);
CREATE POLICY "Admins manage archetypes" ON public.equity_archetypes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2) COMPS BENCHMARKS
CREATE TABLE public.equity_comps_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arquetipo_id TEXT NOT NULL REFERENCES public.equity_archetypes(id) ON DELETE CASCADE,
  porte TEXT NOT NULL, -- 'micro' | 'pequena' | 'media' | 'grande'
  setor TEXT,
  multiplo_min NUMERIC(5,2) NOT NULL,
  multiplo_max NUMERIC(5,2) NOT NULL,
  metrica TEXT NOT NULL DEFAULT 'EBITDA',
  fonte TEXT,
  vigencia DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.equity_comps_benchmarks TO authenticated, anon;
GRANT ALL ON public.equity_comps_benchmarks TO service_role;
ALTER TABLE public.equity_comps_benchmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comps readable by all" ON public.equity_comps_benchmarks FOR SELECT USING (true);
CREATE POLICY "Admins manage comps" ON public.equity_comps_benchmarks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3) INITIATIVE LIBRARY
CREATE TABLE public.equity_initiative_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arquetipo_id TEXT REFERENCES public.equity_archetypes(id) ON DELETE CASCADE,
  dimensao TEXT NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  delta_ipe_padrao INT DEFAULT 5,
  esforco TEXT DEFAULT 'medio', -- 'baixo' | 'medio' | 'alto'
  prazo_meses INT DEFAULT 3,
  tipo TEXT DEFAULT 'execucao', -- 'execucao' | 'migracao_arquetipo' | 'derisk'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.equity_initiative_library TO authenticated, anon;
GRANT ALL ON public.equity_initiative_library TO service_role;
ALTER TABLE public.equity_initiative_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Initiative library readable by all" ON public.equity_initiative_library FOR SELECT USING (true);
CREATE POLICY "Admins manage initiative library" ON public.equity_initiative_library FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4) EQUITY COMPANIES
CREATE TABLE public.equity_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  razao_social TEXT,
  cnpj TEXT,
  setor_livre TEXT,
  arquetipo_id TEXT REFERENCES public.equity_archetypes(id),
  porte TEXT, -- 'micro' | 'pequena' | 'media' | 'grande'
  regime_tributario TEXT,
  uf TEXT,
  cidade TEXT,
  cnae TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_equity_companies_user ON public.equity_companies(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equity_companies TO authenticated;
GRANT ALL ON public.equity_companies TO service_role;
ALTER TABLE public.equity_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages company" ON public.equity_companies FOR ALL TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'advisor'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'advisor'));

-- 5) ASSESSMENTS
CREATE TABLE public.equity_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.equity_companies(id) ON DELETE CASCADE,
  arquetipo_id TEXT REFERENCES public.equity_archetypes(id),
  arquetipo_sugerido TEXT REFERENCES public.equity_archetypes(id),
  confianca_arquetipo NUMERIC(3,2),
  ipe_composto INT,
  veredito_liquidez TEXT, -- 'vendavel_hoje' | 'vendavel_em_meses' | 'inviavel'
  source TEXT NOT NULL DEFAULT 'wizard', -- 'wizard' | 'meeting_paste'
  raw_intake JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'computed' | 'archived'
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_equity_assessments_user ON public.equity_assessments(user_id);
CREATE INDEX idx_equity_assessments_company ON public.equity_assessments(company_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equity_assessments TO authenticated;
GRANT ALL ON public.equity_assessments TO service_role;
ALTER TABLE public.equity_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads assessments" ON public.equity_assessments FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'advisor'));
CREATE POLICY "Owner writes assessments" ON public.equity_assessments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner updates assessments" ON public.equity_assessments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'advisor'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'advisor'));
CREATE POLICY "Owner deletes assessments" ON public.equity_assessments FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 6) DIMENSION SCORES
CREATE TABLE public.equity_dimension_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.equity_assessments(id) ON DELETE CASCADE,
  dimensao TEXT NOT NULL,
  score INT NOT NULL CHECK (score >= 0 AND score <= 100),
  peso NUMERIC(4,3),
  evidencias JSONB DEFAULT '[]'::jsonb,
  destruidor_top BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_equity_dim_assess ON public.equity_dimension_scores(assessment_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equity_dimension_scores TO authenticated;
GRANT ALL ON public.equity_dimension_scores TO service_role;
ALTER TABLE public.equity_dimension_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dim scores follow assessment" ON public.equity_dimension_scores FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.equity_assessments a WHERE a.id = assessment_id
    AND (a.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'advisor'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.equity_assessments a WHERE a.id = assessment_id
    AND (a.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'advisor'))));

-- 7) VALUATIONS
CREATE TABLE public.equity_valuations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.equity_assessments(id) ON DELETE CASCADE,
  metodo TEXT NOT NULL DEFAULT 'multiplos',
  ebitda_normalizado NUMERIC(15,2),
  addbacks JSONB DEFAULT '{}'::jsonb,
  multiplo_aplicado NUMERIC(5,2),
  faixa_min NUMERIC(5,2),
  faixa_max NUMERIC(5,2),
  valor_atual NUMERIC(15,2),
  valor_alvo NUMERIC(15,2),
  premissas JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_equity_val_assess ON public.equity_valuations(assessment_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equity_valuations TO authenticated;
GRANT ALL ON public.equity_valuations TO service_role;
ALTER TABLE public.equity_valuations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Valuations follow assessment" ON public.equity_valuations FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.equity_assessments a WHERE a.id = assessment_id
    AND (a.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'advisor'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.equity_assessments a WHERE a.id = assessment_id
    AND (a.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'advisor'))));

-- 8) VALUE BRIDGE ITEMS
CREATE TABLE public.equity_value_bridge_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  valuation_id UUID NOT NULL REFERENCES public.equity_valuations(id) ON DELETE CASCADE,
  parcela TEXT NOT NULL, -- 'valor_hoje' | 'delta_lucro' | 'delta_multiplo' | 'delta_crescimento' | 'premio_estrategico' | 'valor_alvo'
  descricao TEXT,
  delta_valor NUMERIC(15,2) NOT NULL DEFAULT 0,
  ordem INT DEFAULT 0,
  iniciativa_ids UUID[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_equity_bridge_val ON public.equity_value_bridge_items(valuation_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equity_value_bridge_items TO authenticated;
GRANT ALL ON public.equity_value_bridge_items TO service_role;
ALTER TABLE public.equity_value_bridge_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Bridge follows valuation" ON public.equity_value_bridge_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.equity_valuations v JOIN public.equity_assessments a ON a.id = v.assessment_id
    WHERE v.id = valuation_id AND (a.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'advisor'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.equity_valuations v JOIN public.equity_assessments a ON a.id = v.assessment_id
    WHERE v.id = valuation_id AND (a.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'advisor'))));

-- 9) INITIATIVES
CREATE TABLE public.equity_initiatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.equity_assessments(id) ON DELETE CASCADE,
  dimensao_alvo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  delta_ipe INT DEFAULT 0,
  delta_valor NUMERIC(15,2) DEFAULT 0,
  esforco TEXT DEFAULT 'medio',
  prazo_meses INT DEFAULT 3,
  sprint INT DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'planejada', -- 'planejada' | 'em_andamento' | 'concluida' | 'descartada'
  tipo TEXT DEFAULT 'execucao',
  prioridade INT DEFAULT 0,
  dependencias UUID[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_equity_init_assess ON public.equity_initiatives(assessment_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equity_initiatives TO authenticated;
GRANT ALL ON public.equity_initiatives TO service_role;
ALTER TABLE public.equity_initiatives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Initiatives follow assessment" ON public.equity_initiatives FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.equity_assessments a WHERE a.id = assessment_id
    AND (a.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'advisor'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.equity_assessments a WHERE a.id = assessment_id
    AND (a.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'advisor'))));

-- 10) BUYER MAP
CREATE TABLE public.equity_buyer_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.equity_assessments(id) ON DELETE CASCADE,
  arquetipo_comprador TEXT NOT NULL, -- 'estrategico' | 'financeiro' | 'individual'
  nome_alvo TEXT,
  tese_aquisicao TEXT,
  premio_estimado_pct NUMERIC(5,2),
  premio_estimado_valor NUMERIC(15,2),
  prioridade INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_equity_buyer_assess ON public.equity_buyer_map(assessment_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equity_buyer_map TO authenticated;
GRANT ALL ON public.equity_buyer_map TO service_role;
ALTER TABLE public.equity_buyer_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyer map follows assessment" ON public.equity_buyer_map FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.equity_assessments a WHERE a.id = assessment_id
    AND (a.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'advisor'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.equity_assessments a WHERE a.id = assessment_id
    AND (a.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'advisor'))));

-- 11) PROGRESS LOG (somente service_role escreve)
CREATE TABLE public.equity_progress_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.equity_companies(id) ON DELETE CASCADE,
  assessment_id UUID REFERENCES public.equity_assessments(id) ON DELETE SET NULL,
  ipe INT,
  valor NUMERIC(15,2),
  evento TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_equity_progress_company ON public.equity_progress_log(company_id);
GRANT SELECT ON public.equity_progress_log TO authenticated;
GRANT ALL ON public.equity_progress_log TO service_role;
ALTER TABLE public.equity_progress_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads progress" ON public.equity_progress_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.equity_companies c WHERE c.id = company_id
    AND (c.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'advisor'))));

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.equity_set_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_eq_companies_upd BEFORE UPDATE ON public.equity_companies
  FOR EACH ROW EXECUTE FUNCTION public.equity_set_updated_at();
CREATE TRIGGER trg_eq_assess_upd BEFORE UPDATE ON public.equity_assessments
  FOR EACH ROW EXECUTE FUNCTION public.equity_set_updated_at();
CREATE TRIGGER trg_eq_init_upd BEFORE UPDATE ON public.equity_initiatives
  FOR EACH ROW EXECUTE FUNCTION public.equity_set_updated_at();
CREATE TRIGGER trg_eq_arch_upd BEFORE UPDATE ON public.equity_archetypes
  FOR EACH ROW EXECUTE FUNCTION public.equity_set_updated_at();

-- =====================================================
-- SEEDS: 3 arquétipos curados
-- =====================================================
INSERT INTO public.equity_archetypes (id, nome, descricao, exemplos_setor, pesos_dimensoes, kpis, killers, universo_compradores, faixa_multiplo_min, faixa_multiplo_max, piso_liquidez, ordem) VALUES
('servico_profissional', 'Serviço Profissional', 'Negócio people-based onde o ativo é a expertise da equipe; receita por hora, projeto ou retainer.',
  ARRAY['consultoria','advocacia','contabilidade','agência','arquitetura'],
  '{"independencia_dono":0.22,"qualidade_receita":0.13,"margem":0.10,"higiene_financeira":0.10,"concentracao":0.08,"motor_comercial":0.10,"gestao":0.08,"processos":0.05,"contingencias":0.05,"narrativa":0.04,"atratividade":0.03,"societario":0.02}'::jsonb,
  '["utilizacao","taxa_faturavel","receita_recorrente_pct","margem_por_pessoa","churn_talento"]'::jsonb,
  '["dependencia_dono_extrema","receita_por_projeto","churn_de_talento"]'::jsonb,
  '["estrategico_consolidador","financeiro_pe_servicos","individual_partner_buyout"]'::jsonb,
  3.0, 6.0, 50, 1),
('projeto_obra', 'Projeto / Sob Encomenda', 'Receita por contrato/obra com início e fim; backlog, capital de giro e contingência dominam o valor.',
  ARRAY['construção civil','obras','engenharia','integrador de sistemas','fabricação custom'],
  '{"independencia_dono":0.14,"qualidade_receita":0.13,"margem":0.10,"higiene_financeira":0.13,"concentracao":0.12,"motor_comercial":0.08,"gestao":0.06,"processos":0.05,"contingencias":0.12,"narrativa":0.04,"atratividade":0.02,"societario":0.01}'::jsonb,
  '["backlog_meses","margem_contrato","wip","ciclo_caixa","dso"]'::jsonb,
  '["receita_lumpy","capital_giro_pesado","contingencia_garantia","concentracao_cliente"]'::jsonb,
  '["estrategico_consolidador_regional","financeiro_pe_infra","comprador_vertical_cliente_chave"]'::jsonb,
  2.5, 5.0, 45, 2),
('recorrente', 'Receita Recorrente / Assinatura', 'Receita contratada que se renova; MRR/ARR, churn e LTV/CAC governam o múltiplo.',
  ARRAY['SaaS','provedor de internet','monitoramento','manutenção contratada','managed services','mensalidade'],
  '{"independencia_dono":0.12,"qualidade_receita":0.20,"margem":0.10,"higiene_financeira":0.10,"concentracao":0.08,"motor_comercial":0.12,"gestao":0.06,"processos":0.06,"contingencias":0.06,"narrativa":0.06,"atratividade":0.03,"societario":0.01}'::jsonb,
  '["mrr","arr","churn_logo","churn_receita","ltv_cac","nrr"]'::jsonb,
  '["churn_alto","concentracao_cliente","cac_payback_longo"]'::jsonb,
  '["estrategico_consolidador","financeiro_pe_growth","financeiro_search_fund"]'::jsonb,
  5.0, 12.0, 55, 3);

-- COMPS por porte
INSERT INTO public.equity_comps_benchmarks (arquetipo_id, porte, multiplo_min, multiplo_max, metrica, fonte) VALUES
('servico_profissional','micro',2.0,3.5,'EBITDA','Vispe comps PME 2025'),
('servico_profissional','pequena',3.0,5.0,'EBITDA','Vispe comps PME 2025'),
('servico_profissional','media',4.0,7.0,'EBITDA','Vispe comps PME 2025'),
('projeto_obra','micro',1.5,3.0,'EBITDA','Vispe comps PME 2025'),
('projeto_obra','pequena',2.5,4.5,'EBITDA','Vispe comps PME 2025'),
('projeto_obra','media',3.5,6.0,'EBITDA','Vispe comps PME 2025'),
('recorrente','micro',3.5,6.0,'EBITDA','Vispe comps PME 2025'),
('recorrente','pequena',5.0,9.0,'EBITDA','Vispe comps PME 2025'),
('recorrente','media',7.0,12.0,'EBITDA','Vispe comps PME 2025');

-- Biblioteca base de iniciativas (subset essencial — pode crescer)
INSERT INTO public.equity_initiative_library (arquetipo_id, dimensao, titulo, descricao, delta_ipe_padrao, esforco, prazo_meses, tipo) VALUES
-- Transversal (NULL = aplica a todos)
(NULL,'independencia_dono','Tirar o dono das decisões operacionais','Documentar processos críticos e delegar autoridade financeira até R$X.',10,'medio',6,'derisk'),
(NULL,'higiene_financeira','Implantar contabilidade gerencial','DRE gerencial mensal separando pessoal de PJ; conciliação bancária.',8,'baixo',3,'derisk'),
(NULL,'contingencias','Auditoria trabalhista e tributária','Mapear passivos ocultos e regularizar antes de qualquer due diligence.',7,'medio',4,'derisk'),
(NULL,'concentracao','Reduzir concentração de cliente','Plano de aquisição para baixar maior cliente abaixo de 20% da receita.',6,'alto',9,'execucao'),
(NULL,'motor_comercial','Construir pipeline previsível','CRM com etapas, taxas de conversão e forecast trimestral.',7,'medio',6,'execucao'),
(NULL,'gestao','Criar segundo nível de liderança','Contratar/promover head comercial e head de operações.',6,'alto',9,'execucao'),
(NULL,'processos','Documentar SOPs críticos','Top 10 processos viram playbook executável sem o dono.',5,'medio',4,'execucao'),
(NULL,'societario','Limpar estrutura societária','Holding patrimonial, IP/contratos no PJ, deal-ready.',4,'baixo',3,'derisk'),
-- Serviço profissional
('servico_profissional','qualidade_receita','Converter projetos em retainers','Transformar 30% da receita pontual em mandatos mensais.',12,'medio',6,'execucao'),
('servico_profissional','margem','Revisar precificação por hora/projeto','Reprecificar tabela com base em valor entregue, não custo.',8,'baixo',2,'execucao'),
-- Projeto/obra
('projeto_obra','qualidade_receita','Criar linha de manutenção contratada','Migração de arquétipo: oferta de manutenção/SLA pós-obra como recorrência.',18,'alto',12,'migracao_arquetipo'),
('projeto_obra','margem','Renegociar fornecedores e backlog','Margem alvo +3pp via mix e renegociação.',6,'medio',4,'execucao'),
-- Recorrente
('recorrente','qualidade_receita','Reduzir churn para benchmark','Programa de sucesso do cliente + NPS trimestral.',10,'medio',6,'execucao'),
('recorrente','motor_comercial','Otimizar LTV/CAC','Canais pagos rastreados; meta LTV/CAC > 3x.',8,'medio',6,'execucao'),
('recorrente','narrativa','Articular equity story de growth','Pitch com TAM, retenção líquida e roadmap de produto.',5,'baixo',2,'execucao');
