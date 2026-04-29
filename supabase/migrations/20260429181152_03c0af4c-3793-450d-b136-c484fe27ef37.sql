
CREATE OR REPLACE FUNCTION equity_brain.dashboard_kpis()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'equity_brain'
AS $function$
  SELECT jsonb_build_object(
    'total_operations', (SELECT count(*) FROM equity_brain.mandates),
    'buyside',          (SELECT count(*) FROM equity_brain.mandates WHERE deal_type='buyside'),
    'sellside',         (SELECT count(*) FROM equity_brain.mandates WHERE deal_type='sellside'),
    'em_andamento',     (SELECT count(*) FROM equity_brain.mandates WHERE outcome IN ('em_andamento','vigente','em_negociacao')),
    'vigente',          (SELECT count(*) FROM equity_brain.mandates WHERE outcome = 'vigente'),
    'em_negociacao',    (SELECT count(*) FROM equity_brain.mandates WHERE outcome = 'em_negociacao'),
    'concluido',        (SELECT count(*) FROM equity_brain.mandates WHERE outcome IN ('concluido','vendemos')),
    'vendemos',         (SELECT count(*) FROM equity_brain.mandates WHERE outcome = 'vendemos'),
    'cancelado',        (SELECT count(*) FROM equity_brain.mandates WHERE outcome='cancelado'),
    'vencido',          (SELECT count(*) FROM equity_brain.mandates WHERE outcome='vencido'),
    'vendeu_sozinho',   (SELECT count(*) FROM equity_brain.mandates WHERE outcome='vendeu_sozinho'),
    'total_value',      (SELECT COALESCE(sum(valor_operacao),0) FROM equity_brain.mandates WHERE outcome IN ('concluido','vendemos')),
    'total_commission', (SELECT COALESCE(sum(faturamento_vispe),0) FROM equity_brain.mandates WHERE outcome IN ('concluido','vendemos')),
    'avg_ticket',       (SELECT COALESCE(avg(valor_operacao),0) FROM equity_brain.mandates WHERE outcome IN ('concluido','vendemos') AND valor_operacao > 0),
    'exclusividade_pct',(SELECT ROUND(100.0*count(*) FILTER (WHERE exclusividade)/NULLIF(count(*),0),1) FROM equity_brain.mandates),
    'avg_months_close', (SELECT ROUND(AVG((data_fechamento - data_inicio)::numeric / 30.44), 1)
                         FROM equity_brain.mandates
                         WHERE outcome IN ('concluido','vendemos') AND data_fechamento IS NOT NULL AND data_inicio IS NOT NULL)
  )
$function$;
