
-- 1) Benchmarks: exigir autenticação (remove leitura pública via anon key)
DROP POLICY IF EXISTS "Comps readable by all" ON public.equity_comps_benchmarks;
CREATE POLICY "Comps readable by authenticated"
  ON public.equity_comps_benchmarks
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone authenticated can read dimension benchmarks" ON public.equity_dimension_benchmarks;
CREATE POLICY "Dimension benchmarks readable by authenticated"
  ON public.equity_dimension_benchmarks
  FOR SELECT
  TO authenticated
  USING (true);

REVOKE SELECT ON public.equity_comps_benchmarks FROM anon;
REVOKE SELECT ON public.equity_dimension_benchmarks FROM anon;
GRANT SELECT ON public.equity_comps_benchmarks TO authenticated;
GRANT SELECT ON public.equity_dimension_benchmarks TO authenticated;

-- 2) RPC atômico: regrava resultado do compute em uma única transação
CREATE OR REPLACE FUNCTION public.equity_compute_persist(
  p_assessment_id uuid,
  p_dim_rows      jsonb,   -- array de { dimensao, score, evidencia, peso? }
  p_valuation     jsonb,   -- objeto valuation
  p_bridge_items  jsonb,   -- array de { parcela, descricao, delta_valor, ordem }
  p_initiatives   jsonb,   -- array de iniciativas
  p_buyer_map     jsonb,   -- array de buyers
  p_progress      jsonb DEFAULT NULL  -- opcional: linha de progress_log
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_val_id uuid;
  v_prev_ids uuid[];
BEGIN
  -- cleanup dependente primeiro
  SELECT array_agg(id) INTO v_prev_ids
    FROM public.equity_valuations WHERE assessment_id = p_assessment_id;
  IF v_prev_ids IS NOT NULL THEN
    DELETE FROM public.equity_value_bridge_items WHERE valuation_id = ANY(v_prev_ids);
    DELETE FROM public.equity_valuations WHERE assessment_id = p_assessment_id;
  END IF;
  DELETE FROM public.equity_dimension_scores WHERE assessment_id = p_assessment_id;
  DELETE FROM public.equity_initiatives WHERE assessment_id = p_assessment_id;
  DELETE FROM public.equity_buyer_map WHERE assessment_id = p_assessment_id;

  -- dimension scores
  IF jsonb_typeof(p_dim_rows) = 'array' AND jsonb_array_length(p_dim_rows) > 0 THEN
    INSERT INTO public.equity_dimension_scores (assessment_id, dimensao, score, evidencia, peso)
    SELECT
      p_assessment_id,
      (r->>'dimensao')::text,
      COALESCE((r->>'score')::numeric, 0),
      r->>'evidencia',
      COALESCE((r->>'peso')::numeric, NULL)
    FROM jsonb_array_elements(p_dim_rows) r;
  END IF;

  -- valuation (uma linha)
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
      assessment_id, library_id, titulo, descricao, dimensao_alvo,
      delta_ipe, delta_valor, esforco, prazo_meses, sprint, tipo, prioridade
    )
    SELECT
      p_assessment_id,
      NULLIF(i->>'library_id','')::uuid,
      i->>'titulo',
      i->>'descricao',
      i->>'dimensao_alvo',
      COALESCE((i->>'delta_ipe')::numeric, 0),
      COALESCE((i->>'delta_valor')::numeric, 0),
      COALESCE(i->>'esforco','medio'),
      COALESCE((i->>'prazo_meses')::int, 3),
      COALESCE((i->>'sprint')::int, 1),
      COALESCE(i->>'tipo','melhoria'),
      COALESCE((i->>'prioridade')::int, 0)
    FROM jsonb_array_elements(p_initiatives) i;
  END IF;

  -- buyer map
  IF jsonb_typeof(p_buyer_map) = 'array' AND jsonb_array_length(p_buyer_map) > 0 THEN
    INSERT INTO public.equity_buyer_map (
      assessment_id, perfil_id, nome_perfil, tipo, sinergias,
      racional_premio, exemplos_targets, premio_estimado_pct, selecionado
    )
    SELECT
      p_assessment_id,
      NULLIF(b->>'perfil_id','')::uuid,
      b->>'nome_perfil',
      COALESCE(b->>'tipo','estrategico'),
      COALESCE(b->'sinergias','[]'::jsonb),
      b->>'racional_premio',
      COALESCE(b->'exemplos_targets','[]'::jsonb),
      COALESCE((b->>'premio_estimado_pct')::numeric, 0),
      COALESCE((b->>'selecionado')::boolean, false)
    FROM jsonb_array_elements(p_buyer_map) b;
  END IF;

  -- progress log (opcional)
  IF p_progress IS NOT NULL AND jsonb_typeof(p_progress) = 'object' THEN
    INSERT INTO public.equity_progress_log (
      assessment_id, company_id, ipe_composto, valor_atual, valor_alvo,
      arquetipo_id, dim_snapshot
    ) VALUES (
      p_assessment_id,
      NULLIF(p_progress->>'company_id','')::uuid,
      NULLIF(p_progress->>'ipe_composto','')::numeric,
      NULLIF(p_progress->>'valor_atual','')::numeric,
      NULLIF(p_progress->>'valor_alvo','')::numeric,
      p_progress->>'arquetipo_id',
      COALESCE(p_progress->'dim_snapshot','{}'::jsonb)
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'valuation_id', v_val_id);
END;
$$;

REVOKE ALL ON FUNCTION public.equity_compute_persist(uuid, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.equity_compute_persist(uuid, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) TO service_role;
