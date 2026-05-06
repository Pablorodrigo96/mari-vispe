
-- Funnel últimos 30 dias
create or replace view public.v_analytics_funnel as
with last30 as (
  select * from public.analytics_events where created_at >= now() - interval '30 days'
),
sess as (
  select session_key, max(coalesce(duration_ms,0)) as max_dur, count(*) filter (where event_type='page_view') as pv
  from last30 group by session_key
)
select
  (select count(*) from sess) as sessions,
  (select count(*) from sess where pv > 0) as sessions_with_pv,
  (select count(*) from sess where max_dur >= 30000) as sessions_over_30s,
  (select count(*) from last30 where event_type='signup') as signups,
  (select count(*) from last30 where event_type='lead') as leads;

-- Dispositivos
create or replace view public.v_analytics_devices as
select coalesce(nullif(device,''),'desconhecido') as device, count(*) as sessions
from public.analytics_sessions
where last_seen_at >= now() - interval '30 days'
group by 1 order by 2 desc;

-- Browsers
create or replace view public.v_analytics_browsers as
select
  case
    when user_agent ilike '%edg/%' then 'Edge'
    when user_agent ilike '%chrome/%' and user_agent not ilike '%edg/%' then 'Chrome'
    when user_agent ilike '%safari/%' and user_agent not ilike '%chrome/%' then 'Safari'
    when user_agent ilike '%firefox/%' then 'Firefox'
    when user_agent is null or user_agent='' then 'desconhecido'
    else 'outros'
  end as browser,
  count(*) as sessions
from public.analytics_sessions
where last_seen_at >= now() - interval '30 days'
group by 1 order by 2 desc;

-- Heatmap dia-da-semana × hora (30d)
create or replace view public.v_analytics_hourly_heatmap as
select
  extract(dow from created_at)::int as dow,
  extract(hour from created_at)::int as hour,
  count(*) as events
from public.analytics_events
where created_at >= now() - interval '30 days'
group by 1,2;

-- Páginas de saída (último evento de cada sessão por path) últimos 30d
create or replace view public.v_analytics_exit_pages as
with ranked as (
  select session_key, path, created_at,
         row_number() over (partition by session_key order by created_at desc) as rn
  from public.analytics_events
  where created_at >= now() - interval '30 days' and path is not null
)
select path, count(*) as exits
from ranked where rn=1
group by path order by exits desc;

-- CTAs
create or replace view public.v_analytics_cta as
select
  coalesce(metadata->>'cta', metadata->>'name', 'sem rótulo') as cta,
  count(*) as clicks,
  count(distinct session_key) as unique_sessions
from public.analytics_events
where event_type='cta_click' and created_at >= now() - interval '30 days'
group by 1 order by clicks desc
limit 30;

-- Retenção D1/D7 baseada em signups e visitas posteriores
create or replace view public.v_analytics_retention as
with signups as (
  select user_id, min(created_at) as signup_at
  from public.analytics_events
  where event_type='signup' and user_id is not null
    and created_at >= now() - interval '60 days'
  group by user_id
),
returns as (
  select s.user_id,
         bool_or(e.created_at::date = (s.signup_at::date + 1)) as d1,
         bool_or(e.created_at::date = (s.signup_at::date + 7)) as d7
  from signups s
  left join public.analytics_events e
    on e.user_id = s.user_id and e.created_at > s.signup_at
  group by s.user_id
)
select
  count(*) as cohort,
  round(100.0 * count(*) filter (where d1) / nullif(count(*),0), 1) as d1_pct,
  round(100.0 * count(*) filter (where d7) / nullif(count(*),0), 1) as d7_pct
from returns;

-- Lock down to admins via RLS-equivalent grants (views inherit base RLS but we add explicit revoke/grant)
revoke all on public.v_analytics_funnel from anon, authenticated;
revoke all on public.v_analytics_devices from anon, authenticated;
revoke all on public.v_analytics_browsers from anon, authenticated;
revoke all on public.v_analytics_hourly_heatmap from anon, authenticated;
revoke all on public.v_analytics_exit_pages from anon, authenticated;
revoke all on public.v_analytics_cta from anon, authenticated;
revoke all on public.v_analytics_retention from anon, authenticated;
grant select on public.v_analytics_funnel, public.v_analytics_devices, public.v_analytics_browsers,
  public.v_analytics_hourly_heatmap, public.v_analytics_exit_pages, public.v_analytics_cta,
  public.v_analytics_retention to authenticated;
