-- Bloco 1: extensões
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Bloco 2: schema isolado
CREATE SCHEMA IF NOT EXISTS equity_brain;

GRANT USAGE ON SCHEMA equity_brain TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA equity_brain
  GRANT SELECT ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA equity_brain
  GRANT ALL ON TABLES TO service_role;