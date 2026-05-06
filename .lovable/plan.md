# Analytics Admin – Navegação, Séries Temporais e Opt-out

## 1. Item "Analytics" no sidebar admin

**Arquivo:** `src/components/admin/AdminSidebar.tsx`

- Importar ícone `LineChart` (já existe em outras telas).
- Adicionar entrada no array `menuItems`, logo abaixo de **Dashboard**:
  ```ts
  { name: 'Analytics', href: '/admin/analytics', icon: LineChart },
  ```
- Nada mais muda — a rota `/admin/analytics` já existe e o highlight de ativo é por `location.pathname`.

## 2. Séries temporais 7d/30d em `/admin/analytics`

**Objetivo:** trocar os blocos hoje estáticos por gráficos com toggle de janela (7d / 30d / 90d) cobrindo:

- **Crescimento de usuários** (cumulativo) — AreaChart, fonte `v_analytics_user_growth`.
- **Atividade diária** — LineChart com 3 séries: page views, sessões únicas, usuários ativos. Fonte `v_analytics_daily`.
- **Page views por dia** — BarChart simples (mesma fonte, série única) para destaque visual.
- **Leads por dia** — BarChart, derivado de `analytics_events` filtrando `event_type = 'lead'` agrupado por `date_trunc('day', created_at)`.

**Implementação:**

- `src/hooks/useAdminAnalytics.ts`: adicionar parâmetro `range: 7 | 30 | 90` (default 30) e nova query `useLeadsTimeseries(range)` que faz `select created_at from analytics_events where event_type='lead' and created_at >= now() - interval`.
- `src/pages/admin/AdminAnalytics.tsx`:
  - Header com `<ToggleGroup>` (shadcn) `7d | 30d | 90d` controlando estado local `range`.
  - Cada gráfico passa a receber `range`. Layout: grid 2 colunas (lg) / 1 coluna (mobile) com os 4 gráficos descritos.
  - Manter os 4 KPIs (já existentes) no topo, agora também respondendo ao `range` ativo.
  - Recharts já está no projeto (usado nos dashboards EB). Estilo dark consistente: grid `#27272a`, eixos `#71717a`, séries em `#D9F564` (Volt), `#10b981` (emerald), `#3b82f6`.

## 3. Opt-out LGPD para visitantes não logados

**Comportamento desejado:** respeitar o cookie consent atual e oferecer toggle explícito de "rastreamento analítico".

**Plano:**

- Estender `useCookieConsent` (já existente) com categoria `analytics` (boolean, default `false` até consentimento explícito — LGPD opt-in).
- `src/lib/analytics.ts`: no início de `trackEvent`/`startSession`, ler `localStorage` (`cookie_consent_v1`); se `analytics !== true`, retornar sem chamar a edge function.
- `src/hooks/usePageTracking.tsx`: idem — antes de despachar `page_view`/`page_leave` checar consent.
- `CookieConsentBanner` e `CookiePreferencesModal`: adicionar checkbox **"Análises de uso (anônimas)"** com texto curto explicando que ajuda a melhorar a plataforma e pode ser desativado a qualquer momento.
- Navegador respeitando `navigator.doNotTrack === '1'`: forçar opt-out automático mesmo se o usuário não interagiu com o banner.
- Usuários autenticados: mantemos rastreamento ligado por padrão (já cobertos pelos Termos), mas adicionar toggle em `/perfil` ("Privacidade · análises de uso") que grava em `profiles.analytics_opt_out` (nova coluna `boolean default false`) — checado pelo `analytics.ts`.

**Migração:** `alter table profiles add column analytics_opt_out boolean not null default false;`

## Detalhes técnicos

- Sem novas tabelas além da coluna em `profiles`.
- Toggle de range mantido em `useState` (não persistir).
- Queries continuam server-side com RLS admin (`has_role(auth.uid(),'admin')`) — performance aceitável até dezenas de milhares de eventos; se virar problema, criar índice `analytics_events(created_at, event_type)`.
- Nada quebra o fluxo existente: tracker simplesmente vira no-op quando consent ausente.

## Entregáveis

1. `AdminSidebar.tsx` com item Analytics.
2. `AdminAnalytics.tsx` + `useAdminAnalytics.ts` com range toggle e 4 séries temporais.
3. `analytics.ts` + `usePageTracking.tsx` com gate de consent + DNT.
4. `CookieConsentBanner` / `CookiePreferencesModal` com categoria analytics.
5. Migração `profiles.analytics_opt_out` + toggle em `/perfil`.