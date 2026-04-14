

## Plano: Relatório Narrativo de Impacto Financeiro (Máquina de Conversão)

Construir um componente narrativo de 9 blocos que transforma o resultado do valuation em uma jornada emocional de conversão: sonho, choque, gap, perda real, urgência e CTA.

---

### Arquivos a Criar

**1. `src/lib/valuationCalculator.ts` — Adicionar `calculateLossMetrics()`**
- Calcula perda mensal e anual usando dois métodos (ineficiência 3% + gap/36 meses)
- Retorna `monthlyLoss`, `annualLoss`, `recoverTimeMonths`, `gapValue`, `gapPercent`, etc.
- Adiciona interface `LossMetrics` e tipo `LeadScore`
- Adiciona lógica de lead scoring: hot/warm/cold baseado em gapValue e faturamento mensal

**2. `src/components/valuation/ValuationNarrativeReport.tsx` — Componente principal (novo)**
- 9 blocos sequenciais com staggered fade-in via framer-motion (já instalado)
- Bloco 1 (Sonho): card verde com potentialValue em destaque
- Bloco 2 (Choque): card âmbar com currentValue
- Bloco 3 (Gap): card laranja com barra de progresso visual
- Bloco 4 (Virada): texto centralizado dramático, sem card
- Bloco 5 (Perda Real): card vermelho com monthlyLoss e annualLoss em destaque enorme
- Bloco 6 (Consequências): card cinza com 3 itens de alerta
- Bloco 7 (Causa): card azul com 5 pills dos pilares do gap
- Bloco 8 (Urgência): card escuro com contador animado (IntersectionObserver + useEffect incrementando de 0 até monthlyLoss)
- Bloco 9 (CTA): card verde com dois botões — "Fazer Diagnóstico" e "Falar com especialista" (WhatsApp)
- Responsivo mobile-first, valores monetários com destaque visual claro

**3. `src/lib/formatters.ts` — Helper `formatCurrencyCompact()`**
- Já existe `formatCurrency` no projeto; usar a existente que já faz "R$ X mi" / "R$ X mil"
- Confirmar que atende os requisitos; se necessário, ajustar

---

### Arquivos a Modificar

**4. `src/components/valuation/ValuationReportDialog.tsx`**
- Após a seção "Disclaimer" e antes do CTA WhatsApp final, adicionar um botão:
  "Ver Análise Completa de Impacto"
- Esse botão abre um novo Dialog/Drawer full-width com o `ValuationNarrativeReport`
- Ao abrir, calcular e salvar `lossMetrics` e `leadScore` no JSONB `result` do `valuation_history` via update (usar edge function ou RPC, pois a tabela não permite UPDATE direto pelo cliente)

**5. Migração SQL — Permitir UPDATE do campo `result` na `valuation_history`**
- Adicionar RLS policy para UPDATE permitindo que o owner atualize apenas o campo `result` do seu próprio registro
- Alternativamente, criar uma edge function `update-valuation-result` que recebe o valuation_id e os lossMetrics, valida ownership via JWT, e faz o update com service_role

---

### Decisão Técnica: Update do valuation_history

Como a tabela `valuation_history` atualmente não permite UPDATE pelo cliente, vou criar uma **edge function** `update-valuation-metrics` que:
- Recebe `{ valuationId, lossMetrics, leadScore, leadScoreReason }`
- Valida JWT e ownership (user_id matches)
- Faz merge no campo JSONB `result` com as novas métricas
- Usa service_role para o update

---

### Resumo de Entregas

| Arquivo | Ação |
|---|---|
| `src/lib/valuationCalculator.ts` | Adicionar `calculateLossMetrics()` + `LeadScore` type |
| `src/components/valuation/ValuationNarrativeReport.tsx` | Criar componente com 9 blocos narrativos |
| `src/components/valuation/ValuationReportDialog.tsx` | Adicionar botão "Análise de Impacto" que abre o narrativo |
| `supabase/functions/update-valuation-metrics/index.ts` | Edge function para salvar lossMetrics no Supabase |
| Migração SQL | RLS policy para UPDATE na `valuation_history` (owner only) |

