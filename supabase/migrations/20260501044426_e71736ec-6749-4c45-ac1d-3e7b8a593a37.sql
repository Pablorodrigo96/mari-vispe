-- ============================================================
-- Etapa 1: WhatsApp Action Log + integração com deal_events
-- ============================================================

-- 1) Novas colunas em mandates: last_contact_at + next_action_suggested_at
ALTER TABLE equity_brain.mandates
  ADD COLUMN IF NOT EXISTS last_contact_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_action_suggested_at timestamptz;

COMMENT ON COLUMN equity_brain.mandates.last_contact_at IS
  'Last outbound WhatsApp action confirmed by advisor (clicked ✅ Mandei).';
COMMENT ON COLUMN equity_brain.mandates.next_action_suggested_at IS
  'Next time the advisor should reach out, set by whatsapp_action_log triggers.';

-- 2) Tabela whatsapp_action_log
CREATE TABLE IF NOT EXISTS equity_brain.whatsapp_action_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES equity_brain.contacts(id) ON DELETE SET NULL,
  mandate_id uuid REFERENCES equity_brain.mandates(id) ON DELETE SET NULL,
  buyer_id uuid REFERENCES equity_brain.buyers(id) ON DELETE SET NULL,
  match_id uuid REFERENCES equity_brain.matches(id) ON DELETE SET NULL,
  draft_type text NOT NULL CHECK (draft_type IN (
    'first_contact','followup','valuation_send','meeting_request','match_announcement','generic'
  )),
  draft_text_generated text NOT NULL,
  draft_text_sent text,
  suggested_action_label text,
  phone_number text NOT NULL,
  source text DEFAULT 'mandate_detail',
  opened_at timestamptz NOT NULL DEFAULT now(),
  marked_action text CHECK (marked_action IN ('sent','not_sent','snoozed')),
  marked_at timestamptz,
  snooze_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wal_advisor ON equity_brain.whatsapp_action_log(advisor_id, opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_wal_mandate ON equity_brain.whatsapp_action_log(mandate_id) WHERE mandate_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wal_buyer ON equity_brain.whatsapp_action_log(buyer_id) WHERE buyer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wal_match ON equity_brain.whatsapp_action_log(match_id) WHERE match_id IS NOT NULL;

-- 3) RLS
ALTER TABLE equity_brain.whatsapp_action_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wal_advisor_own ON equity_brain.whatsapp_action_log;
CREATE POLICY wal_advisor_own ON equity_brain.whatsapp_action_log
  FOR ALL TO authenticated
  USING (advisor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (advisor_id = auth.uid());

-- 4) RPCs públicas (PostgREST não expõe schema custom — exposição via public)

-- 4a) Insere uma entrada de log quando o advisor abre o WhatsApp
CREATE OR REPLACE FUNCTION public.eb_open_whatsapp_action(
  p_draft_type text,
  p_draft_text_generated text,
  p_phone_number text,
  p_contact_id uuid DEFAULT NULL,
  p_mandate_id uuid DEFAULT NULL,
  p_buyer_id uuid DEFAULT NULL,
  p_match_id uuid DEFAULT NULL,
  p_suggested_action_label text DEFAULT NULL,
  p_source text DEFAULT 'mandate_detail'
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, equity_brain
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;
  INSERT INTO equity_brain.whatsapp_action_log(
    advisor_id, contact_id, mandate_id, buyer_id, match_id,
    draft_type, draft_text_generated, suggested_action_label,
    phone_number, source
  ) VALUES (
    auth.uid(), p_contact_id, p_mandate_id, p_buyer_id, p_match_id,
    COALESCE(p_draft_type,'generic'), COALESCE(p_draft_text_generated,''), p_suggested_action_label,
    p_phone_number, COALESCE(p_source,'mandate_detail')
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.eb_open_whatsapp_action(text,text,text,uuid,uuid,uuid,uuid,text,text) TO authenticated;

-- 4b) Marca o resultado da ação (sent / not_sent / snoozed)
CREATE OR REPLACE FUNCTION public.eb_mark_whatsapp_action(
  p_log_id uuid,
  p_marked_action text,
  p_draft_text_sent text DEFAULT NULL,
  p_snooze_hours int DEFAULT 24
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, equity_brain
AS $$
DECLARE
  v_log equity_brain.whatsapp_action_log%ROWTYPE;
  v_next timestamptz;
  v_event_type text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;

  SELECT * INTO v_log FROM equity_brain.whatsapp_action_log
   WHERE id = p_log_id
     AND (advisor_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
  IF NOT FOUND THEN
    RAISE EXCEPTION 'log not found or forbidden';
  END IF;

  IF p_marked_action NOT IN ('sent','not_sent','snoozed') THEN
    RAISE EXCEPTION 'invalid marked_action: %', p_marked_action;
  END IF;

  UPDATE equity_brain.whatsapp_action_log
     SET marked_action = p_marked_action,
         marked_at = now(),
         draft_text_sent = COALESCE(p_draft_text_sent, draft_text_sent),
         snooze_until = CASE WHEN p_marked_action='snoozed'
                             THEN now() + make_interval(hours => COALESCE(p_snooze_hours,24))
                             ELSE snooze_until END
   WHERE id = p_log_id;

  IF p_marked_action = 'sent' AND v_log.mandate_id IS NOT NULL THEN
    -- bump mandate timestamps
    -- next action suggested = +3d para followup, +7d para outros
    v_next := now() + CASE v_log.draft_type
                        WHEN 'followup' THEN interval '3 days'
                        WHEN 'meeting_request' THEN interval '2 days'
                        WHEN 'valuation_send' THEN interval '5 days'
                        ELSE interval '7 days'
                      END;
    UPDATE equity_brain.mandates
       SET last_contact_at = now(),
           last_outreach_at = now(),
           last_activity_at = now(),
           next_action_suggested_at = v_next
     WHERE id = v_log.mandate_id;
  END IF;

  IF p_marked_action = 'sent' THEN
    -- emit deal_event
    v_event_type := 'whatsapp_outbound';
    INSERT INTO equity_brain.deal_events(
      match_id, buyer_id, event_type, event_ts, bdr_user_id, notes, metadata
    ) VALUES (
      v_log.match_id,
      v_log.buyer_id,
      v_event_type,
      now(),
      auth.uid(),
      LEFT(COALESCE(p_draft_text_sent, v_log.draft_text_generated), 500),
      jsonb_build_object(
        'log_id', v_log.id,
        'draft_type', v_log.draft_type,
        'phone_number', v_log.phone_number,
        'mandate_id', v_log.mandate_id,
        'contact_id', v_log.contact_id,
        'edited', (p_draft_text_sent IS NOT NULL AND p_draft_text_sent <> v_log.draft_text_generated)
      )
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.eb_mark_whatsapp_action(uuid,text,text,int) TO authenticated;