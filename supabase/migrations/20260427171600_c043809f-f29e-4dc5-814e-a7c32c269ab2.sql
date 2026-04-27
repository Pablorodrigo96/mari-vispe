
CREATE TABLE IF NOT EXISTS equity_brain.engine_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engine text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  duration_ms integer,
  rows_processed integer DEFAULT 0,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','success','error')),
  error_message text,
  triggered_by text DEFAULT 'cron',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_engine_runs_engine_started
  ON equity_brain.engine_runs (engine, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_engine_runs_status
  ON equity_brain.engine_runs (status, started_at DESC);

ALTER TABLE equity_brain.engine_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view engine runs"
  ON equity_brain.engine_runs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Service role bypassa RLS automaticamente, então não precisa policy de insert/update.
GRANT SELECT ON equity_brain.engine_runs TO authenticated;
GRANT ALL ON equity_brain.engine_runs TO service_role;
