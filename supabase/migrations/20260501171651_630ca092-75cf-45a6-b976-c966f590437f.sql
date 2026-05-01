-- 1) Fix mv_dashboard_mandato: status correto é 'vigente' (não 'ativo')
DROP MATERIALIZED VIEW IF EXISTS equity_brain.mv_dashboard_mandato CASCADE;
CREATE MATERIALIZED VIEW equity_brain.mv_dashboard_mandato AS
SELECT 
  count(*)::integer AS total_mandatos,
  count(*) FILTER (WHERE outcome::text IN ('concluido','vendemos'))::integer AS vendemos,
  count(*) FILTER (WHERE status::text = 'vigente')::integer AS vigentes,
  count(*) FILTER (WHERE outcome::text IN ('em_andamento','em_negociacao'))::integer AS em_negociacao,
  count(*) FILTER (WHERE exclusividade)::integer AS com_exclusividade,
  COALESCE(sum(valor_pedido), 0::numeric) AS equity_sob_gestao,
  COALESCE(sum(faturamento_vispe), 0::numeric) AS comissao_vispe,
  now() AS refreshed_at
FROM equity_brain.mandates
WHERE deal_kind = 'mandato_assinado';

CREATE OR REPLACE FUNCTION public.get_dashboard_mandato()
RETURNS SETOF equity_brain.mv_dashboard_mandato
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public', 'equity_brain'
AS $$
  SELECT * FROM equity_brain.mv_dashboard_mandato
  WHERE has_role(auth.uid(), 'admin'::app_role)
     OR has_role(auth.uid(), 'advisor'::app_role);
$$;

-- 2) Backfill deal_type = buyside para buyer_mandate
UPDATE equity_brain.mandates
SET deal_type = 'buyside'::equity_brain.deal_type
WHERE deal_kind = 'buyer_mandate' AND (deal_type IS NULL OR deal_type::text = 'sellside');

-- 3) Backfill deal_phase a partir de pipeline_stage
UPDATE equity_brain.mandates
SET deal_phase = pipeline_stage::text::equity_brain.deal_phase
WHERE deal_phase IS NULL AND pipeline_stage IS NOT NULL;

-- 4) Backfill valor_operacao a partir de valor_pedido
UPDATE equity_brain.mandates
SET valor_operacao = valor_pedido
WHERE valor_operacao IS NULL AND valor_pedido IS NOT NULL AND valor_pedido > 0;

-- 5) Backfill faturamento_vispe = valor_operacao * commission_pct/100 (default 5%)
UPDATE equity_brain.mandates
SET faturamento_vispe = valor_operacao * COALESCE(NULLIF(commission_pct, 0), NULLIF(comissao_pct, 0), 5) / 100
WHERE faturamento_vispe IS NULL AND valor_operacao IS NOT NULL AND valor_operacao > 0;

-- 6) Backfill outcome=concluido onde tem data_fechamento
UPDATE equity_brain.mandates
SET outcome = 'concluido'::equity_brain.deal_outcome
WHERE data_fechamento IS NOT NULL 
  AND outcome::text NOT IN ('concluido','cancelado','vencido','vendemos');

-- 7) Refresh todos os matviews
REFRESH MATERIALIZED VIEW equity_brain.mv_dashboard_executivo;
REFRESH MATERIALIZED VIEW equity_brain.mv_dashboard_mandato;
REFRESH MATERIALIZED VIEW equity_brain.mv_dashboard_match;
REFRESH MATERIALIZED VIEW equity_brain.mv_dashboard_nbo;