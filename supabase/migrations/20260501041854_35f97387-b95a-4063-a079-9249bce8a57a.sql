
-- 1) Colunas em equity_brain.mandates
ALTER TABLE equity_brain.mandates
  ADD COLUMN IF NOT EXISTS last_activity_at  timestamptz,
  ADD COLUMN IF NOT EXISTS last_outreach_at  timestamptz,
  ADD COLUMN IF NOT EXISTS priority_score    integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mandate_value     numeric;

-- Backfill last_activity_at
UPDATE equity_brain.mandates m
SET last_activity_at = sub.maxdate
FROM (
  SELECT entity_id, MAX(created_at) AS maxdate
  FROM equity_brain.crm_activities
  WHERE entity_type = 'mandate'
  GROUP BY entity_id
) sub
WHERE m.id = sub.entity_id AND m.last_activity_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_mandates_priority_score
  ON equity_brain.mandates (priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_mandates_responsavel
  ON equity_brain.mandates (responsavel_id);
CREATE INDEX IF NOT EXISTS idx_mandates_last_activity
  ON equity_brain.mandates (last_activity_at DESC NULLS LAST);

-- 2) Tabela de resumos
CREATE TABLE IF NOT EXISTS equity_brain.mandate_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mandate_id uuid NOT NULL REFERENCES equity_brain.mandates(id) ON DELETE CASCADE,
  summary_text text NOT NULL,
  suggested_action_text text,
  suggested_action_intent text,
  suggested_contact_id uuid,
  suggested_message_draft text,
  model text NOT NULL DEFAULT 'google/gemini-2.5-flash',
  tokens_in integer,
  tokens_out integer,
  generated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '4 hours')
);

CREATE INDEX IF NOT EXISTS idx_mandate_summaries_mandate
  ON equity_brain.mandate_summaries(mandate_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_mandate_summaries_expires
  ON equity_brain.mandate_summaries(expires_at);

ALTER TABLE equity_brain.mandate_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Advisors view summaries for their mandates" ON equity_brain.mandate_summaries;
CREATE POLICY "Advisors view summaries for their mandates"
  ON equity_brain.mandate_summaries FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM equity_brain.mandates m
      WHERE m.id = mandate_summaries.mandate_id
        AND (
          m.responsavel_id = auth.uid()
          OR auth.uid() = ANY(COALESCE(m.co_advisor_ids, '{}'::uuid[]))
          OR m.origin_advisor_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin'::public.app_role)
        )
    )
  );

DROP POLICY IF EXISTS "Service role manages summaries" ON equity_brain.mandate_summaries;
CREATE POLICY "Service role manages summaries"
  ON equity_brain.mandate_summaries FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 3) Dispensa de cards
CREATE TABLE IF NOT EXISTS equity_brain.today_card_dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  card_kind text NOT NULL,
  ref_id uuid NOT NULL,
  reason text,
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  resurface_at timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

CREATE INDEX IF NOT EXISTS idx_today_dismissals_lookup
  ON equity_brain.today_card_dismissals(user_id, card_kind, ref_id, resurface_at);

ALTER TABLE equity_brain.today_card_dismissals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own dismissals" ON equity_brain.today_card_dismissals;
CREATE POLICY "Users manage own dismissals"
  ON equity_brain.today_card_dismissals FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins view all dismissals" ON equity_brain.today_card_dismissals;
CREATE POLICY "Admins view all dismissals"
  ON equity_brain.today_card_dismissals FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 4) Cálculo do priority_score
