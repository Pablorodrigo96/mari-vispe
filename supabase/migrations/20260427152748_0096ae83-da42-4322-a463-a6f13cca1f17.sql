-- Força reload do schema cache
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
-- E também via comentário (gatilho conhecido para alguns setups)
COMMENT ON SCHEMA equity_brain IS 'Equity Brain — motor de matching M&A v1+v2';