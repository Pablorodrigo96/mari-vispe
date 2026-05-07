
ALTER TABLE public.analytics_sessions
  ADD COLUMN IF NOT EXISTS visitor_id text,
  ADD COLUMN IF NOT EXISTS is_new_visitor boolean;

ALTER TABLE public.analytics_events
  ADD COLUMN IF NOT EXISTS visitor_id text;

CREATE INDEX IF NOT EXISTS idx_analytics_sessions_visitor_id ON public.analytics_sessions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_visitor_id ON public.analytics_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events(created_at);

-- View: visitantes por dia (novos vs recorrentes)
CREATE OR REPLACE VIEW public.v_analytics_visitors_daily
WITH (security_invoker = on) AS
SELECT
  date_trunc('day', s.first_seen_at)::date AS day,
  count(DISTINCT s.visitor_id) FILTER (WHERE s.is_new_visitor IS TRUE)::int AS new_visitors,
  count(DISTINCT s.visitor_id) FILTER (WHERE s.is_new_visitor IS FALSE)::int AS returning_visitors,
  count(DISTINCT s.visitor_id)::int AS total_visitors,
  count(DISTINCT s.session_key)::int AS sessions,
  count(DISTINCT s.user_id) FILTER (WHERE s.user_id IS NOT NULL)::int AS authenticated_visitors
FROM public.analytics_sessions s
WHERE s.first_seen_at >= now() - interval '90 days'
  AND s.visitor_id IS NOT NULL
GROUP BY 1
ORDER BY 1;

-- View: origem do tráfego splittada por tipo de visitante
CREATE OR REPLACE VIEW public.v_analytics_sources_split
WITH (security_invoker = on) AS
WITH src AS (
  SELECT
    s.visitor_id,
    s.session_key,
    s.user_id,
    s.is_new_visitor,
    COALESCE(NULLIF(s.utm_source, ''),
             CASE WHEN s.referrer IS NULL OR s.referrer = '' THEN '(direto)'
                  ELSE regexp_replace(s.referrer, '^https?://([^/]+).*$', '\1')
             END) AS source,
    s.utm_medium,
    s.utm_campaign
  FROM public.analytics_sessions s
  WHERE s.first_seen_at >= now() - interval '30 days'
    AND s.visitor_id IS NOT NULL
)
SELECT
  src.source,
  count(DISTINCT src.visitor_id) FILTER (WHERE src.is_new_visitor IS TRUE)::int AS new_visitors,
  count(DISTINCT src.visitor_id) FILTER (WHERE src.is_new_visitor IS FALSE)::int AS returning_visitors,
  count(DISTINCT src.session_key) FILTER (WHERE src.is_new_visitor IS TRUE)::int AS sessions_new,
  count(DISTINCT src.session_key) FILTER (WHERE src.is_new_visitor IS FALSE)::int AS sessions_returning,
  count(DISTINCT src.user_id) FILTER (WHERE src.user_id IS NOT NULL)::int AS authenticated_visitors,
  (
    SELECT count(*)::int FROM public.analytics_events e
    WHERE e.event_type = 'signup'
      AND e.visitor_id IN (SELECT visitor_id FROM src s2 WHERE s2.source = src.source AND s2.is_new_visitor IS TRUE)
      AND e.created_at >= now() - interval '30 days'
  ) AS signups_new,
  (
    SELECT count(*)::int FROM public.analytics_events e
    WHERE e.event_type = 'lead'
      AND e.visitor_id IN (SELECT visitor_id FROM src s2 WHERE s2.source = src.source AND s2.is_new_visitor IS TRUE)
      AND e.created_at >= now() - interval '30 days'
  ) AS leads_new
FROM src
GROUP BY src.source
ORDER BY (count(DISTINCT src.visitor_id)) DESC;

-- View: resumo new vs returning para 7/30/90 dias
CREATE OR REPLACE VIEW public.v_analytics_new_vs_returning
WITH (security_invoker = on) AS
SELECT
  win.window_days,
  count(DISTINCT s.visitor_id) FILTER (WHERE s.is_new_visitor IS TRUE)::int AS new_visitors,
  count(DISTINCT s.visitor_id) FILTER (WHERE s.is_new_visitor IS FALSE)::int AS returning_visitors,
  count(DISTINCT s.visitor_id)::int AS total_visitors
FROM (VALUES (7), (30), (90)) AS win(window_days)
LEFT JOIN public.analytics_sessions s
  ON s.first_seen_at >= now() - (win.window_days || ' days')::interval
  AND s.visitor_id IS NOT NULL
GROUP BY win.window_days
ORDER BY win.window_days;

-- View: conversão de visitantes novos (anônimo -> logado / signup / lead)
CREATE OR REPLACE VIEW public.v_analytics_new_visitor_conversion
WITH (security_invoker = on) AS
WITH novos AS (
  SELECT DISTINCT visitor_id
  FROM public.analytics_sessions
  WHERE is_new_visitor IS TRUE
    AND first_seen_at >= now() - interval '30 days'
    AND visitor_id IS NOT NULL
)
SELECT
  (SELECT count(*) FROM novos)::int AS new_visitors,
  (SELECT count(DISTINCT s.visitor_id)
     FROM public.analytics_sessions s
    WHERE s.visitor_id IN (SELECT visitor_id FROM novos)
      AND s.user_id IS NOT NULL)::int AS became_authenticated,
  (SELECT count(DISTINCT e.visitor_id)
     FROM public.analytics_events e
    WHERE e.event_type = 'signup'
      AND e.visitor_id IN (SELECT visitor_id FROM novos))::int AS signups,
  (SELECT count(DISTINCT e.visitor_id)
     FROM public.analytics_events e
    WHERE e.event_type = 'lead'
      AND e.visitor_id IN (SELECT visitor_id FROM novos))::int AS leads;

REVOKE ALL ON public.v_analytics_visitors_daily FROM anon, authenticated;
REVOKE ALL ON public.v_analytics_sources_split FROM anon, authenticated;
REVOKE ALL ON public.v_analytics_new_vs_returning FROM anon, authenticated;
REVOKE ALL ON public.v_analytics_new_visitor_conversion FROM anon, authenticated;

GRANT SELECT ON public.v_analytics_visitors_daily,
  public.v_analytics_sources_split,
  public.v_analytics_new_vs_returning,
  public.v_analytics_new_visitor_conversion
  TO authenticated;
