
# Fase 3/4 — Dashboards Profissionais (Bloomberg-grade)

## Estado atual (já existe)
- `src/pages/dashboards/DashboardExecutivoPage|MandatoPage|MatchPage|NboPage.tsx` montados em `/equity-brain/dashboard/*`.
- Componentes base: `DashShell`, `DashKpi` (já tem count-up + sparkline + trend opcional), `DashCharts` (Donut/Bar/StackedBar/Line/Area com tooltip dark, paleta semântica), `AIInsightCard`.
- KPIs hoje vêm de RPCs `get_dashboard_*` + leitura de `eb_v_mandates_full` (limit 2000).
- Schema Fase 1+2: `equity_brain.mandates` com `deal_type`, `deal_phase`, `deal_kind`, `outcome`, `status`, `valor_operacao`, `faturamento_vispe`, `exclusividade`, `regiao`, `uf`, `responsavel_id`, `data_assinatura`, `data_fechamento`, `data_inicio`, `created_at`. `mari_ops.health_check` ativo.

## O que falta (gap vs spec Fase 3)
1. Rotas top-level `/dashboard/*` (hoje só sob `/equity-brain/dashboard/*`).
2. Grupo "📊 Dashboards" no `AppSidebar`.
3. Materialized views + cron horário + função de refresh (substituem agregação client-side).
4. Filtros (período, executivo, região, estado) propagados via context.
5. Layouts ampliados (L1–L8) com cards financeiros separados, sparklines em todos os KPIs principais, charts adicionais (status stacked, evolução trimestral, BDR/Closer, success fee, projeção mandatos a vencer, etc.).
6. Export CSV por dashboard.
7. Edge function `generate-dashboard-insight` (Lovable AI Gateway, gemini-2.5-flash) com cache 1h em tabela.
8. Tokens CSS e fonte Geist Mono carregada.

## Entregáveis

### 3.1 — CSS tokens + fonte
`src/index.css`: adicionar variáveis `--carbon-*`, `--graphite-border`, `--volt-glow`, `--status-*`, `--text-*`, classes utilitárias `.dashboard-page`, `.dashboard-card`, `.kpi-display`, `.kpi-label`, `.live-indicator` + keyframes `pulse`. Importar Geist Mono via Google Fonts/CDN no `index.html` (`<link href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@200..600&display=swap">`).
Ajustar `tailwind.config.ts` para adicionar `fontFamily.mono: ["Geist Mono", "JetBrains Mono", "monospace"]`.

### 3.2 — Migration `2026050X_dashboard_views.sql`
Cria as 4 materialized views (`mv_dashboard_executivo|mandato|match|nbo`) **derivadas de `equity_brain.mandates`**, cada uma com índice único `((1))` para permitir `REFRESH CONCURRENTLY`. Cria `public.refresh_dashboard_views()` SECURITY DEFINER que faz refresh das 4 e loga em `mari_ops.health_check`. Agenda `cron.schedule('refresh-dashboards-hourly','0 * * * *', ...)`. Concede `GRANT SELECT` para `authenticated` apenas via wrapper de RPC `get_dashboard_*` (mantém compat com hooks atuais — RPC passa a `SELECT * FROM mv_dashboard_*`).

Tabela auxiliar `public.dashboard_insight_cache (dashboard_type text PK, snapshot_hash text, body text, generated_at timestamptz)` para cache do insight da Mari.

### 3.3 — Componentes compartilhados
Criar `src/components/dashboards/`:
- `DashboardFiltersContext.tsx` — context + hook `useDashboardFilters()` com `{ periodo, executivos[], regioes[], ufs[], setX }`.
- `DashboardFilters.tsx` — barra com dropdown período (30d / 90d / Ano / Tudo / Custom), multi-select executivo (lista de `profiles` com role advisor/admin via `useEffectiveRoles`), região, estado, botões "Limpar" e "Exportar".
- `ExportButton.tsx` — converte snapshot atual em CSV via `csvExport.ts`.
- Ampliar `DashKpi` para sempre receber `spark` (último 12m) e `trend` (vs trimestre anterior); adicionar `LiveIndicator` no canto sup. direito de cada card (ponto verde pulsante).
- `DashCharts.tsx`: ajustar Donut para `innerRadius=60 outerRadius=80` fixos (donut fino), hover com setor +4px e demais opacity 0.3 (custom `activeShape`); barras com paleta semântica volt/cyan/secondary; áreas com gradient stop em volt/cyan e opacity 0.08.

### 3.4 — Reescrever as 4 páginas

Wrapper comum: `<DashboardFiltersProvider>` → `<DashShell filters={<DashboardFilters/>} onExport={...}>`. Hooks `useQuery` consomem RPCs/views + aplicam filtros via params. Refetch a cada 60s (já existe).

