
CREATE OR REPLACE FUNCTION equity_brain.compute_mandate_priority(p_mandate_id uuid)
RETURNS integer
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = equity_brain, public
AS $$
DECLARE
  v_score numeric := 0;
  v_max_match numeric;
  v_last_act timestamptz;
  v_value numeric;
  v_stage text;
  v_cnpj text;
  v_hot_buyers integer;
  v_value_pct numeric;
BEGIN
  SELECT m.mandate_value, m.last_activity_at, m.pipeline_stage::text, m.company_cnpj
    INTO v_value, v_last_act, v_stage, v_cnpj
  FROM equity_brain.mandates m WHERE m.id = p_mandate_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  IF v_cnpj IS NOT NULL THEN
    SELECT COALESCE(MAX(match_score), 0) INTO v_max_match
    FROM equity_brain.matches
    WHERE is_current = true
      AND status NOT IN ('rejected','closed','dropped')
      AND cnpj = v_cnpj;
  ELSE
    v_max_match := 0;
  END IF;
  v_score := v_score + LEAST(30, v_max_match * 30);

  IF v_last_act IS NULL THEN
    v_score := v_score + 12.5;
  ELSE
    v_score := v_score + GREATEST(0, 25 * (1 - LEAST(EXTRACT(EPOCH FROM (now()-v_last_act))/86400.0/30.0, 1)));
  END IF;

  IF v_value IS NOT NULL AND v_value > 0 THEN
    SELECT COALESCE(percent_rank() OVER (ORDER BY mandate_value), 0)
      INTO v_value_pct
    FROM equity_brain.mandates WHERE mandate_value > 0 AND id = p_mandate_id;
    v_score := v_score + 20 * COALESCE(v_value_pct, 0.5);
  ELSE
    v_score := v_score + 10;
  END IF;

  v_score := v_score + CASE v_stage
    WHEN 'nbo' THEN 15 WHEN 'spa' THEN 13 WHEN 'closing' THEN 11
    WHEN 'due_diligence' THEN 9 WHEN 'match' THEN 7 ELSE 0
  END;

  IF v_cnpj IS NOT NULL THEN
    SELECT COUNT(*) INTO v_hot_buyers
    FROM equity_brain.matches mt
    JOIN equity_brain.contacts c ON c.entity_id = mt.buyer_id AND c.entity_type = 'buyer'
    WHERE mt.is_current = true AND mt.cnpj = v_cnpj AND c.temperature = 'hot';
    v_score := v_score + LEAST(10, v_hot_buyers * 3);
  END IF;

  RETURN GREATEST(0, LEAST(100, ROUND(v_score)::integer));
END; $$;

-- Também corrige o RPC eb_today_cards para usar company_cnpj
CREATE OR REPLACE FUNCTION public.eb_today_cards(p_limit integer DEFAULT 7)
RETURNS TABLE (
  card_kind text, ref_id uuid, mandate_id uuid, mandate_codename text,
  mandate_value numeric, priority_score integer, match_score numeric,
  contact_id uuid, contact_name text, contact_phone text,
  days_inactive integer, headline text, subline text, computed_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = equity_brain, public
AS $$
DECLARE v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RETURN; END IF;
  RETURN QUERY
  WITH cooling AS (
    SELECT
      'cooling_deal'::text AS card_kind, m.id AS ref_id, m.id AS mandate_id,
      m.codename AS mandate_codename, m.mandate_value, m.priority_score,
      NULL::numeric AS match_score, ct.id AS contact_id,
      ct.nome AS contact_name, ct.telefone_e164 AS contact_phone,
      EXTRACT(DAY FROM (now() - m.last_activity_at))::integer AS days_inactive,
      ('Deal esfriando — ' || COALESCE(m.codename, 'mandato')) AS headline,
      ('Sem contato há ' || EXTRACT(DAY FROM (now() - m.last_activity_at))::integer || ' dias') AS subline,
      m.last_activity_at AS computed_at
    FROM equity_brain.mandates m
    LEFT JOIN LATERAL (
      SELECT * FROM equity_brain.contacts
      WHERE entity_type='mandate' AND entity_id=m.id AND telefone_e164 IS NOT NULL
      ORDER BY is_primary DESC NULLS LAST LIMIT 1
    ) ct ON true
    WHERE (m.responsavel_id = v_user
           OR v_user = ANY(COALESCE(m.co_advisor_ids,'{}'::uuid[]))
           OR m.origin_advisor_id = v_user)
      AND m.pipeline_stage <> 'closed'
      AND m.last_activity_at IS NOT NULL
      AND m.last_activity_at < now() - interval '14 days'
      AND m.priority_score >= 40
      AND NOT EXISTS (
        SELECT 1 FROM equity_brain.today_card_dismissals d
        WHERE d.user_id = v_user AND d.card_kind = 'cooling_deal'
          AND d.ref_id = m.id AND d.resurface_at > now()
      )
  ),
  hot AS (
    SELECT
      'hot_match'::text AS card_kind, mt.id AS ref_id, m.id AS mandate_id,
      m.codename AS mandate_codename, m.mandate_value, m.priority_score,
      mt.match_score, ct.id AS contact_id,
      ct.nome AS contact_name, ct.telefone_e164 AS contact_phone,
      NULL::integer AS days_inactive,
      ('Match quente — ' || COALESCE(c.nome_fantasia, c.razao_social, mt.cnpj)) AS headline,
      ('Score ' || ROUND(mt.match_score*100)::text || ' • ' || COALESCE(m.codename,'')) AS subline,
      mt.computed_at AS computed_at
    FROM equity_brain.matches mt
    JOIN equity_brain.companies c ON c.cnpj = mt.cnpj
    JOIN equity_brain.mandates m ON m.company_cnpj = mt.cnpj
    LEFT JOIN LATERAL (
      SELECT * FROM equity_brain.contacts
      WHERE entity_type='buyer' AND entity_id=mt.buyer_id AND telefone_e164 IS NOT NULL
      ORDER BY is_primary DESC NULLS LAST LIMIT 1
    ) ct ON true
    WHERE mt.is_current = true
      AND mt.match_score >= 0.75
      AND mt.status NOT IN ('rejected','closed','dropped')
      AND mt.computed_at > now() - interval '14 days'
      AND (m.responsavel_id = v_user
           OR v_user = ANY(COALESCE(m.co_advisor_ids,'{}'::uuid[]))
           OR m.origin_advisor_id = v_user
           OR mt.assigned_bdr = v_user)
      AND NOT EXISTS (
        SELECT 1 FROM equity_brain.today_card_dismissals d
        WHERE d.user_id = v_user AND d.card_kind = 'hot_match'
          AND d.ref_id = mt.id AND d.resurface_at > now()
      )
  )
  SELECT * FROM (SELECT * FROM hot UNION ALL SELECT * FROM cooling) ac
  ORDER BY
    CASE card_kind WHEN 'hot_match' THEN 0 ELSE 1 END,
    COALESCE(match_score, 0) DESC,
    priority_score DESC,
    computed_at DESC NULLS LAST
  LIMIT GREATEST(1, LEAST(p_limit, 20));
END; $$;

GRANT EXECUTE ON FUNCTION public.eb_today_cards(integer) TO authenticated;
