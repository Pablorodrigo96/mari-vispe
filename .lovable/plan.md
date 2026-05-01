## O que vamos entregar

3 movimentos grandes, em ordem:

1. **Reorganizar navegação**: tirar "Dashboard Executivo" de dentro do CRM e colocar no menu "Dashboards". CRM volta a ser CRM (mandatos/buyers/atividades/matches).
2. **"Minhas Empresas" virar cadastro geral em tabela rica**, com colunas operacionais (contato, match, contrato, fechamento, drive, comissão Vispe, etc.) e uma **ficha completa** ao clicar.
3. **4 Dashboards Analíticos novos** (`/dashboard/executivo`, `/dashboard/mandato`, `/dashboard/match`, `/dashboard/nbo`) substituindo o Monday — identidade visual **MARI dark** (Carbon + Volt, monospace, cards minimalistas, sem sombras, com sparklines, AI insights e drill-down).

---

## 1. Navegação (menu lateral)

```text
📊 DASHBOARDS  (novo grupo)
├── Visão consolidada do funil   → /equity-brain  (atual DashboardPage)
├── Visão Executiva M&A          → /dashboard/executivo
├── Mandato                      → /dashboard/mandato
├── Match                        → /dashboard/match
└── NBO                          → /dashboard/nbo

📁 CRM
├── Visão Geral / Mandatos / Buyers / Atividades / Matches IA / Match Analytics
│   (sem mais "Dashboard Executivo")
├── Minhas Empresas (carteira rica)
└── Pipeline / Imports / Exports / Aberturas / Auditoria / Permissões
```

- `EBSidebar.tsx` ganha seção "Dashboards" no topo (logo abaixo de "Hoje").
- `CrmHubPage.tsx`: remover a top-tab `executivo` (e seu conteúdo `ExecutiveDashboardContent`). Mantém Visão Geral, Matches IA, Match Analytics.

---

## 2. Minhas Empresas — cadastro geral em tabela + ficha

**Substitui** `MyCompaniesPage.tsx` por uma tabela densa estilo Linear/Bloomberg, com filtros e busca, mostrando todas as empresas/deals (não só as do usuário; admin vê tudo, advisor vê tudo, franchisee filtra próprios).

Colunas da tabela:
- Empresa (codename ou nome) · Contato (nome) · Match (com quem, link p/ Deal) · Contrato (link/status) · Data fechamento · Tipo (Buy/Sell) · Drive · Estado · Região · Status do projeto · Conclusão · R$ Comissão Vispe · % Vispe · E-mail · Telefone · Observações

Ao clicar numa linha → **Ficha da empresa** (`/equity-brain/crm/empresa/:cnpj`) com 4 abas:
- **Visão geral** (KPIs do deal, contato, endereço)
- **Match & Pipeline** (deal vinculado, etapa, histórico)
- **Documentos** (Drive, contrato, VDR, financeiros — reusa `DocumentsPanel`)
- **Atividades & Notas** (timeline + observações)

Backend: tudo já existe em `equity_brain.mandates` (incluindo `contato_*`, `drive_url`, `contract_url`, `faturamento_vispe`, `comissao_pct`, `regiao`, `uf`, `data_fechamento`, `deal_kind`, `outcome`, `match_buyer_id`). Vamos:
- Criar view `eb_companies_carteira` (join mandates + buyers do match + listings).
- Criar página `EmpresaDetailPage.tsx`.

---

## 3. Os 4 Dashboards (identidade MARI)

### Schema (Fase A — migrations)

Em `equity_brain.mandates`, adicionar:
- `deal_phase` (enum: `match`, `nbo`, `due_diligence`, `spa`, `closing`, `closed`)
- `success_fee_value` numeric (já existe `faturamento_vispe`, vamos consolidar nele)
- `bdr_id` uuid (responsável de origem)
- `closer_id` uuid (responsável de fechamento)

Materialized views (refresh `pg_cron` a cada 1h):
- `mv_dashboard_executivo` · `mv_dashboard_mandato` · `mv_dashboard_match` · `mv_dashboard_nbo`

