-- Sessions
CREATE TABLE public.analytics_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key text NOT NULL UNIQUE,
  user_id uuid,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  device text,
  user_agent text,
  country text
);

CREATE INDEX idx_analytics_sessions_first_seen ON public.analytics_sessions(first_seen_at DESC);
CREATE INDEX idx_analytics_sessions_user ON public.analytics_sessions(user_id);

-- Events
CREATE TABLE public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key text,
  user_id uuid,
  event_type text NOT NULL,
  path text,
  title text,
  referrer text,
  duration_ms int,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_analytics_events_created ON public.analytics_events(created_at DESC);
CREATE INDEX idx_analytics_events_path ON public.analytics_events(path);
CREATE INDEX idx_analytics_events_type ON public.analytics_events(event_type);
CREATE INDEX idx_analytics_events_session ON public.analytics_events(session_key);
CREATE INDEX idx_analytics_events_user ON public.analytics_events(user_id);

-- RLS
ALTER TABLE public.analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert sessions"
  ON public.analytics_sessions FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Anyone can update own session by key"
  ON public.analytics_sessions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admins view sessions"
  ON public.analytics_sessions FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can insert events"
  ON public.analytics_events FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Admins view events"
  ON public.analytics_events FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger: signup event when profile is created
CREATE OR REPLACE FUNCTION public.tg_analytics_log_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.analytics_events (user_id, event_type, path, metadata)
  VALUES (NEW.user_id, 'signup', '/auth', jsonb_build_object('full_name', NEW.full_name));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS analytics_signup_on_profile ON public.profiles;
CREATE TRIGGER analytics_signup_on_profile
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_analytics_log_signup();

-- Trigger: lead from interest_logs
CREATE OR REPLACE FUNCTION public.tg_analytics_log_interest_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.analytics_events (user_id, event_type, path, metadata)
  VALUES (NEW.user_id, 'lead', '/anuncio',
          jsonb_build_object('source', 'interest_logs', 'listing_id', NEW.listing_id));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS analytics_lead_on_interest ON public.interest_logs;
CREATE TRIGGER analytics_lead_on_interest
  AFTER INSERT ON public.interest_logs
  FOR EACH ROW EXECUTE FUNCTION public.tg_analytics_log_interest_lead();

-- Trigger: lead from capital_requests
CREATE OR REPLACE FUNCTION public.tg_analytics_log_capital_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.analytics_events (user_id, event_type, path, metadata)
  VALUES (NEW.user_id, 'lead', '/captacao',
          jsonb_build_object('source', 'capital_requests', 'amount', NEW.requested_amount));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS analytics_lead_on_capital ON public.capital_requests;
CREATE TRIGGER analytics_lead_on_capital
  AFTER INSERT ON public.capital_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_analytics_log_capital_lead();

-- Views
CREATE OR REPLACE VIEW public.v_analytics_daily
WITH (security_invoker = on) AS
SELECT
  date_trunc('day', created_at)::date AS day,
  count(*) FILTER (WHERE event_type = 'page_view')::int AS page_views,
  count(DISTINCT session_key) FILTER (WHERE event_type = 'page_view')::int AS sessions,
  count(DISTINCT user_id) FILTER (WHERE event_type = 'page_view' AND user_id IS NOT NULL)::int AS unique_users,
  count(*) FILTER (WHERE event_type = 'signup')::int AS signups,
  count(*) FILTER (WHERE event_type = 'lead')::int AS leads
FROM public.analytics_events
WHERE created_at >= now() - interval '90 days'
GROUP BY 1
ORDER BY 1;

CREATE OR REPLACE VIEW public.v_analytics_top_pages
WITH (security_invoker = on) AS
SELECT
  path,
  count(*) FILTER (WHERE event_type = 'page_view')::int AS views,
  count(DISTINCT session_key) FILTER (WHERE event_type = 'page_view')::int AS unique_sessions,
  COALESCE(avg(duration_ms) FILTER (WHERE event_type = 'page_leave'), 0)::int AS avg_duration_ms,
  COALESCE(sum(duration_ms) FILTER (WHERE event_type = 'page_leave'), 0)::bigint AS total_duration_ms
FROM public.analytics_events
WHERE created_at >= now() - interval '30 days' AND path IS NOT NULL
GROUP BY path
ORDER BY views DESC NULLS LAST;

CREATE OR REPLACE VIEW public.v_analytics_traffic_sources
WITH (security_invoker = on) AS
SELECT
  COALESCE(NULLIF(utm_source, ''),
           CASE WHEN referrer IS NULL OR referrer = '' THEN '(direto)'
                ELSE regexp_replace(referrer, '^https?://([^/]+).*$', '\1')
           END) AS source,
  count(*)::int AS sessions,
  count(*) FILTER (WHERE user_id IS NOT NULL)::int AS authenticated_sessions
FROM public.analytics_sessions
WHERE first_seen_at >= now() - interval '30 days'
GROUP BY 1
ORDER BY sessions DESC;

CREATE OR REPLACE VIEW public.v_analytics_user_growth
WITH (security_invoker = on) AS
WITH daily AS (
  SELECT date_trunc('day', created_at)::date AS day, count(*) AS new_users
  FROM public.profiles
  WHERE created_at >= now() - interval '90 days'
  GROUP BY 1
)
SELECT day,
       new_users::int,
       sum(new_users) OVER (ORDER BY day)::int AS cumulative_users
FROM daily
ORDER BY day;