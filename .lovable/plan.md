

## Plano: Adicionar Diagnóstico ao PDF do Valuation

Incluir uma terceira página no PDF gerado pelo `handleDownloadPDF` com os dados do diagnóstico (True Value, degradação por item, e lead score) quando o usuário já tiver completado o diagnóstico.

### Arquivo a modificar

**`src/components/valuation/ValuationReportDialog.tsx`**

Dentro de `handleDownloadPDF()`, após a página 2 (breakdown + gap de equity), adicionar condicionalmente uma terceira página se `diagnosticAnswers` existir:

1. **Header da página**: "DIAGNÓSTICO DE VALOR — True Value"
2. **Bloco dos 3 valores**: boxes lado a lado com Valor Estimado, True Value (vermelho), e Valor Potencial (verde)
3. **Degradação total**: percentual total e valor absoluto perdido
4. **Tabela de itens**: 12 linhas com nome do item, categoria, resposta (Sim/Não), e impacto em R$. Itens "Não" destacados em vermelho.
5. **Lead Score**: badge com classificação (Hot/Warm/Cold) e razão
6. **Gap final**: barra visual simplificada mostrando True Value → Potencial com o gap em destaque

A lógica usa `calculateTrueValue(result, diagnosticAnswers)` e `calculateTrueValueLossMetrics(result, degradation)` já existentes no `diagnosticCalculator.ts`.

Nenhum arquivo novo. Nenhuma migração.

