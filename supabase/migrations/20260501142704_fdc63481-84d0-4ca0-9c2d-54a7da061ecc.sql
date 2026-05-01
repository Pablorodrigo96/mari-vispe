-- ================================================================
-- Phase 3: WhatsApp messages capture
-- ================================================================

CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id uuid NOT NULL,
  contact_id uuid NULL,
  mandate_id uuid NULL,

  direction text NOT NULL CHECK (direction IN ('inbound','outbound')),
  phone_from text NOT NULL,
  phone_to text NOT NULL,

  message_type text NOT NULL DEFAULT 'text'
    CHECK (message_type IN ('text','image','audio','video','document','sticker','location','interactive','reaction','unknown')),

  content_text text,
  media_url text,
  media_mime_type text,
  media_caption text,

  meta_message_id text UNIQUE,
  meta_message_timestamp timestamptz,

  status text NOT NULL DEFAULT 'received'
    CHECK (status IN ('received','processing','processed','error','sent','delivered','read','failed')),
  sentiment text CHECK (sentiment IN ('positive','neutral','negative','urgent')),
  intent text,
  processing_error text,

  raw_payload jsonb,

  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_wa_msg_advisor          ON public.whatsapp_messages(advisor_id);
CREATE INDEX IF NOT EXISTS idx_wa_msg_contact          ON public.whatsapp_messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_wa_msg_mandate          ON public.whatsapp_messages(mandate_id);
CREATE INDEX IF NOT EXISTS idx_wa_msg_received_at      ON public.whatsapp_messages(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_msg_status_received  ON public.whatsapp_messages(received_at DESC) WHERE status = 'received';

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wa_msg_select_self_or_admin ON public.whatsapp_messages;
CREATE POLICY wa_msg_select_self_or_admin
  ON public.whatsapp_messages
  FOR SELECT
  USING (advisor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Inserts/updates only via service_role from edge functions.
-- (No INSERT/UPDATE/DELETE policies → RLS denies for anon/authenticated.)

-- ----------------------------------------------------------------
-- Trigger 1: touch mandate.last_activity_at
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_whatsapp_msg_touch_mandate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','equity_brain'
AS $$
BEGIN
  IF NEW.mandate_id IS NOT NULL THEN
    UPDATE equity_brain.mandates
       SET last_activity_at = NEW.received_at,
           updated_at       = now()
     WHERE id = NEW.mandate_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tg_whatsapp_msg_touch_mandate ON public.whatsapp_messages;
CREATE TRIGGER tg_whatsapp_msg_touch_mandate
AFTER INSERT ON public.whatsapp_messages
FOR EACH ROW
EXECUTE FUNCTION public.tg_whatsapp_msg_touch_mandate();

-- ----------------------------------------------------------------
-- Trigger 2: mirror message into equity_brain.crm_activities
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_whatsapp_msg_mirror_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','equity_brain'
AS $$
DECLARE
  v_entity_type text;
  v_entity_id   uuid;
  v_body        text;
BEGIN
  IF NEW.mandate_id IS NOT NULL THEN
    v_entity_type := 'mandate';
    v_entity_id   := NEW.mandate_id;
  ELSIF NEW.contact_id IS NOT NULL THEN
    v_entity_type := 'contact';
    v_entity_id   := NEW.contact_id;
  ELSE
    -- nothing to anchor to → skip mirror, message is still in whatsapp_messages
    RETURN NEW;
  END IF;

  v_body := COALESCE(NEW.content_text, NEW.media_caption, '['||NEW.message_type||']');

  BEGIN
    INSERT INTO equity_brain.crm_activities
      (entity_type, entity_id, contact_id, kind, direction, body, metadata, created_by, created_at)
    VALUES
      (v_entity_type::equity_brain.entity_type,
       v_entity_id,
       NEW.contact_id,
       'whatsapp'::equity_brain.activity_kind,
       NEW.direction::equity_brain.activity_direction,
       LEFT(v_body, 2000),
       jsonb_build_object(
         'whatsapp_message_id', NEW.id,
         'meta_message_id', NEW.meta_message_id,
         'message_type', NEW.message_type,
         'media_url', NEW.media_url,
         'media_mime_type', NEW.media_mime_type,
         'phone_from', NEW.phone_from,
         'phone_to', NEW.phone_to
       ),
       NEW.advisor_id,
       NEW.received_at);
  EXCEPTION WHEN others THEN
    -- Don't break the webhook on mirror failure
    RAISE WARNING 'tg_whatsapp_msg_mirror_activity failed: %', SQLERRM;
  END;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tg_whatsapp_msg_mirror_activity ON public.whatsapp_messages;
CREATE TRIGGER tg_whatsapp_msg_mirror_activity
AFTER INSERT ON public.whatsapp_messages
FOR EACH ROW
EXECUTE FUNCTION public.tg_whatsapp_msg_mirror_activity();

-- realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;