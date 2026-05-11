-- Schema interno
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO service_role, postgres;

-- Tabela de segredos do cron (separada do vault para simplicidade operacional)
CREATE TABLE IF NOT EXISTS private.cron_secrets (
  name text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE private.cron_secrets ENABLE ROW LEVEL SECURITY;
-- Nenhuma policy: anon/authenticated não acessam. service_role e postgres bypassam RLS.

REVOKE ALL ON private.cron_secrets FROM PUBLIC, anon, authenticated;
GRANT ALL ON private.cron_secrets TO service_role, postgres;

-- Funções helper (SECURITY DEFINER) - retornam string vazia se não houver segredo cadastrado
CREATE OR REPLACE FUNCTION private.get_service_role_key()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = private, pg_temp
AS $$
  SELECT COALESCE((SELECT value FROM private.cron_secrets WHERE name = 'service_role_key'), '')
$$;

CREATE OR REPLACE FUNCTION private.get_anon_key()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = private, pg_temp
AS $$
  SELECT COALESCE((SELECT value FROM private.cron_secrets WHERE name = 'anon_key'), '')
$$;

REVOKE EXECUTE ON FUNCTION private.get_service_role_key() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private.get_anon_key() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.get_service_role_key() TO service_role, postgres;
GRANT EXECUTE ON FUNCTION private.get_anon_key() TO service_role, postgres;