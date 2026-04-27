-- 1) drain_jobs table for fire-and-forget bulk drain tracking
CREATE TABLE IF NOT EXISTS equity_brain.drain_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  totals jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  triggered_by uuid
);

-- Expose minimal access via SECURITY DEFINER reads
CREATE OR REPLACE FUNCTION public.eb_get_drain_job(p_job_id uuid)
RETURNS TABLE(id uuid, started_at timestamptz, finished_at timestamptz, status text, totals jsonb, error_message text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, equity_brain
AS $$
  SELECT id, started_at, finished_at, status, totals, error_message
  FROM equity_brain.drain_jobs
  WHERE id = p_job_id
    AND public.has_role(auth.uid(), 'admin'::app_role);
$$;

-- 2) stats function for the EventQueueHealthCard
CREATE OR REPLACE FUNCTION public.eb_event_queue_stats()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, equity_brain
AS $$
DECLARE
  v_unprocessed bigint;
  v_errors bigint;
  v_by_type jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT COUNT(*) INTO v_unprocessed FROM equity_brain.events WHERE processed_at IS NULL;
  SELECT COUNT(*) INTO v_errors FROM equity_brain.events WHERE processed_status = 'error';

  SELECT COALESCE(jsonb_agg(jsonb_build_object('event_type', event_type, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
  INTO v_by_type
  FROM (
    SELECT event_type, COUNT(*) AS cnt
    FROM equity_brain.events
    WHERE processed_at IS NULL
    GROUP BY event_type
  ) t;

  RETURN jsonb_build_object(
    'unprocessed', v_unprocessed,
    'errors', v_errors,
    'by_type', v_by_type
  );
END;
$$;

-- 3) RPC to fetch latest dropped errors (replaces direct table reads)
CREATE OR REPLACE FUNCTION public.eb_event_recent_errors(p_limit int DEFAULT 20)
RETURNS TABLE(id bigint, event_type text, entity_type text, entity_id text, retry_count int, error_message text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, equity_brain
AS $$
  SELECT id, event_type, entity_type, entity_id::text, retry_count, error_message, created_at
  FROM equity_brain.events
  WHERE processed_status = 'error'
    AND public.has_role(auth.uid(), 'admin'::app_role)
  ORDER BY created_at DESC
  LIMIT GREATEST(1, LEAST(p_limit, 200));
$$;

GRANT EXECUTE ON FUNCTION public.eb_event_queue_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.eb_event_recent_errors(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eb_get_drain_job(uuid) TO authenticated;