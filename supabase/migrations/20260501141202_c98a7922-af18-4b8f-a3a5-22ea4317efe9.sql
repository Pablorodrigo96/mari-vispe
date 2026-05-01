-- 1) Vault extension
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

-- 2) Pending staging table
CREATE TABLE IF NOT EXISTS public.advisor_whatsapp_setup_pending (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  phone_number_id TEXT,
  sms_code_attempt_count INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  status TEXT NOT NULL DEFAULT 'awaiting_sms_confirmation'
    CHECK (status IN ('awaiting_sms_confirmation','confirmed','failed')),
  is_mock BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '15 minutes'),
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_advisor_wa_pending_advisor
  ON public.advisor_whatsapp_setup_pending(advisor_id);

-- 3) Permanent config table
CREATE TABLE IF NOT EXISTS public.advisor_whatsapp_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL UNIQUE,
  phone_number_id TEXT NOT NULL UNIQUE,
  access_token_secret_id UUID NOT NULL,
  verify_token TEXT NOT NULL,
  webhook_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','active','suspended','error')),
  is_mock BOOLEAN NOT NULL DEFAULT true,
  connected_at TIMESTAMPTZ,
  last_message_received_at TIMESTAMPTZ,
  total_messages_captured INT NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_advisor_wa_config_advisor
  ON public.advisor_whatsapp_config(advisor_id);

CREATE TRIGGER trg_advisor_wa_config_updated_at
  BEFORE UPDATE ON public.advisor_whatsapp_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) RLS
ALTER TABLE public.advisor_whatsapp_setup_pending ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_whatsapp_config ENABLE ROW LEVEL SECURITY;

-- Pending: only admins
CREATE POLICY "wa_pending_admin_all"
  ON public.advisor_whatsapp_setup_pending
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Config: advisor sees own; admin sees all
CREATE POLICY "wa_config_select_self_or_admin"
  ON public.advisor_whatsapp_config
  FOR SELECT
  USING (
    advisor_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE POLICY "wa_config_admin_write"
  ON public.advisor_whatsapp_config
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "wa_config_admin_update"
  ON public.advisor_whatsapp_config
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "wa_config_admin_delete"
  ON public.advisor_whatsapp_config
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 5) Vault helpers
CREATE OR REPLACE FUNCTION public.eb_store_advisor_token(p_advisor_id UUID, p_token TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_secret_id UUID;
  v_name TEXT := 'advisor_wa_token_' || p_advisor_id::text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  -- Replace existing secret if any
  DELETE FROM vault.secrets WHERE name = v_name;
  v_secret_id := vault.create_secret(p_token, v_name, 'WhatsApp Cloud API token for advisor ' || p_advisor_id::text);
  RETURN v_secret_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.eb_read_advisor_token(p_secret_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_token TEXT;
BEGIN
  -- Service role only (edge functions). Block anon/authenticated.
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT decrypted_secret INTO v_token
  FROM vault.decrypted_secrets
  WHERE id = p_secret_id;
  RETURN v_token;
END;
$$;

REVOKE ALL ON FUNCTION public.eb_read_advisor_token(UUID) FROM PUBLIC, anon, authenticated;