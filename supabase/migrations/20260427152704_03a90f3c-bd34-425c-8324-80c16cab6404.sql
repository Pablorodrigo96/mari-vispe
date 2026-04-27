-- Expõe o schema equity_brain via PostgREST (necessário para .schema('equity_brain') no SDK)
ALTER ROLE authenticator SET pgrst.db_schemas = 'public, graphql_public, equity_brain';
NOTIFY pgrst, 'reload config';

-- Garante que as roles do PostgREST possam usar o schema (RLS continua aplicada)
GRANT USAGE ON SCHEMA equity_brain TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA equity_brain TO authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA equity_brain TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA equity_brain GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA equity_brain GRANT SELECT ON TABLES TO anon;