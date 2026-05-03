CREATE OR REPLACE FUNCTION equity_brain.generate_mari_insights_for_advisor(p_advisor uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'equity_brain', 'public'
AS $function$
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

  -- Rule 4 (NEW): novo match top nas últimas 24h — 1 insight por mandato/dia
  FOR r IN
    SELECT m.id AS mandate_id, m.company_cnpj,
           (SELECT mt.id FROM equity_brain.matches mt
              WHERE mt.cnpj = m.company_cnpj
                AND mt.is_current = true
                AND mt.match_score >= 60
                AND mt.computed_at > now() - interval '24 hours'
              ORDER BY mt.match_score DESC LIMIT 1) AS top_match_id,
           (SELECT mt.match_score FROM equity_brain.matches mt
              WHERE mt.cnpj = m.company_cnpj
                AND mt.is_current = true
                AND mt.match_score >= 60
                AND mt.computed_at > now() - interval '24 hours'
              ORDER BY mt.match_score DESC LIMIT 1) AS top_score,
           (SELECT b.nome FROM equity_brain.matches mt
              JOIN equity_brain.buyers b ON b.id = mt.buyer_id
              WHERE mt.cnpj = m.company_cnpj
                AND mt.is_current = true
                AND mt.match_score >= 60
                AND mt.computed_at > now() - interval '24 hours'
              ORDER BY mt.match_score DESC LIMIT 1) AS top_buyer_nome
    FROM equity_brain.mandates m
    WHERE m.responsavel_id = p_advisor
      AND m.status::text = 'vigente'
      AND m.company_cnpj IS NOT NULL
  LOOP
    IF r.top_match_id IS NOT NULL THEN
      v_rule := 'new_top_match_' || to_char(current_date, 'YYYYMMDD');
      INSERT INTO equity_brain.mari_insights(advisor_id, mandate_id, insight_type, priority, trigger_rule, message, suggested_action, action_payload)
      VALUES (
        p_advisor, r.mandate_id, 'opportunity', 8, v_rule,
        format('Novo match top: %s ↔ %s (score %s).',
               COALESCE(r.top_buyer_nome,'(buyer)'),
               COALESCE(r.company_cnpj,'mandato'),
               r.top_score),
        'Abrir match',
        jsonb_build_object('type','open_match','match_id', r.top_match_id, 'mandate_id', r.mandate_id)
      )
      ON CONFLICT DO NOTHING;
      v_count := v_count + 1;
    END IF;
  END LOOP;

  -- Rule 5 (NEW): oportunidade quente score >= 70 — até 3/mandato/semana
  FOR r IN
    SELECT m.id AS mandate_id, m.company_cnpj, mt.id AS match_id,
           mt.match_score, mt.buyer_id, b.nome AS buyer_nome
    FROM equity_brain.mandates m
    JOIN equity_brain.matches mt ON mt.cnpj = m.company_cnpj
    JOIN equity_brain.buyers b ON b.id = mt.buyer_id
    WHERE m.responsavel_id = p_advisor
      AND m.status::text = 'vigente'
      AND m.company_cnpj IS NOT NULL
      AND mt.is_current = true
      AND mt.match_score >= 70
      AND NOT EXISTS (
        SELECT 1 FROM equity_brain.mari_insights mi
        WHERE mi.advisor_id = p_advisor
          AND mi.mandate_id = m.id
          AND mi.trigger_rule LIKE ('hot_opportunity_' || mt.buyer_id::text || '_%')
          AND mi.created_at > now() - interval '7 days'
      )
      AND (
        SELECT COUNT(*) FROM equity_brain.mari_insights mi2
        WHERE mi2.advisor_id = p_advisor
          AND mi2.mandate_id = m.id
          AND mi2.trigger_rule LIKE 'hot_opportunity_%'
          AND mi2.created_at > now() - interval '7 days'
      ) < 3
    ORDER BY m.id, mt.match_score DESC
    LIMIT 50
  LOOP
    v_rule := 'hot_opportunity_' || r.buyer_id::text || '_' || to_char(date_trunc('week', now()), 'YYYYMMDD');
    INSERT INTO equity_brain.mari_insights(advisor_id, mandate_id, buyer_id, insight_type, priority, trigger_rule, message, suggested_action, action_payload)
    VALUES (
      p_advisor, r.mandate_id, r.buyer_id, 'opportunity', 7, v_rule,
      format('Oportunidade quente: %s interessa em %s (score %s).',
             COALESCE(r.buyer_nome,'(buyer)'),
             COALESCE(r.company_cnpj,'mandato'),
             r.match_score),
      'Abrir match',
      jsonb_build_object('type','open_match','match_id', r.match_id, 'mandate_id', r.mandate_id, 'buyer_id', r.buyer_id)
    )
    ON CONFLICT DO NOTHING;
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END $function$;