CREATE OR REPLACE FUNCTION equity_brain.compute_mandate_priority(p_mandate_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = equity_brain, public
AS $$
DECLARE
  v_score numeric := 0;
  v_max_match numeric;
  v_last_act timestamptz;
  v_value numeric;
  v_stage text;
  v_hot_buyers integer;
  v_value_pct numeric;
BEGIN
  SELECT m.mandate_value, m.last_activity_at, m.pipeline_stage::text
    INTO v_value, v_last_act, v_stage
  FROM equity_brain.mandates m WHERE m.id = p_mandate_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  SELECT COALESCE(MAX(match_score), 0) INTO v_max_match
  FROM equity_brain.matches
  WHERE is_current = true
    AND status NOT IN ('rejected','closed','dropped')
    AND cnpj IN (SELECT cnpj FROM equity_brain.companies WHERE mandate_id = p_mandate_id);
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
    WHEN 'nbo' THEN 15
    WHEN 'spa' THEN 13
    WHEN 'closing' THEN 11
    WHEN 'due_diligence' THEN 9
    WHEN 'match' THEN 7
    ELSE 0
  END;

  SELECT COUNT(*) INTO v_hot_buyers
  FROM equity_brain.matches mt
  JOIN equity_brain.contacts c ON c.entity_id = mt.buyer_id AND c.entity_type = 'buyer'
  WHERE mt.is_current = true
    AND mt.cnpj IN (SELECT cnpj FROM equity_brain.companies WHERE mandate_id = p_mandate_id)
    AND c.temperature = 'hot';
  v_score := v_score + LEAST(10, v_hot_buyers * 3);

  RETURN GREATEST(0, LEAST(100, ROUND(v_score)::integer));
END;
$$;

-- 5) Recalc em lote
CREATE OR REPLACE FUNCTION equity_brain.refresh_mandate_priorities(p_limit integer DEFAULT 500)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = equity_brain, public
AS $$
DECLARE v_count integer := 0; r record;
BEGIN
  FOR r IN
    SELECT id FROM equity_brain.mandates
    WHERE pipeline_stage <> 'closed'
    ORDER BY COALESCE(last_activity_at, created_at) DESC
    LIMIT p_limit
  LOOP
    UPDATE equity_brain.mandates
    SET priority_score = equity_brain.compute_mandate_priority(r.id)
    WHERE id = r.id;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- 6) Trigger de last_activity_at
CREATE OR REPLACE FUNCTION equity_brain.tg_bump_mandate_last_activity()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.entity_type = 'mandate' THEN
    UPDATE equity_brain.mandates
    SET last_activity_at = NEW.created_at,
        last_outreach_at = CASE
          WHEN NEW.kind IN ('whatsapp','call','email','meeting') AND NEW.direction = 'out'
          THEN NEW.created_at ELSE last_outreach_at
        END
    WHERE id = NEW.entity_id;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_bump_mandate_activity ON equity_brain.crm_activities;
CREATE TRIGGER trg_bump_mandate_activity
  AFTER INSERT ON equity_brain.crm_activities
  FOR EACH ROW EXECUTE FUNCTION equity_brain.tg_bump_mandate_last_activity();

-- 7) RPC: cards do dia
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
    JOIN equity_brain.mandates m ON m.id = c.mandate_id
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

-- 8) Dismiss
CREATE OR REPLACE FUNCTION public.eb_dismiss_today_card(
  p_card_kind text, p_ref_id uuid, p_reason text DEFAULT NULL, p_snooze_days integer DEFAULT 7
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = equity_brain, public
AS $$
DECLARE v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  INSERT INTO equity_brain.today_card_dismissals(user_id, card_kind, ref_id, reason, resurface_at)
  VALUES (auth.uid(), p_card_kind, p_ref_id, p_reason, now() + make_interval(days => GREATEST(1, p_snooze_days)))
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

GRANT EXECUTE ON FUNCTION public.eb_dismiss_today_card(text, uuid, text, integer) TO authenticated;

-- 9) Log WhatsApp send
CREATE OR REPLACE FUNCTION public.eb_log_whatsapp_send(
  p_mandate_id uuid, p_contact_id uuid, p_message_preview text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = equity_brain, public
AS $$
DECLARE v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  INSERT INTO equity_brain.crm_activities (
    entity_type, entity_id, contact_id, kind, direction, body, metadata, created_by
  ) VALUES (
    'mandate', p_mandate_id, p_contact_id, 'whatsapp', 'out',
    LEFT(COALESCE(p_message_preview, ''), 280),
    jsonb_build_object('source','today_bridge_v1','tracked_at', now()),
    auth.uid()
  ) RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

GRANT EXECUTE ON FUNCTION public.eb_log_whatsapp_send(uuid, uuid, text) TO authenticated;
