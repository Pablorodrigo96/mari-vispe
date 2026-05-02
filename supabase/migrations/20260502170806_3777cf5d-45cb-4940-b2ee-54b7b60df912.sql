
-- ENUM 11 tipos de comprador
DO $$ BEGIN
  CREATE TYPE equity_brain.tipo_comprador_enum AS ENUM (
    'estrategico_incumbente','estrategico_entrante','consolidador',
    'plataforma_pe','add_on_pe','fundo_financeiro','family_office',
    'search_fund','oportunista','eliminatorio','internacional'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Taxonomia
CREATE TABLE IF NOT EXISTS equity_brain.taxonomia_compradores (
  tipo equity_brain.tipo_comprador_enum PRIMARY KEY,
  descricao text NOT NULL,
  paga_premio_quando text,
  paga_menos_quando text,
  argumento_comercial_padrao text,
  risco_principal_vendedor text
);

INSERT INTO equity_brain.taxonomia_compradores VALUES
('estrategico_incumbente','Player já dominante no mercado/região',
 'Quando o alvo elimina concorrente relevante na microrregião',
 'Quando já é dominante e o alvo é incremental',
 'Comprar este ativo trava a janela competitiva por 5+ anos',
 'Uso de DD para inteligência competitiva caso deal não feche'),
('estrategico_entrante','Player de fora entrando em mercado novo',
 'Quase sempre — paga prêmio por tempo, licenças, relacionamentos',
 'Se o alvo é pequeno demais para servir de plataforma',
 'Construir esta posição organicamente custa 3 anos e R$ X em capex',
 'Integração mais complexa, lock-up potencialmente longo'),
('consolidador','Estratégico com tese declarada de roll-up',
 'No início do ciclo de tese (precisa provar a estratégia)',
 'No fim do ciclo, com balanço alavancado',
 'Este ativo acelera sua tese de roll-up em N meses',
 'Se consolidador entrar em crise, ações desvalorizam'),
('plataforma_pe','Fundo PE em primeira aquisição de tese',
 'Sempre — primeira aquisição é ancoragem da tese',
 'Raramente — paga prêmio por design',
 'Esta empresa é a plataforma da sua tese',
 'Lock-up alto, governança intrusiva'),
('add_on_pe','Aquisição complementar para PE existente',
 'Quando preenche lacuna geográfica ou de produto crítica',
 'Quando há fila de targets equivalentes',
 'Este ativo entrega sinergia X mensurável em N meses',
 'Múltiplo tipicamente abaixo da plataforma original'),
('fundo_financeiro','Fundo PE generalista (TIR pura)',
 'Quando alavanca pesadamente',
 'Sempre que pode — disciplina de retorno',
 'TIR alvo é alcançável com este ativo via crescimento + roll-up',
 'Earn-out pesado, governança intrusiva'),
('family_office','Patrimônio familiar horizonte longo',
 'Quando há afinidade setorial ou interesse pessoal do principal',
 'Quando o ativo exige operação intensiva',
 'Ativo gerador de caixa estável, gestão pronta, setor defensivo',
 'Decisão lenta e idiossincrática'),
('search_fund','Searcher individual primeiro ativo',
 'Quando há fit pessoal forte do searcher',
 'Capital limitado — restrição estrutural',
 'Ativo perfeito para você operar pessoalmente',
 'Dependência da capacidade do searcher executar'),
('oportunista','Comprador buscando distress/desconto',
 'Raramente — modelo é pagar menos',
 'Sempre — detecta urgência e desconta',
 'EVITAR a menos que venda seja realmente urgente',
 'Receber 50-70% do valor justo em troca de velocidade'),
('eliminatorio','Motivado a evitar rival adquirir',
 'Quando há ameaça concreta de rival',
 'Quando não há ameaça',
 'Orquestrar competição que torne explícita a ameaça do concorrente',
 'Após closing, ativo pode ser desprestigiado'),
('internacional','Estratégico estrangeiro entrando no Brasil',
 'Quando target serve de plataforma local',
 'Quando há issues regulatórios ou de governança',
 'Plataforma turnkey para entrada em região',
 'Processo lento, exigências de DD muito superiores')
ON CONFLICT (tipo) DO UPDATE SET
  descricao = EXCLUDED.descricao,
  paga_premio_quando = EXCLUDED.paga_premio_quando,
  paga_menos_quando = EXCLUDED.paga_menos_quando,
  argumento_comercial_padrao = EXCLUDED.argumento_comercial_padrao,
  risco_principal_vendedor = EXCLUDED.risco_principal_vendedor;

ALTER TABLE equity_brain.taxonomia_compradores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "taxonomia_read_all" ON equity_brain.taxonomia_compradores;
CREATE POLICY "taxonomia_read_all" ON equity_brain.taxonomia_compradores
  FOR SELECT USING (true);

-- Buyers
ALTER TABLE equity_brain.buyers
  ADD COLUMN IF NOT EXISTS tipo_comprador equity_brain.tipo_comprador_enum,
  ADD COLUMN IF NOT EXISTS tipo_classified_at timestamptz,
  ADD COLUMN IF NOT EXISTS tipo_classified_confidence numeric(3,2),
  ADD COLUMN IF NOT EXISTS tipo_classified_reasoning text;

CREATE INDEX IF NOT EXISTS idx_buyers_tipo_comprador
  ON equity_brain.buyers(tipo_comprador) WHERE tipo_comprador IS NOT NULL;

-- Companies
ALTER TABLE equity_brain.companies
  ADD COLUMN IF NOT EXISTS score_vendabilidade numeric(5,2),
  ADD COLUMN IF NOT EXISTS nivel_maturidade int CHECK (nivel_maturidade BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS sv_calculated_at timestamptz,
  ADD COLUMN IF NOT EXISTS sv_breakdown jsonb,
  ADD COLUMN IF NOT EXISTS sv_data_completeness numeric(3,2);

-- Matches
ALTER TABLE equity_brain.matches
  ADD COLUMN IF NOT EXISTS sav_score numeric(5,2),
  ADD COLUMN IF NOT EXISTS sav_breakdown jsonb,
  ADD COLUMN IF NOT EXISTS sav_calculated_at timestamptz,
  ADD COLUMN IF NOT EXISTS thesis_text text,
  ADD COLUMN IF NOT EXISTS thesis_generated_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_matches_sav_score
  ON equity_brain.matches(sav_score DESC) WHERE sav_score IS NOT NULL;

-- Benchmark transactions
CREATE TABLE IF NOT EXISTS equity_brain.benchmark_transactions (
  id text PRIMARY KEY,
  alvo_nome text NOT NULL,
  comprador_nome text NOT NULL,
  tipo_comprador equity_brain.tipo_comprador_enum,
  setor text,
  subsetor text,
  data_anuncio text,
  data_fechamento date,
  regiao_alvo text,
  ev_brl_mm numeric(12,2),
  ev_divulgado boolean DEFAULT false,
  receita_brl_mm numeric(12,2),
  ebitda_brl_mm numeric(12,2),
  multiplo_ev_ebitda numeric(6,2),
  multiplo_ev_receita numeric(6,2),
  fase_ciclo_setorial text
    CHECK (fase_ciclo_setorial IN ('early','early_mid','mid','mid_late','peak','late','n_a') OR fase_ciclo_setorial IS NULL),
  competicao_processo text
    CHECK (competicao_processo IN ('bilateral','competitivo','leilao','desconhecida') OR competicao_processo IS NULL),
  vista_pct numeric(5,2),
  sinergias_declaradas text,
  tese_estrategica text,
  observacoes_relevantes text,
  flag_caso_critico boolean DEFAULT false,
  raw_data jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_benchmark_setor_fase
  ON equity_brain.benchmark_transactions(setor, fase_ciclo_setorial);
CREATE INDEX IF NOT EXISTS idx_benchmark_tipo_comprador
  ON equity_brain.benchmark_transactions(tipo_comprador);

ALTER TABLE equity_brain.benchmark_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "benchmark_read_advisors_admins" ON equity_brain.benchmark_transactions;
CREATE POLICY "benchmark_read_advisors_admins"
  ON equity_brain.benchmark_transactions FOR SELECT
  USING (
    public.has_role(auth.uid(),'admin'::app_role)
    OR public.has_role(auth.uid(),'advisor'::app_role)
  );
DROP POLICY IF EXISTS "benchmark_write_admin_only" ON equity_brain.benchmark_transactions;
CREATE POLICY "benchmark_write_admin_only"
  ON equity_brain.benchmark_transactions FOR ALL
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

-- Transaction proposals
CREATE TABLE IF NOT EXISTS equity_brain.transaction_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mandate_id uuid NOT NULL REFERENCES equity_brain.mandates(id) ON DELETE CASCADE,
  buyer_id uuid REFERENCES equity_brain.buyers(id),
  proposta_label text NOT NULL,
  valor_nominal_brl_mm numeric(12,2),
  vista_brl_mm numeric(12,2),
  earn_out_brl_mm numeric(12,2),
  earn_out_prazo_meses int,
  earn_out_metricas text,
  escrow_brl_mm numeric(12,2),
  escrow_prazo_meses int,
  parcelamento_brl_mm numeric(12,2),
  parcelamento_prazo_meses int,
  acoes_brl_mm numeric(12,2),
  acoes_lockup_meses int,
  acoes_ticker text,
  non_compete_anos int,
  lockup_operacional_meses int,
  garantias_pessoais_brl_mm numeric(12,2),
  vpl_ajustado_brl_mm numeric(12,2),
  vpl_breakdown jsonb,
  vpl_calculated_at timestamptz,
  vpl_assumptions jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_proposals_mandate ON equity_brain.transaction_proposals(mandate_id);

ALTER TABLE equity_brain.transaction_proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "proposals_select_by_mandate_access" ON equity_brain.transaction_proposals;
CREATE POLICY "proposals_select_by_mandate_access"
  ON equity_brain.transaction_proposals FOR SELECT
  USING (
    mandate_id IN (
      SELECT id FROM equity_brain.mandates
      WHERE responsavel_id = auth.uid()
         OR padrinho_id = auth.uid()
         OR auth.uid() = ANY(co_advisor_ids)
    )
    OR public.has_role(auth.uid(),'admin'::app_role)
  );

DROP POLICY IF EXISTS "proposals_write_by_owner" ON equity_brain.transaction_proposals;
CREATE POLICY "proposals_write_by_owner"
  ON equity_brain.transaction_proposals FOR ALL
  USING (
    mandate_id IN (
      SELECT id FROM equity_brain.mandates
      WHERE responsavel_id = auth.uid() OR padrinho_id = auth.uid()
    )
    OR public.has_role(auth.uid(),'admin'::app_role)
  )
  WITH CHECK (
    mandate_id IN (
      SELECT id FROM equity_brain.mandates
      WHERE responsavel_id = auth.uid() OR padrinho_id = auth.uid()
    )
    OR public.has_role(auth.uid(),'admin'::app_role)
  );
