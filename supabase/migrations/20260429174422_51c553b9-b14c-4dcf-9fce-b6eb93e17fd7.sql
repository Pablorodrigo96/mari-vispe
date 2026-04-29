-- Recria eb_mandates com colunas novas
DROP VIEW IF EXISTS public.eb_mandates CASCADE;
CREATE VIEW public.eb_mandates AS
SELECT
  id, company_cnpj, status, exclusividade, data_assinatura, data_vencimento,
  comissao_pct, valor_pedido, responsavel_id, observacoes, source, created_by,
  created_at, updated_at, probability, expected_close_at, commission_pct,
  temperature, temperature_reason, temperature_updated_at,
  deal_type, pipeline_stage, outcome, valor_operacao, faturamento_vispe,
  data_inicio, data_fechamento, regiao, uf, setor,
  contato_nome, contato_telefone, contato_email, stage_changed_at
FROM equity_brain.mandates;

GRANT SELECT, INSERT, UPDATE ON public.eb_mandates TO authenticated;

-- View executiva no public
CREATE OR REPLACE VIEW public.eb_v_deal_metrics AS
SELECT * FROM equity_brain.v_deal_metrics;

GRANT SELECT ON public.eb_v_deal_metrics TO authenticated;

-- Wrappers RPC em public para o cliente JS conseguir invocar
CREATE OR REPLACE FUNCTION public.eb_dashboard_kpis()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, equity_brain AS $$
  SELECT equity_brain.dashboard_kpis();
$$;

CREATE OR REPLACE FUNCTION public.eb_match_crosstab(dim text DEFAULT 'uf')
RETURNS TABLE(label text, mandates_count int, buyers_count int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, equity_brain AS $$
  SELECT * FROM equity_brain.match_crosstab(dim);
$$;

GRANT EXECUTE ON FUNCTION public.eb_dashboard_kpis() TO authenticated;
GRANT EXECUTE ON FUNCTION public.eb_match_crosstab(text) TO authenticated;