-- Equity Planner — Reestruturação de modelo de negócio
-- 1) Adiciona coluna bloqueadores em equity_archetype_migrations
ALTER TABLE public.equity_archetype_migrations
  ADD COLUMN IF NOT EXISTS bloqueadores text[] DEFAULT ARRAY[]::text[];

-- 2) Seeds adicionais de rotas (idempotente)
INSERT INTO public.equity_archetype_migrations
  (de_arquetipo_id, para_arquetipo_id, titulo, descricao_rota, delta_multiplo_esperado, descricao_curta, exemplos, bloqueadores)
SELECT * FROM (VALUES
  ('projeto_obra','produto_ip',
    'Empacotar metodologia/equipamento em produto licenciável',
    'Construtora/integrador transforma kit técnico, software embarcado ou metodologia proprietária em produto licenciável vendido como SKU recorrente.',
    3.5,
    'Salto de múltiplo via produtização do que já existe na operação.',
    ARRAY['Integrador licencia plataforma de monitoramento','Construtora vende sistema construtivo como franquia técnica'],
    ARRAY['Definir IP claro e protegível','Separar custo de produto x serviço','Equipe comercial nova para SKU']
  ),
  ('servico_profissional','projeto_obra_estruturado',
    'Estruturar entregas em projeto com escopo, preço e SLA fixos',
    'Passo intermediário: sai do hora-homem puro para projetos com escopo fechado, fases, milestones e preço por entregável — destravando margem e previsibilidade.',
    1.6,
    'Ponte de baixo risco antes de migrar para recorrente.',
    ARRAY['Consultoria passa a vender pacotes fechados','Agência migra para projetos de 90 dias com SOW'],
    ARRAY['Padronizar SOW e precificação','Quebrar dependência do dono na entrega']
  )
) AS v(de_arquetipo_id, para_arquetipo_id, titulo, descricao_rota, delta_multiplo_esperado, descricao_curta, exemplos, bloqueadores)
WHERE NOT EXISTS (
  SELECT 1 FROM public.equity_archetype_migrations m
  WHERE m.de_arquetipo_id = v.de_arquetipo_id
    AND m.para_arquetipo_id = v.para_arquetipo_id
);

-- 3) Backfill bloqueadores nas rotas antigas
UPDATE public.equity_archetype_migrations
SET bloqueadores = ARRAY['Definir oferta recorrente e preço','Migrar base existente para contrato mensal','Treinar comercial em venda consultiva de recorrência']
WHERE para_arquetipo_id = 'recorrente' AND (bloqueadores IS NULL OR cardinality(bloqueadores) = 0);

UPDATE public.equity_archetype_migrations
SET bloqueadores = ARRAY['Proteger metodologia/IP','Construir UX/produto além do serviço','Achar canal de distribuição além do dono']
WHERE para_arquetipo_id = 'produto_ip' AND (bloqueadores IS NULL OR cardinality(bloqueadores) = 0);