-- RPC para atualizar campo único de mandato (admin/advisor)
CREATE OR REPLACE FUNCTION public.update_mandate_field(
  p_mandate_id uuid,
  p_field text,
  p_value text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, equity_brain
AS $$
DECLARE
  v_allowed text[] := ARRAY[
    'deal_type','deal_kind','deal_phase','outcome','status','pipeline_stage',
    'valor_pedido','valor_operacao','faturamento_vispe','commission_pct','comissao_pct',
    'data_inicio','data_assinatura','data_vencimento','data_fechamento',
    'responsavel_id','bdr_id','closer_id',
    'uf','regiao','setor',
    'comprador_nome','comprador_cnpj',
    'contato_nome','contato_email','contato_telefone'
  ];
  v_sql text;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::app_role)
       OR public.has_role(auth.uid(),'advisor'::app_role)) THEN
    RAISE EXCEPTION 'Permissao negada';
  END IF;

  IF NOT (p_field = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'Campo % nao permitido', p_field;
  END IF;

  IF p_value IS NULL OR p_value = '' THEN
    v_sql := format('UPDATE equity_brain.mandates SET %I = NULL, updated_at = now() WHERE id = $1', p_field);
    EXECUTE v_sql USING p_mandate_id;
  ELSE
    v_sql := format('UPDATE equity_brain.mandates SET %I = $2, updated_at = now() WHERE id = $1', p_field);
    EXECUTE v_sql USING p_mandate_id, p_value;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_mandate_field(uuid, text, text) TO authenticated;

-- RPC para "saúde dos dashboards" — quantos mandatos com cada campo preenchido
CREATE OR REPLACE FUNCTION public.get_dashboard_coverage()
RETURNS TABLE(
  field text,
  filled bigint,
  empty bigint,
  total bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, equity_brain
AS $$
  SELECT 'deal_type'::text, count(*) FILTER (WHERE deal_type IS NOT NULL), count(*) FILTER (WHERE deal_type IS NULL), count(*) FROM equity_brain.mandates
  UNION ALL SELECT 'deal_phase', count(*) FILTER (WHERE deal_phase IS NOT NULL), count(*) FILTER (WHERE deal_phase IS NULL), count(*) FROM equity_brain.mandates
  UNION ALL SELECT 'outcome', count(*) FILTER (WHERE outcome IS NOT NULL), count(*) FILTER (WHERE outcome IS NULL), count(*) FROM equity_brain.mandates
  UNION ALL SELECT 'valor_operacao', count(*) FILTER (WHERE valor_operacao IS NOT NULL), count(*) FILTER (WHERE valor_operacao IS NULL), count(*) FROM equity_brain.mandates
  UNION ALL SELECT 'faturamento_vispe', count(*) FILTER (WHERE faturamento_vispe IS NOT NULL), count(*) FILTER (WHERE faturamento_vispe IS NULL), count(*) FROM equity_brain.mandates
  UNION ALL SELECT 'responsavel_id', count(*) FILTER (WHERE responsavel_id IS NOT NULL), count(*) FILTER (WHERE responsavel_id IS NULL), count(*) FROM equity_brain.mandates
  UNION ALL SELECT 'data_assinatura', count(*) FILTER (WHERE data_assinatura IS NOT NULL), count(*) FILTER (WHERE data_assinatura IS NULL), count(*) FROM equity_brain.mandates
  UNION ALL SELECT 'uf', count(*) FILTER (WHERE uf IS NOT NULL AND uf <> ''), count(*) FILTER (WHERE uf IS NULL OR uf = ''), count(*) FROM equity_brain.mandates
  UNION ALL SELECT 'setor', count(*) FILTER (WHERE setor IS NOT NULL AND setor <> ''), count(*) FILTER (WHERE setor IS NULL OR setor = ''), count(*) FROM equity_brain.mandates;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_coverage() TO authenticated;