DO $$ BEGIN
  CREATE TYPE equity_brain.deal_phase AS ENUM ('match','nbo','due_diligence','spa','closing','closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE equity_brain.mandates
  ADD COLUMN IF NOT EXISTS deal_phase equity_brain.deal_phase,
  ADD COLUMN IF NOT EXISTS bdr_id uuid,
  ADD COLUMN IF NOT EXISTS closer_id uuid;

UPDATE equity_brain.mandates
SET deal_phase = CASE pipeline_stage::text
  WHEN 'lead' THEN 'match'::equity_brain.deal_phase
  WHEN 'qualificacao' THEN 'match'::equity_brain.deal_phase
  WHEN 'teaser' THEN 'match'::equity_brain.deal_phase
  WHEN 'nbo' THEN 'nbo'::equity_brain.deal_phase
  WHEN 'due_diligence' THEN 'due_diligence'::equity_brain.deal_phase
  WHEN 'spa' THEN 'spa'::equity_brain.deal_phase
  WHEN 'closing' THEN 'closing'::equity_brain.deal_phase
  WHEN 'closed' THEN 'closed'::equity_brain.deal_phase
  ELSE NULL
END
WHERE deal_phase IS NULL;

DROP MATERIALIZED VIEW IF EXISTS equity_brain.mv_dashboard_executivo;
CREATE MATERIALIZED VIEW equity_brain.mv_dashboard_executivo AS
SELECT
  count(*)::int                                                              AS total_operacoes,
  count(*) FILTER (WHERE deal_type::text = 'buyside')::int                   AS buyside,
  count(*) FILTER (WHERE deal_type::text = 'sellside')::int                  AS sellside,
  count(*) FILTER (WHERE outcome::text = 'em_andamento')::int                AS em_andamento,
  count(*) FILTER (WHERE outcome::text = 'concluido')::int                   AS concluidas,
  count(*) FILTER (WHERE outcome::text IN ('cancelado','vencido'))::int      AS canceladas,
  COALESCE(sum(valor_operacao),0)::numeric                                   AS valor_total_operacoes,
  COALESCE(sum(faturamento_vispe),0)::numeric                                AS faturamento_vispe,
  COALESCE(avg(NULLIF(valor_operacao,0)),0)::numeric                         AS ticket_medio,
  now() AS refreshed_at
FROM equity_brain.mandates;

DROP MATERIALIZED VIEW IF EXISTS equity_brain.mv_dashboard_mandato;
CREATE MATERIALIZED VIEW equity_brain.mv_dashboard_mandato AS
SELECT
  count(*)::int                                                              AS total_mandatos,
  count(*) FILTER (WHERE outcome::text = 'concluido')::int                   AS vendemos,
  count(*) FILTER (WHERE status::text = 'ativo')::int                        AS vigentes,
  count(*) FILTER (WHERE outcome::text = 'em_andamento')::int                AS em_negociacao,
  count(*) FILTER (WHERE exclusividade)::int                                 AS com_exclusividade,
  COALESCE(sum(valor_pedido),0)::numeric                                     AS equity_sob_gestao,
  COALESCE(sum(faturamento_vispe),0)::numeric                                AS comissao_vispe,
  now() AS refreshed_at
FROM equity_brain.mandates
WHERE deal_kind = 'mandato_assinado';

DROP MATERIALIZED VIEW IF EXISTS equity_brain.mv_dashboard_match;
CREATE MATERIALIZED VIEW equity_brain.mv_dashboard_match AS
SELECT
  count(*)::int                                                              AS total,
  count(*) FILTER (WHERE outcome::text = 'em_andamento')::int                AS em_andamento,
  count(*) FILTER (WHERE outcome::text = 'concluido')::int                   AS concluidos,
  count(*) FILTER (WHERE outcome::text IN ('cancelado','vencido'))::int      AS cancelados,
  COALESCE(avg((data_fechamento - data_inicio)) FILTER (WHERE data_fechamento IS NOT NULL AND data_inicio IS NOT NULL), 0)::numeric AS tempo_medio_dias,
  now() AS refreshed_at
FROM equity_brain.mandates
WHERE deal_phase = 'match';

DROP MATERIALIZED VIEW IF EXISTS equity_brain.mv_dashboard_nbo;
CREATE MATERIALIZED VIEW equity_brain.mv_dashboard_nbo AS
SELECT
  count(*)::int                                                              AS total,
  count(*) FILTER (WHERE outcome::text = 'concluido')::int                   AS concluidos,
  count(*) FILTER (WHERE outcome::text = 'em_andamento')::int                AS em_andamento,
  count(*) FILTER (WHERE outcome::text IN ('cancelado','vencido'))::int      AS cancelados,
  COALESCE(avg((data_fechamento - data_inicio)) FILTER (WHERE data_fechamento IS NOT NULL AND data_inicio IS NOT NULL), 0)::numeric AS tempo_medio_dias,
  COALESCE(sum(valor_operacao),0)::numeric                                   AS valor_total,
  COALESCE(avg(NULLIF(valor_operacao,0)),0)::numeric                         AS valor_medio,
  COALESCE(sum(faturamento_vispe),0)::numeric                                AS comissoes_total,
  COALESCE(avg(NULLIF(faturamento_vispe,0)),0)::numeric                      AS ticket_medio,
  now() AS refreshed_at
FROM equity_brain.mandates
WHERE deal_phase = 'nbo';

GRANT SELECT ON equity_brain.mv_dashboard_executivo TO authenticated;
GRANT SELECT ON equity_brain.mv_dashboard_mandato   TO authenticated;
GRANT SELECT ON equity_brain.mv_dashboard_match     TO authenticated;
GRANT SELECT ON equity_brain.mv_dashboard_nbo       TO authenticated;