**Executivo (`/dashboard/executivo`)**: 8 linhas conforme spec — 6 KPIs L1, 3 cards financeiros L2, 2 charts L3 (Status stacked Buyside vs Sellside + Evolução anual area), 3 donuts L4 (tipo/fase sellside/região), L5 estado horizontal full-width, L6 (Valor anual + Comissão anual area), L7 (Top 3 + Por responsável), L8 AI Insight.

**Mandato (`/dashboard/mandato`)**: 4 KPIs L1, 2 charts L2 (assinados area + cancelados stacked VENCIDO/SOZINHO), L3 evolução trimestral full, L4 (equity por status + comissão por status), L5 3 donuts (status/exclusividade/região), L6 estado full, L7 (BDR stacked + Closer stacked), L8 timeline mandatos a vencer.

**Match (`/dashboard/match`)**: 5 KPIs L1, 2 line charts L2 (fechados + cancelados), 3 donuts L3, L4 estado full.

**NBO (`/dashboard/nbo`)**: 5 KPIs operacionais L1, 4 KPIs financeiros L2, 2 lines L3, L4 estado full, L5 (valor trimestre + valor anual), L6 (success fee trimestre + anual), L7 (donut qty exec + bar valor exec).

### 3.5 — Edge function `generate-dashboard-insight`
`supabase/functions/generate-dashboard-insight/index.ts`. Input `{ dashboard_type, snapshot_data }`. Faz hash SHA-1 do snapshot, lê cache em `dashboard_insight_cache` (TTL 1h); se miss, chama Lovable AI Gateway (`gemini-2.5-flash`, prompt da spec, máx 80 palavras pt-BR), upserta cache e loga em `mari_ops.health_check`. Trata 402/429. CORS headers padrão. `verify_jwt` default.
Hook `useDashboardInsight(type, snapshot)` consumido pelo `AIInsightCard` no Executivo (e opcional nos demais).

### 3.6 — Navegação
`src/components/layout/AppSidebar.tsx`: novo grupo "📊 Dashboards" (acima de Equity Brain) com 4 itens (`/dashboard/executivo|mandato|match|nbo`). Usar `NavLink` + ícone (BarChart3, FileSignature, Handshake, FileText).
`src/App.tsx`: registrar 4 rotas top-level dentro do grupo `<AppShell>` autenticado, mantendo aliases existentes em `/equity-brain/dashboard/*` por compatibilidade (mesmo componente).

### 3.7 — Critérios de aceite (validação final)
- Background `#0A0A0A`, cards border 1px `#2A2A2A`, sem shadow.
- KPIs em Geist Mono, count-up 800ms, sparkline visível nos principais, trend vs trimestre anterior.
- Volt restrito a destaques (top performer, indicadores).
- Materialized views refrescam de hora em hora (verificar `mari_ops.health_check`).
- Filtros propagam via context e refetcham todos os charts da página.
- Botão "Exportar" gera CSV do snapshot atual.
- AI Insight aparece no Executivo, cache de 1h.
- Sidebar mostra grupo "Dashboards" com rota ativa destacada.
- Render OK em 768px+.

## Arquivos tocados

Criados:
- `supabase/migrations/2026050X_dashboard_views.sql`
- `supabase/functions/generate-dashboard-insight/index.ts`
- `src/components/dashboards/DashboardFiltersContext.tsx`
- `src/components/dashboards/DashboardFilters.tsx`
- `src/components/dashboards/ExportButton.tsx`
- `src/hooks/useDashboardInsight.ts`

Editados:
- `src/index.css` (tokens + classes)
- `index.html` (Geist Mono)
- `tailwind.config.ts` (font mono)
- `src/components/dashboards/DashKpi.tsx` (LiveIndicator + sparkline obrigatório)
- `src/components/dashboards/DashCharts.tsx` (donut fino + hover + paleta semântica)
- `src/pages/dashboards/Dashboard{Executivo,Mandato,Match,Nbo}Page.tsx` (layouts L1–L8 completos)
- `src/components/layout/AppSidebar.tsx` (grupo Dashboards)
- `src/App.tsx` (rotas `/dashboard/*` top-level)
- `.lovable/plan.md` (registro Fase 3)

## Notas técnicas
- RPCs existentes (`get_dashboard_*`) serão reescritas para `SELECT row_to_json(mv) FROM mv_dashboard_*` — mantém assinatura, hooks atuais não quebram.
- Filtros aplicados sobre `eb_v_mandates_full` (não sobre MV) para preservar agilidade dos KPIs principais (MV) + interatividade dos breakdowns.
- AI Insight nunca bloqueia render: `Suspense`/`loading` no card, fallback texto neutro.
- Sem alteração em edge functions existentes (calculate-scores, match-company-v2, mari-brain, claude-*).
- Toda nova edge function registra em `mari_ops.health_check` no início e fim.

**Após implementação, paro e aguardo OK para Fase 4.**