### Identidade visual (todas as 4 telas)

Aplicar via tokens novos em `tailwind.config.ts` e `index.css`:

```text
bg page    #0A0A0A    card bg     #141414    card hover  #1F1F1F
border     #2A2A2A    text 1ª     #FAFAF7    text 2ª     #A8A8A3
volt       #D9F564    success     #00D27F    danger      #FF3B6B
amber      #FFB800    cyan        #00C2FF    purple      #8B5CF6
font num   Geist Mono / JetBrains Mono       font ui     Inter
```

Componentes reusáveis novos em `src/components/dashboards/`:
- `<DashShell>` (header com `DASHBOARD` uppercase Volt + título 32px + Live indicator pulsante + filtros chip + atalhos `⌘E`/`⌘R`)
- `<KpiCard>` (label 11px uppercase, número 72px mono count-up animado, mini-trend, sparkline)
- `<DashCard>` (border 1px #2A2A2A, hover Volt, sem shadow)
- `<DashDonut>` `<DashLine>` `<DashBar>` `<DashStackedBar>` `<DashArea>` (Recharts customizado conforme regras: donut fino 8px com KPI no centro, linhas 1.5px com gradient, barras top performer Volt + glow, etc.)
- `<AIInsightCard>` (borda Volt + ✨, gerado por edge function `dashboard-insights` usando Mari Brain)
- `<EmptyStateSmart>` `<SkeletonChart>`
- `<DashFilters>` (período · região · estado · executivo · limpar · exportar CSV/PDF)
- `<KbdShortcuts>` (`f`, `1-4`, `e`, `r`)

Microinterações: `framer-motion` para count-up e stagger; `react-hotkeys-hook` para shortcuts; auto-refresh 60s invisível.

### Conteúdo de cada dashboard

Replicar exatamente as linhas listadas no brief para cada um:
- **Executivo** (7 linhas: 6 KPIs + 3 financeiros + status/evolução + 3 donuts + estado + valor/comissão + top 3 / por responsável)
- **Mandato** (8 linhas)
- **Match** (4 linhas)
- **NBO** (7 linhas)

Acesso: admin/advisor → tudo; franchisee → filtro automático pelos próprios deals (via RLS em `responsavel_id`/`origin_advisor_id`).

### Theme toggle

`<ThemeToggle>` no topbar (default dark). Light mode é fallback opcional — paleta principal continua dark-first.

---

## Fases de execução

| Fase | Entrega |
|---|---|
| **A** | Migrations: `deal_phase`, `bdr_id`, `closer_id`, 4 mv + pg_cron |
| **B** | Tokens MARI no Tailwind, fontes Geist/Inter, componentes `Dash*` base |
| **C** | Reorganizar Sidebar + remover tab Executivo do CRM |
| **D** | Dashboard Executivo (`/dashboard/executivo`) |
| **E** | Dashboard Mandato (`/dashboard/mandato`) |
| **F** | Dashboard Match + NBO |
| **G** | Minhas Empresas tabela rica + Ficha da empresa |
| **H** | AI Insight cards (edge function) + drill-down + theme toggle + atalhos + polish |

---

## Detalhes técnicos (apêndice)

- Recharts em todos os gráficos (já no projeto).
- Edge function nova: `dashboard-insights` (Gemini 2.5-flash, cache 1h em `mari_brain_messages` ou tabela nova `dashboard_insights_cache`).
- Drill-down: clicar em segmento de donut/barra atualiza filtros via `useSearchParams` e re-renderiza KPIs com transição.
- Export PDF: `react-to-pdf` para snapshot da página; CSV via `exportCsv.ts` existente.
- Live indicator: `useQuery` com `refetchInterval: 60_000`, mostra "atualizado há Xs" calculado a partir de `dataUpdatedAt`.
- Mobile: grid colapsa para 1-2 colunas em <768px; KPI display reduz para 48px.

---

**Pode aprovar que eu mando bala em sequência (A→H), commitando cada fase.**