## O problema, em linguagem simples

Hoje a plataforma mostra **três números diferentes da mesma empresa em dois lugares**, e eles não conversam. O usuário olha o Valuation e vê uns valores; vai no Painel e vê outros. Isso confunde e quebra a confiança.

A causa é que **cada tela inventa o próprio "valor potencial" e o próprio "valor atual"**, em vez de puxar a mesma fonte. Vou explicar e padronizar.

---

## De onde vem cada número hoje

Existe **uma só base de dados**: a tabela `valuation_history` (cada valuation que o usuário gera é salvo aqui, com inputs e resultado).

Mas a forma de ler esse dado é diferente em cada tela:

### Tela "Valuation / Ver Relatório"
Usa três conceitos:
- **Valor Estimado** = média dos múltiplos (chamado de "mashup")
- **True Value** (Valor Verdadeiro) = Estimado × (1 − degradação respondida no diagnóstico). É **menor** que o estimado.
- **Potencial** = Estimado × **1,78** (fator fixo Vispe)
- **Gap** = Potencial − True Value

### Tela "/painel" (Relatório Executivo)
Usa só dois conceitos, com regra própria:
- **Valor Hoje** = mashup (= Estimado do relatório). **Ignora a degradação / True Value.**
- **Valor Potencial 2027** = se existe `lossMetrics` salvo, usa o `potentialValue` dele; senão, faz **mashup × 1,5** (heurística).
- **Gap** = Potencial − Hoje

### Por que dão diferente
1. "Valor hoje" no painel = Estimado; no relatório, o número que aparece em destaque é o **True Value** (degradado). São coisas diferentes.
2. "Potencial" no relatório usa fator **1,78**; no painel, quando não tem diagnóstico salvo, usa **1,5**. E quando tem diagnóstico, usa a fórmula antiga `lossMetrics.potentialValue`.
3. Resultado: gap e percentual ficam em mundos diferentes.

---

## O plano: uma fonte só, três números coerentes

Vou padronizar em **três conceitos únicos** que aparecem igualzinho em todo lugar:

| Conceito | O que é | Como calculo |
|---|---|---|
| **Valor Hoje (True Value)** | Quanto a empresa vale hoje, considerando os pontos fracos do diagnóstico | Estimado × (1 − degradação). Se o usuário ainda não respondeu o diagnóstico, mostra Estimado puro e avisa "responda o diagnóstico para refinar". |
| **Valor Estimado de Mercado** | Cálculo neutro só pelos múltiplos | mashupValue salvo |
| **Valor Potencial 2027** | Se o usuário se preparar pro pico do setor | Estimado × **1,78** (mesma fórmula do relatório, fator único Vispe) |
| **Gap** | Potencial − Hoje | sempre derivado, nunca recalculado por outro caminho |

### Mudanças concretas

1. **`src/lib/painelExecutive.ts` (`buildSnapshot`)**
   - Ler também `result.degradation` ou recalcular `calculateTrueValue` quando houver respostas do diagnóstico salvas em `inputs.diagnosticAnswers` (ou no payload do resultado).
   - `valorAtual` passa a ser **True Value** (cai pra Estimado se não tem diagnóstico).
   - `valorPotencial` passa a ser **Estimado × 1,78** (mesmo `VISPE_APPRECIATION_FACTOR` do `diagnosticCalculator.ts`). Acaba o fallback ×1,5.
   - `gap` e `gapPct` derivados.
   - Adicionar campo `valorEstimado` no snapshot pra poder mostrar os 3 valores quando útil.

2. **`src/components/painel/exec/ExecutiveReport.tsx`**
   - Card "Quanto vale hoje" mostra **True Value** + tooltip explicando "Valor estimado de mercado: R$ X. Hoje sai por R$ Y por causa de Z pontos do diagnóstico não resolvidos."
   - Card "Quanto pode valer (2027)" usa o mesmo número que aparece no relatório.
   - Quando não tem diagnóstico respondido: mostra Estimado nos dois cards e um aviso "Responda o diagnóstico para ver seu True Value e o gap real" com botão pro Valuation.

3. **Garantia de persistência**
   - Confirmar que o wizard de Múltiplos salva `lossMetrics` e/ou `diagnosticAnswers` dentro de `result` no `valuation_history`. Se hoje só salva quando o usuário abre o relatório completo, ajustar pra salvar junto na conclusão (já está parcialmente — verificar `ValuationNarrativeReport` e `ValuationReportDialog`).

4. **Consistência visual**
   - Mesmos rótulos nas duas telas: **"Valor Hoje"**, **"Valor Estimado"**, **"Valor Potencial 2027"**, **"Gap"**.
   - Mesma formatação (sem abreviar num lugar e expandir no outro).

### O que NÃO muda
- Cálculo dos múltiplos em si.
- Diagnóstico, fator 1,78, e penalidades por item.
- Estrutura do banco (`valuation_history`).
- Pilares, timeline, gráfico setorial e compradores anônimos do painel — continuam.

---

## Detalhe técnico (para quem for ler o código)

- Fonte única: `valuation_history.result` + `valuation_history.inputs`.
- Helpers únicos: `calculateTrueValue()` e constante `VISPE_APPRECIATION_FACTOR` de `src/lib/diagnosticCalculator.ts`. Painel passa a importar de lá em vez de duplicar fórmula.
- `painelExecutive.ts` deixa de ter heurística `× 1,5` e fallback de `lossMetrics`.
- Tipo `ValuationSnapshot` ganha `valorEstimado`, `degradationApplied: boolean`.

Pronto pra aprovar e eu implementar.