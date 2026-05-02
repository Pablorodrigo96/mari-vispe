---
name: Mari Insights Engine + EB Sidebar Responsivo
description: Tabela mari_insights + cron diário + sidebar EB shadcn responsivo (Fase D)
type: feature
---
## Fase D (Mai/2026)

### Sidebar EB responsivo
`EBSidebar` migrada para shadcn `<Sidebar collapsible="icon">` dentro de `<SidebarProvider>` em `EquityBrainLayout`. Header tem `<SidebarTrigger>` para mobile/tablet. Estado persiste via cookie do shadcn. "Hoje" segue como item Volt destacado.

### Mari Insights
- Tabela `equity_brain.mari_insights` (tipos: urgency/opportunity/risk/learning, priority 1-10, status active/dismissed/acted/expired). RLS: advisor vê os próprios; admin vê todos; advisor pode UPDATE (dispensar/agir).
- View `public.mari_insights` para PostgREST.
- Função `equity_brain.generate_mari_insights_for_advisor(uuid)` com 3 regras iniciais (mandate_expiring 30/15/7d, deal_stale_7d, stage_overdue 30d). Função wrapper `generate_mari_insights_all()` com dedup via unique index parcial.
- Edge function `mari-generate-insights` chama o RPC. Cron `mari-insights-daily` 06:00 UTC.
- Componente `<MariInsightsSection/>` no topo de TodayPage com cards coloridos por tipo + botão dispensar + ação (open_deal abre DealDrawer).

### Smoke tests v2
`mari_ops.daily_smoke_tests()` agora cobre: range de mandates, matches ativos, buyers reais, freshness de views, contagem de insights 24h.

### Docs
`docs/GUIA_ADVISOR.md`, `docs/GUIA_ADMIN.md`, `docs/MUDANCAS_RECENTES.md`.
