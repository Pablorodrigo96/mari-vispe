CREATE UNIQUE INDEX IF NOT EXISTS entity_notes_daily_unique
  ON equity_brain.entity_notes (author_id, entity_id)
  WHERE entity_type = 'daily';