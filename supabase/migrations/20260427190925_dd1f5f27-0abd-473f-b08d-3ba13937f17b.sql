CREATE TABLE IF NOT EXISTS equity_brain.drift_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  cnpj VARCHAR(14),
  top_n INTEGER NOT NULL DEFAULT 100,
  overlap_pct NUMERIC,
  spearman_corr NUMERIC,
  mean_score_v1 NUMERIC,
  mean_score_v2 NUMERIC,
  std_v1 NUMERIC,
  std_v2 NUMERIC,
  histogram_v1 JSONB,
  histogram_v2 JSONB,
  sample_size INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_drift_snapshots_at ON equity_brain.drift_snapshots(snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_drift_snapshots_cnpj ON equity_brain.drift_snapshots(cnpj) WHERE cnpj IS NOT NULL;

ALTER TABLE equity_brain.drift_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view drift snapshots"
ON equity_brain.drift_snapshots FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage drift snapshots"
ON equity_brain.drift_snapshots FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));