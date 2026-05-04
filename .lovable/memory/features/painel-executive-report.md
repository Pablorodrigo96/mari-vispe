---
name: Painel Executive Report
description: /painel hero como relatório executivo M&A (Quanto vale · Quanto pode valer · Timing 2027 · 4 pilares ROI · Compradores anônimos)
type: feature
---

`/painel` exibe ExecutiveReport acima do CockpitWeekStrip quando o user tem valuation salvo.

Fonte de dados:
- `valuation_history` (último registro do user, ordenado desc) → `buildSnapshot()` em `src/lib/painelExecutive.ts`
- Suporta `multiples` (mashupValue + lossMetrics.potentialValue do diagnóstico) e `dcf` (enterpriseValue/valueLow/valueHigh)
- Potencial 2027 = `lossMetrics.potentialValue` se houver, senão `valor × 1.5`
- `sector_market_trends` (segment, ano 2022-2028, num_deals, volume_m, tendencia) — pico em 2027 para todos os setores; "Outros" usado como fallback

4 zonas em `src/components/painel/exec/ExecutiveReport.tsx`:
1. **Tri-card Valuation**: Hoje (muted) · Potencial 2027 (accent volt) · Delta (emerald)
2. **Sector trend chart** (recharts AreaChart) + Timeline 3 colunas (Agora 2026 · Ideal 2027 · Depois 2028) com marker "VOCÊ ESTÁ AQUI"
3. **4 pilares** (Máquina Vendas, Controladoria, M&A, Crescimento) — `getPillars()` distribui o gap em 27/31/22/20% como retorno; ROI calculado por card
4. **Compradores anônimos** (count aleatório 3-14 via useMemo, distribuição fixa 60/30/10) → modal LGPD com CTA WhatsApp advisor

Sem valuation → `NoValuationCTA` simples linkando `/valuation/multiplos`.

Mantém intactos: CockpitWeekStrip, KPIs, módulos 2x2, onboarding, atividade recente, boxes contextuais (advisor/franqueado/EB/admin).
