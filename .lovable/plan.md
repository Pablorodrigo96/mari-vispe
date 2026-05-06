## Objetivo

Painel admin de analytics próprio (sem GA), monitorando visitas, usuários, crescimento, leads, sessões, páginas mais vistas e tempo de permanência. Dados ficam no próprio Supabase (sem dependência externa).

## Arquitetura

```text
[browser]
  ├─ usePageTracking (route change + unload/visibilitychange)
  └─ POST /track-event ──► analytics_events (insert anon-allowed)
                            │
                            └──► views/RPCs admin-only
                                   │
                                   └──► /admin/analytics (gráficos)
```

## 1. Schema (migração)

**`analytics_sessions`**
- `id uuid PK`
- `session_key text unique` (uuid local, gerado no cliente, persistido em sessionStorage)
- `user_id uuid null`
- `first_seen_at timestamptz default now()`
- `last_seen_at timestamptz`
- `referrer text`, `utm_source/medium/campaign text`
- `device text` (mobile/desktop), `user_agent text`
- `country text null`

**`analytics_events`**
- `id uuid PK`
- `session_key text` (FK lógica)
- `user_id uuid null`
- `event_type text` (`page_view` | `page_leave` | `signup` | `lead` | `cta_click`)
- `path text`, `title text`, `referrer text`
- `duration_ms int null` (preenchido só em `page_leave`)
- `metadata jsonb`
- `created_at timestamptz default now()`
- Índices: `(created_at desc)`, `(path)`, `(session_key)`, `(user_id)`

**RLS**
- INSERT: anyone (anon + authenticated). É append-only.
- SELECT: apenas `has_role(auth.uid(),'admin')`.

**Views admin (security_invoker)**
- `v_analytics_daily` — dia, page_views, sessions, unique_users, signups, leads (90 dias)
- `v_analytics_top_pages` — path, views, avg_duration_ms, unique_sessions (últimos 30 dias)
- `v_analytics_traffic_sources` — utm_source/referrer-host, sessões, signups
- `v_analytics_user_growth` — cumulativo de profiles por dia

Todas as views protegidas via RLS na fonte (admin-only).

## 2. Tracking client

**`src/lib/analytics.ts`**
- `getSessionKey()` — gera/lê `analytics_session_key` em `sessionStorage`.
- `trackEvent(type, payload)` — fire-and-forget via `supabase.functions.invoke('track-event', {body})`. Usa `navigator.sendBeacon` no `page_leave`.
- Captura UTM da URL na primeira visita.

**`src/hooks/usePageTracking.tsx`**
- Escuta `useLocation()` no React Router.
- Em cada mudança: registra `page_view` e arma cronômetro.
- No `visibilitychange` (hidden) e `beforeunload`: dispara `page_leave` com `duration_ms`.
- Respeita cookie consent existente (`useCookieConsent`) — se `analytics` desabilitado, não emite.

**Integração**: chamar `usePageTracking()` dentro do `<App>` (após `BrowserRouter`).

## 3. Edge function `track-event`

`supabase/functions/track-event/index.ts`
- `verify_jwt = false` (precisa aceitar anon).
- Valida payload com Zod (event_type whitelisted, path < 500 chars).
- Faz upsert em `analytics_sessions` (`session_key` unique → atualiza `last_seen_at`, `user_id` quando logado).
- Insere em `analytics_events`.
- Rate limit simples por `session_key` (mem em memória + tabela `rate_limits` já existente, fallback no-op).

Hooks adicionais (server-side):
- Trigger em `auth.users` ou em `profiles` (insert) → cria evento `signup` em `analytics_events` (via trigger SQL com SECURITY DEFINER).
- Trigger em `interest_logs` / `capital_requests` (insert) → evento `lead`.

## 4. Admin Page `/admin/analytics`

`src/pages/admin/AdminAnalytics.tsx` — abas no estilo dos outros admin pages.

**KPIs topo (4 cards)**
- Visitantes únicos hoje / 7d / 30d
- Page views totais hoje / 7d / 30d
- Novos usuários 7d / 30d (de `profiles`)
- Novos leads 7d / 30d (`interest_logs` + `capital_requests`)

**Gráficos (recharts já no projeto)**
- AreaChart **Crescimento** — usuários cumulativos × dia (90d)
- LineChart **Atividade diária** — page_views, sessions, signups (90d)
- BarChart **Top 15 páginas** — views + tempo médio
- BarChart **Fontes de tráfego** — utm_source/referrer × sessões
- Tabela **Sessões longas** — top 20 sessões por duração total (path inicial, user, duração)

**Filtros**: range (7/30/90 dias), dispositivo (mobile/desktop), autenticado vs anon.

Adicionar entry "Analytics" no `AdminDashboard` e rota em `App.tsx` (`/admin/analytics`).

## 5. Hook de dados admin

`src/hooks/useAdminAnalytics.ts` — react-query consultando as views diretamente (admin-only via RLS). Cache 60s.

## Notas

- Sem cookies de terceiros — só `sessionStorage`. Compatível com banner LGPD existente.
- Append-only protege contra inflação de dados maliciosa via clientes (RLS bloqueia DELETE/UPDATE para todos exceto admin).
- `metadata jsonb` permite expandir depois (cliques em CTA específico, scroll depth, etc).
- Performance: índice em `created_at desc` cobre quase todas as queries do dashboard.