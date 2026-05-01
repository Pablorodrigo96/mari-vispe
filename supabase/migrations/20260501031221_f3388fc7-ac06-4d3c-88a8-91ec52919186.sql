
CREATE OR REPLACE FUNCTION equity_brain.auto_promote_pipeline_stage()
RETURNS TABLE(updated_count integer, by_stage jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = equity_brain, public
AS $$
DECLARE
  v_total integer := 0;
  v_n integer := 0;
  v_result jsonb;
BEGIN
  -- 1) Outcomes terminais → closed
  UPDATE equity_brain.mandates
     SET pipeline_stage = 'closed'::equity_brain.pipeline_stage,
         stage_changed_at = COALESCE(stage_changed_at, now())
   WHERE outcome::text IN ('vendemos','concluido','vencido','vendeu_sozinho')
     AND pipeline_stage::text <> 'closed';
  GET DIAGNOSTICS v_n = ROW_COUNT; v_total := v_total + v_n;

  -- 2) Tem data_assinatura → closing
  UPDATE equity_brain.mandates
     SET pipeline_stage = 'closing'::equity_brain.pipeline_stage,
         stage_changed_at = COALESCE(stage_changed_at, now())
   WHERE data_assinatura IS NOT NULL
     AND pipeline_stage::text NOT IN ('closing','closed');
  GET DIAGNOSTICS v_n = ROW_COUNT; v_total := v_total + v_n;

  -- 3) Tem comprador vinculado → nbo
  UPDATE equity_brain.mandates
     SET pipeline_stage = 'nbo'::equity_brain.pipeline_stage,
         stage_changed_at = COALESCE(stage_changed_at, now())
   WHERE (comprador_cnpj IS NOT NULL OR match_buyer_id IS NOT NULL)
     AND pipeline_stage::text = 'match';
  GET DIAGNOSTICS v_n = ROW_COUNT; v_total := v_total + v_n;

  -- 4) Mandato real com valor + contato → nbo
  UPDATE equity_brain.mandates
     SET pipeline_stage = 'nbo'::equity_brain.pipeline_stage,
         stage_changed_at = COALESCE(stage_changed_at, now())
   WHERE deal_kind = 'mandato_assinado'
     AND COALESCE(valor_operacao, 0) > 0
     AND contato_nome IS NOT NULL
     AND pipeline_stage::text = 'match';
  GET DIAGNOSTICS v_n = ROW_COUNT; v_total := v_total + v_n;

  SELECT jsonb_object_agg(stage_key, n) INTO v_result
  FROM (
    SELECT pipeline_stage::text AS stage_key, count(*)::int AS n
    FROM equity_brain.mandates
    GROUP BY pipeline_stage
  ) s;

  RETURN QUERY SELECT v_total, v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION equity_brain.auto_promote_pipeline_stage() TO authenticated;

CREATE OR REPLACE VIEW public.eb_crm_audit_v2 AS
SELECT 'sem_responsavel'::text AS check_key,
       'Mandatos sem responsável atribuído'::text AS label,
       'high'::text AS severity,
       count(*)::int AS total,
       (array_agg(id ORDER BY created_at DESC))[1:20] AS sample_ids
FROM equity_brain.mandates
WHERE responsavel_id IS NULL
  AND outcome::text NOT IN ('cancelado','concluido','vendemos','vendeu_sozinho')

UNION ALL
SELECT 'sem_valor', 'Deals sem valor operação', 'medium',
       count(*)::int, (array_agg(id ORDER BY created_at DESC))[1:20]
FROM equity_brain.mandates
WHERE COALESCE(valor_operacao, valor_pedido, 0) = 0
  AND outcome::text = 'em_andamento'
  AND deal_kind = 'mandato_assinado'

UNION ALL
SELECT 'sem_contato', 'Mandatos reais sem contato inline', 'high',
       count(*)::int, (array_agg(id ORDER BY created_at DESC))[1:20]
FROM equity_brain.mandates
WHERE contato_nome IS NULL AND contato_telefone IS NULL
  AND deal_kind = 'mandato_assinado' AND outcome::text = 'em_andamento'

UNION ALL
SELECT 'cnpj_placeholder', 'Empresas com CNPJ placeholder (precisa enriquecer)', 'medium',
       count(*)::int, (array_agg(id ORDER BY created_at DESC))[1:20]
FROM equity_brain.mandates
WHERE needs_enrichment = true

UNION ALL
SELECT 'preso_match_30d', 'Presos em "match" há mais de 30 dias', 'high',
       count(*)::int, (array_agg(id ORDER BY stage_changed_at DESC NULLS LAST))[1:20]
FROM equity_brain.mandates
WHERE pipeline_stage::text = 'match'
  AND outcome::text = 'em_andamento'
  AND stage_changed_at < now() - interval '30 days'

UNION ALL
SELECT 'marketplace_pendente', 'Listings de marketplace que precisam virar mandato real ou ser arquivadas', 'low',
       count(*)::int, (array_agg(id ORDER BY created_at DESC))[1:20]
FROM equity_brain.mandates
WHERE deal_kind = 'marketplace_listing' AND comprador_cnpj IS NULL AND outcome::text = 'em_andamento';

GRANT SELECT ON public.eb_crm_audit_v2 TO authenticated;

CREATE OR REPLACE FUNCTION equity_brain.rebuild_crm_state()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = equity_brain, public
AS $$
DECLARE
  v_promoted jsonb;
  v_stage_fixed integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'apenas admin';
  END IF;

  PERFORM equity_brain.rebuild_mandate_classification();

  SELECT to_jsonb(t) INTO v_promoted
  FROM equity_brain.auto_promote_pipeline_stage() t;

  UPDATE equity_brain.mandates
     SET stage_changed_at = COALESCE(updated_at, created_at, now())
   WHERE stage_changed_at IS NULL;
  GET DIAGNOSTICS v_stage_fixed = ROW_COUNT;

  RETURN jsonb_build_object(
    'classified', true,
    'promoted', v_promoted,
    'stage_changed_at_fixed', v_stage_fixed,
    'ran_at', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION equity_brain.rebuild_crm_state() TO authenticated;

-- Roda agora pra promover os 317 mandatos presos em 'match'
SELECT * FROM equity_brain.auto_promote_pipeline_stage();
