

## Plano: Diagnóstico de Degradação + Valor Verdadeiro vs Valor Potencial

### Conceito Revisado

Três valores distintos no fluxo:
1. **Valor Estimado** = MASHUP VALUE (cálculo atual, não muda)
2. **Valor Potencial** = MASHUP VALUE × 1.78 (média de valorização Vispe)
3. **Valor Verdadeiro (True Value)** = MASHUP VALUE degradado por respostas do diagnóstico

O **GAP** passa a ser entre True Value e Potencial. O diagnóstico é um questionário de ~12 perguntas sim/não que degrada o valor estimado, revelando o True Value.

---

### Arquivos a Criar

**1. `src/components/valuation/ValuationDiagnostic.tsx` — Questionário de Diagnóstico**
- Componente com ~12 perguntas sim/não, agrupadas por categoria:
  - **Fiscal/Tributário**: Ganho de capital otimizado, planejamento tributário (reforma)
  - **Financeiro**: Controle de EBITDA, endividamento controlado, plano de contas, balanço auditado
  - **Governança**: Área de controladoria, monitoramento contínuo de indicadores, organograma atualizado
  - **Operacional**: Processos documentados, máquina de vendas estruturada, ativo imobilizado registrado
- Cada "não" aplica um fator de degradação (ex: -3% a -8% cada, configurável)
- UI: cards com toggle/switch para cada item, visual clean com ícones por categoria
- Ao final: calcula `degradationFactor` (soma dos penalizadores) e `trueValue = mashupValue * (1 - degradationFactor)`
- Botão "Revelar Valor Verdadeiro" que dispara a narrativa

**2. Atualizar `src/lib/valuationCalculator.ts` — Novos cálculos**
- Nova interface `DiagnosticAnswers` com os ~12 campos booleanos
- Nova interface `DegradationResult` com `trueValue`, `potentialValue`, `totalDegradation`, `itemBreakdown`
- Nova função `calculateTrueValue(result, diagnosticAnswers)`:
  - `potentialValue = mashupValue * 1.78`
  - Cada resposta negativa aplica penalidade configurável
  - `trueValue = mashupValue * (1 - sumOfPenalties)`
  - `gap = potentialValue - trueValue`
- Atualizar `calculateLossMetrics()` para usar trueValue vs potentialValue em vez do antigo equityGap

---

### Arquivos a Modificar

**3. `src/components/valuation/ValuationNarrativeReport.tsx` — Redesign completo**
- Recebe `diagnosticAnswers` além de `result`
- Bloco 1 (Sonho): Valor Potencial = MASHUP × 1.78, com texto "Média de valorização dos clientes Vispe"
- Bloco 2 (Estimado): MASHUP VALUE como "estimativa de mercado"
- Bloco 3 (Diagnóstico): resumo visual das respostas, mostrando cada item que degrada (vermelho = não, verde = sim)
- Bloco 4 (True Value): valor real degradado, com breakdown da degradação
- Bloco 5 (GAP): entre True Value e Potencial, com barra de progresso
- Blocos 6-9: Perda real (recalculada), consequências, urgência e CTA (mantidos mas com valores corretos)

**4. `src/components/valuation/ValuationReportDialog.tsx`**
- O botão "Ver Análise Completa de Impacto" agora abre o Diagnóstico primeiro
- Fluxo: Relatório → clica botão → Diagnóstico (responde perguntas) → Narrativa com True Value

**5. Edge function `update-valuation-metrics`**
- Atualizar para salvar também `diagnosticAnswers` e `trueValue` no JSONB `result`

---

### Tabela de Degradação (valores iniciais configuráveis)

```text
Item                                    | Penalidade se "Não"
----------------------------------------|--------------------
Ganho de capital otimizado              | -5%
Endividamento controlado                | -8%
Controle de EBITDA                      | -7%
Área de controladoria                   | -5%
Monitoramento contínuo de indicadores   | -4%
Plano de contas estruturado             | -4%
Balanço auditado                        | -6%
Planejamento tributário (reforma)       | -5%
Máquina de vendas estruturada           | -5%
Organograma atualizado                  | -3%
Processos documentados                  | -4%
Ativo imobilizado registrado            | -3%
```

Total máximo de degradação: ~59% (True Value mínimo ~41% do MASHUP)

---

### Fluxo do Usuário

```text
Valuation Wizard (3 steps)
  → Relatório (MASHUP VALUE)
    → Botão "Diagnóstico de Valor"
      → Questionário (12 perguntas sim/não)
        → Narrativa com True Value revelado
          → CTA: Consultoria Vispe
```

---

### Resumo de Entregas

| Arquivo | Ação |
|---|---|
| `src/lib/valuationCalculator.ts` | Adicionar `DiagnosticAnswers`, `calculateTrueValue()`, potentialValue = mashup × 1.78 |
| `src/components/valuation/ValuationDiagnostic.tsx` | Criar questionário de 12 itens com degradação |
| `src/components/valuation/ValuationNarrativeReport.tsx` | Redesign: 3 valores, breakdown de degradação, gap correto |
| `src/components/valuation/ValuationReportDialog.tsx` | Fluxo: relatório → diagnóstico → narrativa |
| `supabase/functions/update-valuation-metrics/index.ts` | Salvar diagnosticAnswers + trueValue |

