CREATE OR REPLACE FUNCTION public.eb_today_cards(p_limit integer DEFAULT 7)
RETURNS TABLE(
  card_kind text,
  ref_id uuid,
  mandate_id uuid,
  mandate_codename text,
  mandate_value numeric,
  priority_score integer,
  match_score numeric,
  contact_id uuid,
  contact_name text,
  contact_phone text,
  days_inactive integer,
  headline text,
  subline text,
  computed_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'equity_brain', 'public'
AS $function$
DECLARE v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RETURN; END IF;

  RETURN QUERY
  WITH cooling AS (
    SELECT
      'cooling_deal'::text AS card_kind,
      m.id AS ref_id, m.id AS mandate_id,
      COALESCE(c.codename, m.company_cnpj) AS mandate_codename,
      m.mandate_value,
      m.priority_score,
      NULL::numeric AS match_score,
      ct.id AS contact_id,
      ct.nome AS contact_name,
      ct.telefone_e164 AS contact_phone,
      EXTRACT(DAY FROM (now() - m.last_activity_at))::integer AS days_inactive,
      ('Deal esfriando — ' || COALESCE(c.codename, m.company_cnpj, 'mandato')) AS headline,
      ('Sem contato há ' || EXTRACT(DAY FROM (now() - m.last_activity_at))::integer || ' dias') AS subline,
      m.last_activity_at AS computed_at
    FROM equity_brain.mandates m
    LEFT JOIN equity_brain.companies c ON c.cnpj = m.company_cnpj
    LEFT JOIN LATERAL (
      SELECT id, nome, telefone_e164 FROM equity_brain.contacts
      WHERE entity_type='mandate' AND entity_id=m.id AND telefone_e164 IS NOT NULL
      ORDER BY is_primary DESC NULLS LAST LIMIT 1
    ) ct ON true
    LEFT JOIN equity_brain.today_card_dismissals d
      ON d.user_id = v_user AND d.card_kind = 'cooling_deal'
         AND d.ref_id = m.id AND d.resurface_at > now()
    WHERE (m.responsavel_id = v_user
           OR v_user = ANY(COALESCE(m.co_advisor_ids,'{}'::uuid[]))
           OR m.origin_advisor_id = v_user)
      AND (m.pipeline_stage IS NULL OR m.pipeline_stage::text NOT IN ('closed'))
      AND m.last_activity_at IS NOT NULL
      AND m.last_activity_at < now() - interval '14 days'
      AND d.id IS NULL
  ),
  hot AS (
    SELECT
      'hot_match'::text AS card_kind,
      mt.id AS ref_id, m.id AS mandate_id,
      COALESCE(c.codename, m.company_cnpj) AS mandate_codename,
      m.mandate_value,
      m.priority_score,
      mt.match_score,
      NULL::uuid AS contact_id,
      NULL::text AS contact_name,
      NULL::text AS contact_phone,
      NULL::integer AS days_inactive,
      ('Match quente — ' || COALESCE(c.codename, m.company_cnpj, 'deal')) AS headline,
      ('Score ' || ROUND(mt.match_score*100)::text || ' • ' || COALESCE(b.nome, 'buyer')) AS subline,
      mt.computed_at
    FROM equity_brain.matches mt
    JOIN equity_brain.mandates m ON m.company_cnpj = mt.cnpj
    LEFT JOIN equity_brain.companies c ON c.cnpj = m.company_cnpj
    LEFT JOIN equity_brain.buyers b ON b.id = mt.buyer_id
    LEFT JOIN equity_brain.today_card_dismissals d
      ON d.user_id = v_user AND d.card_kind = 'hot_match'
         AND d.ref_id = mt.id AND d.resurface_at > now()
    WHERE (m.responsavel_id = v_user
           OR v_user = ANY(COALESCE(m.co_advisor_ids,'{}'::uuid[]))
           OR m.origin_advisor_id = v_user)
      AND mt.is_current = true
      AND mt.match_score >= 0.7
      AND (m.pipeline_stage IS NULL OR m.pipeline_stage::text NOT IN ('closed'))
      AND d.id IS NULL
  )
  SELECT * FROM (SELECT * FROM hot UNION ALL SELECT * FROM cooling) all_cards
  ORDER BY priority_score DESC NULLS LAST, computed_at DESC NULLS LAST
  LIMIT p_limit;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.eb_today_cards(integer) TO authenticated;