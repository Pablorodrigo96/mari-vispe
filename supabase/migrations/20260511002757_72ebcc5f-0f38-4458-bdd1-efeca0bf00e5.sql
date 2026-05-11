CREATE OR REPLACE FUNCTION public.bootstrap_cron_secrets_internal(
  _service_role_key text,
  _anon_key text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public, pg_temp
AS $$
BEGIN
  INSERT INTO private.cron_secrets(name, value, updated_at)
  VALUES ('service_role_key', _service_role_key, now())
  ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

  INSERT INTO private.cron_secrets(name, value, updated_at)
  VALUES ('anon_key', _anon_key, now())
  ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.bootstrap_cron_secrets_internal(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_cron_secrets_internal(text, text) TO service_role;