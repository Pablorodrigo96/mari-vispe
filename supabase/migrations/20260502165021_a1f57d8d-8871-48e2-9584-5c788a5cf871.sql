
-- D.2: mari_insights table
CREATE TABLE IF NOT EXISTS equity_brain.mari_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id uuid NOT NULL,
  mandate_id uuid REFERENCES equity_brain.mandates(id) ON DELETE CASCADE,
  buyer_id uuid REFERENCES equity_brain.buyers(id) ON DELETE CASCADE,
  insight_type text NOT NULL CHECK (insight_type IN ('urgency','opportunity','risk','learning')),
  priority int NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  trigger_rule text NOT NULL,
  message text NOT NULL,
  suggested_action text,
  action_payload jsonb,
  status text DEFAULT 'active' CHECK (status IN ('active','dismissed','acted','expired')),
  acted_at timestamptz,
  dismissed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mari_insights_advisor_active
  ON equity_brain.mari_insights(advisor_id, priority DESC, created_at DESC)
  WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_mari_insights_mandate
  ON equity_brain.mari_insights(mandate_id) WHERE mandate_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_mari_insights_dedup_active
  ON equity_brain.mari_insights(advisor_id, COALESCE(mandate_id, '00000000-0000-0000-0000-000000000000'::uuid), trigger_rule)
  WHERE status = 'active';

