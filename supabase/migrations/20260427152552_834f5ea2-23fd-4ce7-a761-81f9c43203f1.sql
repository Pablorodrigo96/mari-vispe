-- 1) Substituir CHECK textual por validação numérica (0..1) ou NULL
ALTER TABLE equity_brain.matches DROP CONSTRAINT IF EXISTS matches_data_confidence_check;
-- Garante coluna numérica
ALTER TABLE equity_brain.matches
  ALTER COLUMN data_confidence TYPE NUMERIC USING NULLIF(data_confidence::text,'')::numeric;
ALTER TABLE equity_brain.matches
  ADD CONSTRAINT matches_data_confidence_range_check
  CHECK (data_confidence IS NULL OR (data_confidence >= 0 AND data_confidence <= 1));

-- 2) Remover FK rígida de thesis_key (v2 usa archetype_id como thesis_key)
ALTER TABLE equity_brain.matches DROP CONSTRAINT IF EXISTS matches_thesis_key_fkey;

-- 3) Índice para queries shadow vs current
CREATE INDEX IF NOT EXISTS idx_matches_engine_current
  ON equity_brain.matches (engine_version, is_current, cnpj);

CREATE INDEX IF NOT EXISTS idx_matches_v2_score
  ON equity_brain.matches (engine_version, match_score DESC) WHERE is_current = true;