# Fase D — Polish, responsividade, motor de insights e docs

Encerra a refatoração do EB com 4 frentes: sidebar responsivo, motor persistente de insights da Mari, documentação operacional e expansão dos smoke tests. Mantém comportamento atual em desktop intocado.

## D.1 — Sidebar EB responsivo

Migrar `EBSidebar.tsx` (hoje `<aside class="w-60">` fixo) para o sistema `shadcn/ui sidebar` que já usamos em `AppSidebar`.

- `EquityBrainLayout.tsx`: envolver com `<SidebarProvider defaultOpen>`, trocar `<EBSidebar/> + <main>` por `<EBSidebar/> + <SidebarInset>`. Adicionar header `lg:hidden` com `<SidebarTrigger/>` e label "mari · Equity Brain".
- `EBSidebar.tsx`: refatorar usando `<Sidebar collapsible="icon">`, `SidebarHeader/Content/Footer`, `SidebarGroup`, `SidebarMenu/Item/Button`. Preservar:
  - Item destacado "Hoje" com flame (`/equity-brain/hoje`)
  - Listas MAIN, DASHBOARDS (collapsible), ADMIN_ITEMS (collapsible, gated por `isAdmin`)
  - Badge `hotCount` em Oportunidades
  - Footer com logo Mari, e-mail do user, "Voltar ao site", "Sair"
- Estado `open` herdado do provider (já persiste em cookie/localStorage internamente).
- Comportamento: desktop ≥1024 aberto; tablet 768–1023 colapsa para ícones; mobile <768 vira sheet via trigger.

## D.2 — Tabela `equity_brain.mari_insights` (migration)

Cria tabela persistente para insights proativos com RLS por advisor, índices de prioridade/dedup, status (`active|dismissed|acted|expired`) e payload de ação. Política SELECT por dono ou admin; UPDATE só pelo dono (para dispensar/marcar acted).

Antes de aplicar, validar nomes reais das tabelas referenciadas (`equity_brain.mandates`, `equity_brain.buyers`) — schema confere com fases anteriores.

## D.3 — Edge function `mari-generate-insights`

Roda diariamente (cron 06:00 BRT) e on-demand. Para cada advisor com mandatos ativos, aplica regras:

- **Urgência**: mandato vence em 30/15/7d; deal sem atividade 7d; WhatsApp inbound não respondido 24h; subtarefa DD vencida; NBO sem decisão 14d.
- **Oportunidade**: 3+ matches novos fit>70% não triados; buyer fechou deal recente; notícia M&A no setor; empresa parada com novo buyer compatível.
- **Risco**: temperature → cold sem ação; buyer com `cautela_flag` em deal; tempo na fase 2× média; valor pedido 3× mercado.
- **Aprendizado** (semanal): tempo médio fechamento setor; múltiplo médio; performance vs meta.

Mensagens humanizadas via Lovable AI (`google/gemini-2.5-flash`). Dedup por `(advisor_id, mandate_id, trigger_rule)` ativos. Loga em `mari_ops.health_check`.

Cron via `pg_cron` + `pg_net`.

## D.4 — Integrar insights no `TodayPage`

Adicionar query a `mari_insights` (ativos, top 7 por prioridade) ao lado dos cards do `eb_today_feed`. Cada card:
- Borda colorida por tipo (urgency=rose, opportunity=emerald, risk=amber, learning=purple)
- Badge de prioridade
- Mensagem + botão de ação (interpreta `action_payload.type`: `whatsapp` abre `openWhatsAppForContact`, `open_deal` abre `DealDrawer`, `open_url` navega)
- Botão "Dispensar" → `update status='dismissed', dismissed_at=now()`

## D.5 — Docs operacionais (PT-BR, foco no usuário)

Criar em `docs/`:
- `GUIA_ADVISOR.md` — fluxo do dia (Hoje → Oportunidades → Pipeline), drawer, registrar interação, Mari ⌘K, tipos de insight.
- `GUIA_ADMIN.md` — imports, dedupe, paridade Monday, mapping advisors, health, atribuição de role via SQL.
- `MUDANCAS_RECENTES.md` — changelog Maio 2026 (reorg menu, drawer, insights, sidebar responsivo, dedupe).

## D.6 — Smoke tests diários

Atualizar/criar `mari_ops.daily_smoke_tests()` cobrindo:
1. Range de mandatos (200–1000)
2. Matches ativos (≥1000)
3. Buyers reais (≥100)
4. Materialized views frescas (<2h)
5. Insights gerados nas últimas 24h (>0)
6. RLS habilitada em `drain_jobs`
7. CNPJs inválidos (não 14 dígitos, exceto `PENDING-`/`VL%`)
8. Resumo final em `mari_ops.health_check`

Já existe cron diário; apenas substituir corpo da função.

## Arquivos

**Novos:**
- `supabase/migrations/<ts>_mari_insights.sql`
- `supabase/migrations/<ts>_smoke_tests_v2.sql`
- `supabase/functions/mari-generate-insights/index.ts` (+ bloco em `supabase/config.toml` se precisar verify_jwt=false)
- `docs/GUIA_ADVISOR.md`, `docs/GUIA_ADMIN.md`, `docs/MUDANCAS_RECENTES.md`

**Editados:**
- `src/components/equity-brain/EBSidebar.tsx` (refator shadcn)
- `src/components/equity-brain/EquityBrainLayout.tsx` (SidebarProvider + Inset + trigger mobile)
- `src/pages/equity-brain/TodayPage.tsx` (cards de insights + dispensar)

## Fora de escopo
- Rebuild de regras de matching
- Push notifications
- Refator de `MandateDetailPage` (Fase C.6 separada)

## Critérios de aceite
- Sidebar EB colapsa em tablet/mobile, hamburger funciona, estado persiste
- Tabela `mari_insights` com RLS; função `mari-generate-insights` deployada e cron agendado
- TodayPage mostra insights coloridos com ações + dispensar
- 3 docs criados em PT-BR
- Smoke tests diários rodando, todos verdes em `health_dashboard`
- Performance Today <1s com 7 cards extras

Posso prosseguir?