ALTER TABLE equity_brain.mari_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "advisor_sees_own_insights" ON equity_brain.mari_insights;
CREATE POLICY "advisor_sees_own_insights" ON equity_brain.mari_insights
  FOR SELECT TO authenticated
  USING (advisor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "advisor_can_update_own" ON equity_brain.mari_insights;
CREATE POLICY "advisor_can_update_own" ON equity_brain.mari_insights
  FOR UPDATE TO authenticated
  USING (advisor_id = auth.uid())
  WITH CHECK (advisor_id = auth.uid());

DROP POLICY IF EXISTS "service_can_insert_insights" ON equity_brain.mari_insights;
CREATE POLICY "service_can_insert_insights" ON equity_brain.mari_insights
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Expose to PostgREST: create wrapper view in public
CREATE OR REPLACE VIEW public.mari_insights AS
  SELECT * FROM equity_brain.mari_insights;
GRANT SELECT, UPDATE ON public.mari_insights TO authenticated;

-- Generator function (server-side, urgency rules only - lightweight)
CREATE OR REPLACE FUNCTION equity_brain.generate_mari_insights_for_advisor(p_advisor uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = equity_brain, public AS $$
DECLARE
  v_count int := 0;
  r record;
  v_days int;
  v_priority int;
  v_rule text;
BEGIN
  -- Rule 1: mandate expiring 30/15/7 days
  FOR r IN
    SELECT id, company_cnpj, data_vencimento
    FROM equity_brain.mandates
    WHERE responsavel_id = p_advisor
      AND status::text = 'vigente'
      AND data_vencimento IS NOT NULL
      AND data_vencimento BETWEEN current_date AND current_date + interval '30 days'
  LOOP
    v_days := (r.data_vencimento - current_date)::int;
    v_priority := CASE WHEN v_days <= 7 THEN 10 WHEN v_days <= 15 THEN 9 ELSE 8 END;
    v_rule := 'mandate_expiring_' || CASE WHEN v_days <= 7 THEN '7d' WHEN v_days <= 15 THEN '15d' ELSE '30d' END;
    INSERT INTO equity_brain.mari_insights(advisor_id, mandate_id, insight_type, priority, trigger_rule, message, suggested_action, action_payload)
    VALUES (
      p_advisor, r.id, 'urgency', v_priority, v_rule,
      format('Mandato %s vence em %s dias. Vale renovar agora.', COALESCE(r.company_cnpj,'(s/CNPJ)'), v_days),
      'Falar com cliente',
      jsonb_build_object('type','open_deal','mandate_id', r.id)
    )
    ON CONFLICT DO NOTHING;
    v_count := v_count + 1;
  END LOOP;

  -- Rule 2: deal sem atividade há 7+ dias
  FOR r IN
    SELECT id, company_cnpj, last_activity_at
    FROM equity_brain.mandates
    WHERE responsavel_id = p_advisor
      AND status::text = 'vigente'
      AND COALESCE(last_activity_at, created_at) < now() - interval '7 days'
    LIMIT 20
  LOOP
    INSERT INTO equity_brain.mari_insights(advisor_id, mandate_id, insight_type, priority, trigger_rule, message, suggested_action, action_payload)
    VALUES (
      p_advisor, r.id, 'urgency', 7, 'deal_stale_7d',
      format('Sem interação em %s há 7+ dias. Quebra inércia.', COALESCE(r.company_cnpj,'mandato')),
      'Registrar contato',
      jsonb_build_object('type','open_deal','mandate_id', r.id)
    )
    ON CONFLICT DO NOTHING;
    v_count := v_count + 1;
  END LOOP;

  -- Rule 3: tempo na fase 2x acima da média (risco) — fallback simples: > 30 dias na mesma fase
  FOR r IN
    SELECT id, company_cnpj, pipeline_stage, stage_changed_at
    FROM equity_brain.mandates
    WHERE responsavel_id = p_advisor
      AND status::text = 'vigente'
      AND stage_changed_at IS NOT NULL
      AND stage_changed_at < now() - interval '30 days'
    LIMIT 20
  LOOP
    INSERT INTO equity_brain.mari_insights(advisor_id, mandate_id, insight_type, priority, trigger_rule, message, suggested_action, action_payload)
    VALUES (
      p_advisor, r.id, 'risk', 6, 'stage_overdue',
      format('Mandato preso na fase %s há mais de 30 dias.', COALESCE(r.pipeline_stage::text,'(s/fase)')),
      'Revisar fase',
      jsonb_build_object('type','open_deal','mandate_id', r.id)
    )
    ON CONFLICT DO NOTHING;
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END $$;

CREATE OR REPLACE FUNCTION equity_brain.generate_mari_insights_all()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = equity_brain, public AS $$
DECLARE v_total int := 0; r record;
BEGIN
  FOR r IN SELECT DISTINCT responsavel_id FROM equity_brain.mandates WHERE responsavel_id IS NOT NULL AND status::text='vigente' LOOP
    v_total := v_total + equity_brain.generate_mari_insights_for_advisor(r.responsavel_id);
  END LOOP;
  INSERT INTO mari_ops.health_check(function_name, status, payload_summary)
  VALUES ('generate_mari_insights_all','success', format('inserted=%s', v_total));
  RETURN v_total;
END $$;

GRANT EXECUTE ON FUNCTION equity_brain.generate_mari_insights_all() TO authenticated;
GRANT EXECUTE ON FUNCTION equity_brain.generate_mari_insights_for_advisor(uuid) TO authenticated;

-- D.6: smoke tests v2
CREATE OR REPLACE FUNCTION mari_ops.daily_smoke_tests() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, equity_brain, mari_ops AS $$
DECLARE
  total_mandates int; total_matches int; total_buyers_active int;
  views_fresh boolean; insights_generated int;
BEGIN
  SELECT COUNT(*) INTO total_mandates FROM equity_brain.mandates;
  IF total_mandates < 50 THEN
    INSERT INTO mari_ops.health_check(function_name,status,error_message)
    VALUES ('smoke_total_mandates','warning','Mandates baixos: '||total_mandates);
  END IF;

  SELECT COUNT(*) INTO total_matches FROM equity_brain.matches WHERE COALESCE(is_current,true) = true;
  IF total_matches < 100 THEN
    INSERT INTO mari_ops.health_check(function_name,status,error_message)
    VALUES ('smoke_matches_low','warning','Matches ativos baixos: '||total_matches);
  END IF;

  SELECT COUNT(*) INTO total_buyers_active FROM equity_brain.buyers WHERE COALESCE(is_synthetic,false) = false;
  IF total_buyers_active < 20 THEN
    INSERT INTO mari_ops.health_check(function_name,status,error_message)
    VALUES ('smoke_buyers_low','warning','Buyers reais baixos: '||total_buyers_active);
  END IF;

  SELECT (now() - max(ts)) < interval '24 hours' INTO views_fresh
  FROM mari_ops.health_check WHERE function_name = 'refresh_dashboard_views';
  IF NOT COALESCE(views_fresh,false) THEN
    INSERT INTO mari_ops.health_check(function_name,status,error_message)
    VALUES ('smoke_views_freshness','warning','Views não atualizadas em 24h');
  END IF;

  SELECT COUNT(*) INTO insights_generated
  FROM equity_brain.mari_insights
  WHERE created_at >= now() - interval '24 hours';

  INSERT INTO mari_ops.health_check(function_name, status, payload_summary)
  VALUES ('smoke_test_daily','success',
    format('mandates=%s matches=%s buyers=%s insights24h=%s',
      total_mandates,total_matches,total_buyers_active,insights_generated));
END $$;
