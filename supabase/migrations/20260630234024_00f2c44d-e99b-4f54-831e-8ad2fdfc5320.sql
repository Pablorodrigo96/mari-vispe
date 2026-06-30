
DROP FUNCTION IF EXISTS public.equity_compute_persist(uuid, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb);

CREATE OR REPLACE FUNCTION public.equity_compute_persist(
  p_assessment_id uuid,
  p_dim_rows      jsonb,   -- [{ dimensao, score, peso, evidencias, destruidor_top }]
  p_valuation     jsonb,   -- objeto valuation
  p_bridge_items  jsonb,   -- [{ parcela, descricao, delta_valor, ordem }]
  p_initiatives   jsonb,   -- [iniciativas com shape igual ao insert atual]
  p_buyer_map     jsonb,   -- [buyers com shape igual ao insert atual]
  p_progress      jsonb DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_val_id   uuid;
  v_prev_ids uuid[];
BEGIN
  -- limpeza prévia
  SELECT array_agg(id) INTO v_prev_ids
    FROM public.equity_valuations WHERE assessment_id = p_assessment_id;
  IF v_prev_ids IS NOT NULL THEN
    DELETE FROM public.equity_value_bridge_items WHERE valuation_id = ANY(v_prev_ids);
    DELETE FROM public.equity_valuations WHERE assessment_id = p_assessment_id;
  END IF;
  DELETE FROM public.equity_dimension_scores WHERE assessment_id = p_assessment_id;
  DELETE FROM public.equity_initiatives      WHERE assessment_id = p_assessment_id;
  DELETE FROM public.equity_buyer_map        WHERE assessment_id = p_assessment_id;

  -- dimension scores
  IF jsonb_typeof(p_dim_rows) = 'array' AND jsonb_array_length(p_dim_rows) > 0 THEN
    INSERT INTO public.equity_dimension_scores
      (assessment_id, dimensao, score, peso, evidencias, destruidor_top)
    SELECT
      p_assessment_id,
      r->>'dimensao',
      COALESCE((r->>'score')::int, 0),
      COALESCE((r->>'peso')::numeric, NULL),
      COALESCE(r->'evidencias', '[]'::jsonb),
      COALESCE((r->>'destruidor_top')::boolean, false)
    FROM jsonb_array_elements(p_dim_rows) r;
  END IF;

  -- valuation
  IF p_valuation IS NOT NULL AND jsonb_typeof(p_valuation) = 'object' THEN
    INSERT INTO public.equity_valuations (
      assessment_id, metodo, ebitda_contabil, ebitda_normalizado, addbacks,
      multiplo_aplicado, faixa_min, faixa_max,
      valor_atual, valor_alvo, valor_dcf, valor_sde, valor_triangulado,
      dcf_premissas, premissas
    ) VALUES (
      p_assessment_id,
      COALESCE(p_valuation->>'metodo','triangulado'),
      COALESCE((p_valuation->>'ebitda_contabil')::numeric, 0),
      COALESCE((p_valuation->>'ebitda_normalizado')::numeric, 0),
      COALESCE(p_valuation->'addbacks', '{}'::jsonb),
      COALESCE((p_valuation->>'multiplo_aplicado')::numeric, 0),
      NULLIF(p_valuation->>'faixa_min','')::numeric,
      NULLIF(p_valuation->>'faixa_max','')::numeric,
      COALESCE((p_valuation->>'valor_atual')::numeric, 0),
      COALESCE((p_valuation->>'valor_alvo')::numeric, 0),
      NULLIF(p_valuation->>'valor_dcf','')::numeric,
      NULLIF(p_valuation->>'valor_sde','')::numeric,
      NULLIF(p_valuation->>'valor_triangulado','')::numeric,
      COALESCE(p_valuation->'dcf_premissas','{}'::jsonb),
      COALESCE(p_valuation->'premissas','{}'::jsonb)
    ) RETURNING id INTO v_val_id;

    IF jsonb_typeof(p_bridge_items) = 'array' AND jsonb_array_length(p_bridge_items) > 0 THEN
      INSERT INTO public.equity_value_bridge_items (valuation_id, parcela, descricao, delta_valor, ordem)
      SELECT
        v_val_id,
        b->>'parcela',
        b->>'descricao',
        COALESCE((b->>'delta_valor')::numeric, 0),
        COALESCE((b->>'ordem')::int, 0)
      FROM jsonb_array_elements(p_bridge_items) b;
    END IF;
  END IF;

  -- initiatives
  IF jsonb_typeof(p_initiatives) = 'array' AND jsonb_array_length(p_initiatives) > 0 THEN
    INSERT INTO public.equity_initiatives (
      assessment_id, dimensao_alvo, titulo, descricao,
      delta_ipe, delta_valor, esforco, prazo_meses, sprint, status, tipo, prioridade
    )
    SELECT
      p_assessment_id,
      i->>'dimensao_alvo',
      i->>'titulo',
      i->>'descricao',
      COALESCE((i->>'delta_ipe')::int, 0),
      COALESCE((i->>'delta_valor')::numeric, 0),
      COALESCE(i->>'esforco','medio'),
      COALESCE((i->>'prazo_meses')::int, 3),
      COALESCE((i->>'sprint')::int, 1),
      COALESCE(i->>'status','planejada'),
      COALESCE(i->>'tipo','execucao'),
      COALESCE((i->>'prioridade')::int, 0)
    FROM jsonb_array_elements(p_initiatives) i;
  END IF;

  -- buyer map
  IF jsonb_typeof(p_buyer_map) = 'array' AND jsonb_array_length(p_buyer_map) > 0 THEN
    INSERT INTO public.equity_buyer_map (
      assessment_id, arquetipo_comprador, nome_alvo, setor_alvo, tese_aquisicao,
      racional_premio, sinergias, exemplos_targets,
      premio_estimado_pct, premio_estimado_valor, prioridade, selecionado
    )
    SELECT
      p_assessment_id,
      COALESCE(b->>'arquetipo_comprador','estrategico'),
      b->>'nome_alvo',
      b->>'setor_alvo',
      b->>'tese_aquisicao',
      b->>'racional_premio',
      COALESCE(b->'sinergias','[]'::jsonb),
      COALESCE(b->'exemplos_targets','[]'::jsonb),
      COALESCE((b->>'premio_estimado_pct')::numeric, 0),
      COALESCE((b->>'premio_estimado_valor')::numeric, 0),
      COALESCE((b->>'prioridade')::int, 0),
      COALESCE((b->>'selecionado')::boolean, false)
    FROM jsonb_array_elements(p_buyer_map) b;
  END IF;

  -- progress log
  IF p_progress IS NOT NULL AND jsonb_typeof(p_progress) = 'object' THEN
    INSERT INTO public.equity_progress_log (
      company_id, assessment_id, ipe, valor, valor_alvo,
      arquetipo_id, veredito_liquidez, dim_snapshot, top_destruidores, evento
    ) VALUES (
      NULLIF(p_progress->>'company_id','')::uuid,
      p_assessment_id,
      COALESCE((p_progress->>'ipe')::int, 0),
      NULLIF(p_progress->>'valor','')::numeric,
      NULLIF(p_progress->>'valor_alvo','')::numeric,
      p_progress->>'arquetipo_id',
      p_progress->>'veredito_liquidez',
      COALESCE(p_progress->'dim_snapshot','{}'::jsonb),
      COALESCE(p_progress->'top_destruidores','[]'::jsonb),
      COALESCE(p_progress->>'evento','compute')
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'valuation_id', v_val_id);
END;
$$;

REVOKE ALL ON FUNCTION public.equity_compute_persist(uuid, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.equity_compute_persist(uuid, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) TO service_role;
