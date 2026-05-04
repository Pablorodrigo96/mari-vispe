---
name: Painel Executive Report
description: /painel hero como relatório executivo M&A (Valor Hoje · Estimado · Potencial 2027 · 4 pilares ROI · Compradores anônimos) — coerente com o relatório de Valuation
type: feature
---

`/painel` exibe ExecutiveReport acima do CockpitWeekStrip quando o user tem valuation salvo.

## Fonte única de números (coerência com /valuation)

`src/lib/painelExecutive.ts` (`buildSnapshot`) usa as **mesmas fórmulas** de `src/lib/diagnosticCalculator.ts` (importa `VISPE_APPRECIATION_FACTOR = 1.78`). Nada de heurística própria.

Modelo de 3 valores (igual ao relatório):
- **valorEstimado** = `result.mashupValue` (ou `enterpriseValue` no DCF). Cálculo neutro de mercado.
- **valorAtual (True Value)** = `lossMetrics.trueValue` se houver diagnóstico salvo; senão = valorEstimado. Equivale a Estimado × (1 − totalDegradation).
- **valorPotencial 2027** = `lossMetrics.potentialValue` se houver; senão = Estimado × 1,78. **NUNCA** mais usar fallback ×1,5.
- **gap / gapPct** = sempre derivados (Potencial − Atual). Não recalcular por outro caminho.
- `hasDiagnostic` indica se o usuário já respondeu o questionário (lossMetrics persistido via edge `update-valuation-metrics` chamada pelo `ValuationNarrativeReport`).

## UI (`src/components/painel/exec/ExecutiveReport.tsx`)

Card "Quanto vale hoje":
- Label muda pra "True Value" quando `hasDiagnostic`, senão "Estimado".
- Subtexto mostra Estimado de mercado e % de degradação aplicada.

Card "Quanto pode valer (2027)" exibe `Estimado × 1,78` no IC pra deixar a fonte explícita.

Quando o usuário ainda não respondeu o diagnóstico, o parágrafo de explicação convida a responder no Valuation.

## Demais zonas (intactas)
1. Tri-card valuation (acima)
2. Sector trend chart (recharts AreaChart) + Timeline 3 colunas (Agora 2026 · Ideal 2027 · Depois 2028) com marker "VOCÊ ESTÁ AQUI"
3. **4 pilares** (Máquina Vendas, Controladoria, M&A, Crescimento) — `getPillars()` distribui o gap em 27/31/22/20%
4. **Compradores anônimos** (count aleatório 3-14 via useMemo, distribuição fixa 60/30/10) → modal LGPD com CTA WhatsApp advisor

Sem valuation → `NoValuationCTA` simples linkando `/valuation/multiplos`.

Mantém intactos: CockpitWeekStrip, KPIs, módulos 2x2, onboarding, atividade recente, boxes contextuais (advisor/franqueado/EB/admin).
