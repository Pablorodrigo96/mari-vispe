

## Plano: Fase 3 — Gap de Equity (Relatório Comparativo)

### Objetivo
Após o cálculo de valuation por múltiplos, adicionar uma seção "Gap de Equity" no relatório (dialog + PDF) que compara o **Valor Atual** com o **Valor Potencial Vispe** — simulando uma melhoria de +5 pontos percentuais na margem EBITDA. Inclui CTA para o franqueado regional.

---

### Como funciona

1. O usuário faz o valuation normalmente (wizard existente)
2. Ao ver o resultado, o relatório agora inclui uma nova seção **"Gap de Equity"**:
   - **Valor Atual**: Mashup Value calculado com os dados informados
   - **Valor Vispe (Potencial)**: Recalcula o valuation simulando margem EBITDA atual + 5pp
   - **Gap**: Diferença em R$ e percentual entre os dois valores
   - **Barra visual** comparativa (atual vs potencial)
3. CTA: "Fale com um franqueado Vispe na sua região" → WhatsApp PME.B3

---

### Mudanças

#### 1. `src/lib/valuationCalculator.ts`
- Nova função `calculateEquityGap(result: ValuationResult, ebitdaBoostPP: number)` que:
  - Pega o resultado atual
  - Recalcula com `ebitdaMargin + ebitdaBoostPP`
  - Retorna `{ currentValue, potentialValue, gapValue, gapPercent, boostedMargin }`

#### 2. `src/components/valuation/ValuationReportDialog.tsx`
- **Nova seção no dialog** (antes do disclaimer): Card "Gap de Equity" com:
  - Duas colunas: "Valor Atual" (cinza) vs "Valor Vispe" (verde/dourado)
  - Seta indicando o gap em R$ e %
  - Texto explicativo: "Se sua empresa melhorar a margem EBITDA em 5pp (de X% para Y%), o valor estimado sobe de R$... para R$..."
  - CTA: Botão "Falar com Franqueado Regional" → WhatsApp
- **Nova seção no PDF** (página 2, após breakdown): Mesma informação do gap com layout tabular

#### 3. Nenhuma migração SQL necessária
- Usa os dados já calculados, apenas faz uma simulação client-side

---

### Seção Técnica

| Arquivo | Ação |
|---|---|
| `src/lib/valuationCalculator.ts` | Adicionar `calculateEquityGap()` |
| `src/components/valuation/ValuationReportDialog.tsx` | Seção visual Gap de Equity no dialog + seção no PDF |

**Fórmula do Gap:**
```text
boostedMargin = ebitdaMargin + 5
boostedEBITDA = revenue × (boostedMargin / 100)
potentialValue = recalcular mashup com novo EBITDA
gap = potentialValue - currentValue
gapPercent = (gap / currentValue) × 100
```

