---
name: Valuation Diagnostic Degradation
description: True Value diagnostic with 12 degradation items, 3-value model (Estimated/True/Potential), and gap calculation
type: feature
---
O sistema de valuation possui 3 valores distintos:
1. **Valor Estimado** = Mashup Value (cálculo por múltiplos)
2. **Valor Potencial** = Mashup Value × 1.78 (média de valorização Vispe)
3. **Valor Verdadeiro** = Mashup Value × (1 - degradação), calculado via diagnóstico de 12 perguntas

O diagnóstico (`src/lib/diagnosticCalculator.ts`) contém 12 itens organizados em 4 categorias (Fiscal, Financeiro, Governança, Operacional). Cada "Não" aplica penalidade de 3-8%. Degradação máxima: ~59%.

Fluxo: Relatório → "Diagnóstico de Valor" → Questionário 12 perguntas → Narrativa com True Value revelado.

O componente `ValuationDiagnostic.tsx` coleta respostas e `ValuationNarrativeReport.tsx` exibe os 9 blocos narrativos com os 3 valores.

Edge function `update-valuation-metrics` salva `diagnosticAnswers`, `lossMetrics` e `leadScore` no JSONB `result` da `valuation_history`.
