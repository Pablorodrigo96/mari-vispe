
CREATE OR REPLACE FUNCTION public.refresh_dashboard_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, equity_brain, mari_ops
AS $$
DECLARE
  t_start timestamptz := clock_timestamp();
BEGIN
  REFRESH MATERIALIZED VIEW equity_brain.mv_dashboard_executivo;
  REFRESH MATERIALIZED VIEW equity_brain.mv_dashboard_mandato;
  REFRESH MATERIALIZED VIEW equity_brain.mv_dashboard_match;
  REFRESH MATERIALIZED VIEW equity_brain.mv_dashboard_nbo;

  BEGIN
    INSERT INTO mari_ops.health_check (function_name, status, payload_summary)
    VALUES (
      'refresh_dashboard_views',
      'success',
      'all 4 dashboard MVs refreshed in ' ||
        round(EXTRACT(EPOCH FROM (clock_timestamp() - t_start))::numeric, 3) || 's'
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_dashboard_views() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_dashboard_views() TO authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh-dashboards-hourly') THEN
      PERFORM cron.unschedule('refresh-dashboards-hourly');
    END IF;
    PERFORM cron.schedule(
      'refresh-dashboards-hourly',
      '0 * * * *',
      $cron$ SELECT public.refresh_dashboard_views(); $cron$
    );
  END IF;
END $$;

SELECT public.refresh_dashboard_views();

CREATE TABLE IF NOT EXISTS public.dashboard_insight_cache (
  dashboard_type text PRIMARY KEY,
  snapshot_hash  text NOT NULL,
  body           text NOT NULL,
  generated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dashboard_insight_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read dashboard insights" ON public.dashboard_insight_cache;
CREATE POLICY "Authenticated can read dashboard insights"
  ON public.dashboard_insight_cache
  FOR SELECT
  TO authenticated
  USING (true);
