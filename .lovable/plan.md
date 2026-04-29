## Comparativo Monday × mari (Equity Brain)

### ✅ Indicadores que **JÁ TEMOS** na mari

**Dashboard M&A (tela 1, 2 e 5 do Monday):**
- Total de operações, Buyside, Sellside, Em andamento, Concluídas, Canceladas → `Dashboard Executivo` (KPIs linha 1)
- Total das operações (R$), Faturamento Vispe, Ticket médio → linha 2
- Status das operações (barras empilhadas Buyside/Sellside) → ✅
- Operações por região (donut) → ✅
- Operações por estado (barras) → ✅
- Operações por tipo (donut) → ✅
- Top 3 maiores operações realizadas → ✅
- Projetos por responsável (barras empilhadas por status) → ✅

**Vendedores × Compradores (tela 3 e 4 do Monday):**
- Total de mandatos / vigentes / em negociação → `Match Analytics` + KPIs do CRM
- Total de compradores / em negociação / aguardando → ✅
- Match por estado, por região, por setor → ✅
- Status dos mandatos (donut) → parcial — temos donut de outcome
- Status dos compradores (donut) → parcial
- Mandatos com exclusividade (donut Sim/Não) → ✅
- Listagem Vendedores (tabela com UF, região, setor, contato, telefone, email) → ✅ `MandatesTable`
- Listagem Compradores (mesma estrutura) → ✅ `BuyersTable`

---

### ❌ Indicadores **FALTANTES** (existem no Monday, ainda não na mari)

**Dashboard Executivo:**
1. **Evolução anual de novas operações** com **datas intermediárias** (ex.: "jun 24, 2024") — hoje só temos por ano cheio. Precisa eixo X com granularidade mensal/quartil quando relevante.
2. **Fase do Sellside** (donut: Match 83% / SPA 16% / NBO 0,6%) — temos `pipeline_stage`, falta o donut filtrado **só sellside**.
3. **Operações por localidade** (barras com Buyside vs Sellside empilhados por estado) — hoje temos um chart de UF mas **sem split por tipo**.
4. **Valor negociado por ano** (linha temporal R$ por ano, **separado Sellside vs Buyside**) — não existe.
5. **Comissão anual da Vispe / mari** (linha temporal de faturamento por ano, separado por tipo) — não existe.
6. **Tempo médio de venda (meses)** — separado de Tempo médio de compra. Hoje temos só `avg_months_close` agregado.
7. **Tempo médio de compra (meses)** — não existe separadamente.

**Match / Mandatos:**
8. **Status de mandato refinado**: `VENCIDO / VIGENTE / VENDEMOS / EM NEGOCIAÇÃO / VENDEU SOZINHO` — hoje o enum `outcome` só tem `em_andamento/concluido/cancelado`. Falta granularidade do Monday.
9. **Status de comprador refinado**: `Aguardando / Em negociação / Comprou` — hoje usamos só `status` ativo/inativo no buyer.

**Total Compradores e Vendedores:**
10. KPIs grandes "Total mandatos: 249", "Total compradores: 178", "Vigentes", "Em negociação", "Aguardando" — temos parcial; falta o cartão dedicado tipo Monday no header de Match Analytics.

---

## Fase 4.H — Paridade total com Monday

Plano de execução para fechar 100% do gap:

### 4.H.1 — Enum `outcome` enriquecido
Adicionar valores ao enum `equity_brain.deal_outcome`:
- `vigente` (mandato ativo dentro da validade)
- `vencido` (passou `data_vencimento` sem fechar)
- `vendemos` (concluído pela mari) — alias de `concluido`
- `vendeu_sozinho` (cliente vendeu sem a mari)
- `em_negociacao` (subset de em_andamento com proposta na mesa)

Adicionar enum `equity_brain.buyer_engagement_status`:
- `aguardando`, `em_negociacao`, `comprou`, `descartado`

Trigger para auto-classificar `vencido` quando `data_vencimento < now()` e `outcome = 'vigente'`.

### 4.H.2 — Métricas temporais separadas por tipo
Nova RPC `eb_dashboard_kpis_v2` retornando:
- `avg_months_sellside` — média de `data_fechamento - data_inicio` para sellside concluído
- `avg_months_buyside` — idem para buyside
- `valor_por_ano_sellside[]`, `valor_por_ano_buyside[]`
- `comissao_por_ano_sellside[]`, `comissao_por_ano_buyside[]`

### 4.H.3 — Novos cards no Dashboard Executivo
- KPI "Tempo médio de venda" + "Tempo médio de compra" (linha de financeiros)
- ChartCard **"Valor negociado por ano"** (LineChart 2 séries)
- ChartCard **"Comissão anual da mari"** (LineChart 2 séries)
- ChartCard **"Operações por localidade"** (BarChart empilhado UF × tipo)
- ChartCard **"Fase do Sellside"** (DonutChart filtrado deal_type=sellside agrupado por pipeline_stage)
- Evolução anual: granularidade mensal quando ano corrente, anual nos demais

### 4.H.4 — Donuts refinados em Match Analytics
- "Status dos mandatos" (donut com novo enum: Vigente/Vencido/Vendemos/Em negociação/Vendeu sozinho)
- "Status dos compradores" (donut com novo enum buyer_engagement_status)
- KPIs grandes no header: Total mandatos, Vigentes, Em negociação, Total compradores, Aguardando, Tempo médio compra/venda

### 4.H.5 — Atualização de UI para classificar engagement
- `QuickEditPopover` ganha select `outcome` com novos valores
- Ficha do buyer ganha select `engagement_status`
- Migração inicial: backfill `vendemos = concluido`, `vigente = em_andamento`

### Arquivos a criar/editar
- `supabase/migrations/<ts>_outcome_enrichment.sql` — novos enums, trigger, backfill
- `supabase/migrations/<ts>_kpis_v2.sql` — RPC `eb_dashboard_kpis_v2`
- `src/lib/dealFormatters.ts` — labels e cores dos novos enums
- `src/pages/equity-brain/ExecutiveDashboardPage.tsx` — 4 novos charts + 2 KPIs
- `src/pages/equity-brain/MatchAnalyticsPage.tsx` — donuts refinados + KPIs
- `src/components/equity-brain/crm/exec/YearlyMoneyChart.tsx` (novo) — linha temporal R$
- `src/components/equity-brain/crm/exec/StackedLocalityChart.tsx` (novo)
- `src/components/equity-brain/crm/QuickEditPopover.tsx` — select outcome
- `src/components/equity-brain/crm/BuyersTable.tsx` — coluna engagement

### Resultado esperado
Após 4.H, **todos os 5 dashboards do Monday** ficam 100% replicados na mari, com a vantagem de:
- Edição inline (já temos via 4.G)
- Drill-down em cada card → ficha 360
- Real-time (sem refresh manual)
- Match adaptativo (Equity Brain v2) que o Monday não tem
