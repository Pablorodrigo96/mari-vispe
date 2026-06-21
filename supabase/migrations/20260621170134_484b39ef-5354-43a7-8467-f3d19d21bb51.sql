
-- 1) Tabela de rotas de migração de arquétipo
CREATE TABLE IF NOT EXISTS public.equity_archetype_migrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  de_arquetipo_id text NOT NULL,
  para_arquetipo_id text NOT NULL,
  titulo text NOT NULL,
  descricao_rota text NOT NULL,
  delta_multiplo_esperado numeric NOT NULL DEFAULT 0,
  descricao_curta text,
  exemplos text[],
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.equity_archetype_migrations TO authenticated;
GRANT ALL ON public.equity_archetype_migrations TO service_role;

ALTER TABLE public.equity_archetype_migrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read archetype migrations" ON public.equity_archetype_migrations;
CREATE POLICY "Authenticated can read archetype migrations"
ON public.equity_archetype_migrations FOR SELECT TO authenticated USING (true);

-- 2) Adicionar classificação de arquétipo + raciocínio ao assessment
ALTER TABLE public.equity_assessments
  ADD COLUMN IF NOT EXISTS archetype_classification jsonb,
  ADD COLUMN IF NOT EXISTS migracao_arquetipo_sugerida jsonb;

-- 3) Seed inicial das rotas de migração
INSERT INTO public.equity_archetype_migrations
  (de_arquetipo_id, para_arquetipo_id, titulo, descricao_rota, delta_multiplo_esperado, descricao_curta, exemplos)
VALUES
  ('projeto_obra','recorrente',
    'Criar linha de Managed Services / Manutenção contratada',
    'Empresa que hoje vende projeto/obra cria uma camada de serviços recorrentes (manutenção, monitoramento, SLA mensal) sobre a base instalada. Receita lumpy vira receita previsível.',
    3.0,
    'O movimento de maior valor para integradores/construtoras.',
    ARRAY['Integrador de redes vira ISP/MSP','Construtora cria linha de manutenção predial','Engenharia oferece contrato anual de operação']),
  ('servico_profissional','recorrente',
    'Transformar projetos avulsos em retainer mensal',
    'Consultoria/agência migra do modelo projeto-a-projeto para contratos retainer mensais com escopo recorrente, baixando dependência do dono e gerando MRR.',
    2.5,
    'Tira o dono do funil e cria previsibilidade — o maior destravador de liquidez.',
    ARRAY['Consultoria fecha pacote mensal','Advocacia cobra mensalidade de compliance','Agência migra para fee mensal']),
  ('servico_profissional','produto_ip',
    'Produtizar metodologia em SaaS/produto licenciável',
    'Empresa de serviço empacota sua metodologia em software, conteúdo ou framework licenciável, transformando hora-homem em produto escalável.',
    4.0,
    'Salto de múltiplo mais alto, porém com risco de execução técnico maior.',
    ARRAY['Consultoria de processos vira SaaS de gestão','Mentoria vira curso/plataforma','Auditoria vira checklist licenciável']);
