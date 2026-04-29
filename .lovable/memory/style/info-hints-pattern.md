---
name: Info Hints Pattern
description: Padrão (i) tooltip em todos os indicadores/KPIs/charts do Equity Brain, com texto centralizado em ebTooltips.ts
type: design
---
Toda métrica/KPI/chart/painel exibido no Equity Brain DEVE ter um ícone (i) ao lado do título.

- Componente: `<InfoHint title? what action? />` em `src/components/equity-brain/InfoHint.tsx`
  - Renderiza Info icon + Radix Tooltip
  - Tooltip mostra duas linhas: "O que é:" + "O que fazer:"
- Dicionário centralizado: `src/lib/ebTooltips.ts` (export `EB_TIPS`)
  - Adicione novas entradas aqui em vez de inline
- Wrappers que aceitam `info?: InfoHintProps` (passe automaticamente):
  - `EBStatCard` (Board)
  - `crm/exec/KpiTile` (Dashboard Exec / Match Analytics)
  - `crm/exec/ChartCard` (todos os charts)
  - `crm/KpiHeader` interno `Kpi`
- Para cards/headers customizados, use `<InfoHint {...EB_TIPS.chave} />` inline ao lado do título.

Regra: nunca crie um novo card de métrica sem registrar um tooltip correspondente em `EB_TIPS`.
