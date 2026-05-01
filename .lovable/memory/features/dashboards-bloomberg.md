---
name: Dashboards Bloomberg-grade
description: 4 dashboards (Executivo, Mandato, Match, NBO) consumindo MVs de equity_brain via RPCs get_dashboard_*, refresh horário em mari_ops, AI Insight cacheado 1h, rotas top-level /dashboard/* + grupo no AppSidebar.
type: feature
---
- Pages: `src/pages/dashboards/Dashboard{Executivo,Mandato,Match,Nbo}Page.tsx`
- Componentes: `DashShell`, `DashKpi` (count-up + sparkline), `DashCharts` (Donut/Bar/StackedBar/Line/Area paleta semântica), `AIInsightCard`, `DashboardFilters` (período/região), `DashboardFiltersContext`.
- Backend: 4 MVs em `equity_brain.mv_dashboard_*` (já existiam) + `public.refresh_dashboard_views()` SECURITY DEFINER + cron `refresh-dashboards-hourly` (`0 * * * *`) + tabela `public.dashboard_insight_cache` (TTL 1h, RLS read authenticated).
- Edge function: `generate-dashboard-insight` (Lovable AI, gemini-2.5-flash, hash SHA-1 do snapshot, log em `mari_ops.health_check`, trata 402/429).
- Hook: `useDashboardInsight(type, snapshot)` consumido pelo Executivo.
- Rotas: top-level `/dashboard/{executivo,mandato,match,nbo}` (RequireRole admin/advisor) + aliases `/equity-brain/dashboard/*` mantidos.
- Sidebar: grupo `📊 Dashboards` (admin/advisor) acima de Cockpit Interno.
- Tokens CSS: `--carbon-*`, `--volt-glow`, `--status-*`, classes `.dashboard-page/.dashboard-card/.kpi-display/.kpi-label/.live-indicator` em `index.css`. Geist Mono carregado em `index.html` e priorizado em `tailwind.config.ts` (`fontFamily.mono`).
