CREATE OR REPLACE FUNCTION public.eb_store_advisor_token(p_advisor_id UUID, p_token TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_secret_id UUID;
  v_name TEXT := 'advisor_wa_token_' || p_advisor_id::text;
  v_caller_role TEXT := auth.role();
BEGIN
  -- Allow service_role (edge functions) OR admin users
  IF v_caller_role <> 'service_role'
     AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  DELETE FROM vault.secrets WHERE name = v_name;
  v_secret_id := vault.create_secret(p_token, v_name,
    'WhatsApp Cloud API token for advisor ' || p_advisor_id::text);
  RETURN v_secret_id;
END;
$$;