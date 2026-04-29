
# Tooltips informativos em todos os indicadores

Cada box com número, indicador, sugestão, gráfico ou aviso ganha um ícone **(i)** no canto superior direito. Ao passar o mouse, abre um tooltip com **2 partes**:

1. **O que é** — definição curta da métrica/painel.
2. **O que fazer** — ação prática que o usuário tira dali.

Sem mudanças de layout, sem alterar números nem regras — apenas uma camada de affordance/UX por cima do que já existe.

---

## 1. Componente central reutilizável

Criar `src/components/equity-brain/InfoHint.tsx`:

- Wrapper sobre o `Tooltip` do Radix (já existe em `src/components/ui/tooltip.tsx`).
- Renderiza um `<Info className="h-3.5 w-3.5 text-zinc-500 hover:text-zinc-300" />`.
- Props: `title?`, `what: string`, `action?: string`, `side?`, `align?`.
- Acessível: `aria-label`, suporte a teclado (focus → tooltip aparece).
- Dark, glassmorphism, alinhado à paleta mari (Volt para destaques, fundo zinc-900).

E um `src/lib/ebTooltips.ts` com **dicionário centralizado** de todos os textos (chave → `{title, what, action}`), para garantir consistência e fácil revisão futura.

---

## 2. Refatorar wrappers de card existentes para aceitar `info?`

Em vez de espalhar o `<InfoHint/>` em centenas de lugares, adicionar uma prop opcional `info?: InfoHintProps` em:

- `EBStatCard.tsx` (Board Executivo)
- `crm/exec/KpiTile.tsx` (Dashboard Executivo, Match Analytics)
- `crm/exec/ChartCard.tsx` (todos os gráficos)
- `crm/KpiHeader.tsx` → extrair `Kpi` interno e adicionar `info`
- `crm/PipelineFunnel.tsx`, `TasksWidget.tsx`, `NextActionsPanel.tsx`, `LearningInsightsCard.tsx`, `FinancialPipelinePanel.tsx`, `MatchesPanel.tsx`, `ActivityTimeline.tsx`, `DocumentsPanel.tsx`, `WhatsAppPanel.tsx`, `ConversationSummary.tsx`
- Cards "soltos" (`Fila de eventos`, `Eventos com erro`, `Tier strong` no `BoardPage.tsx`) — receber o `<InfoHint/>` inline.

Quando `info` é passado, o card mostra o (i) ao lado do título; se não, comportamento antigo intacto.

---

## 3. Páginas e componentes que recebem tooltips

### Board Executivo (`BoardPage.tsx`)
- Saúde do motor: Empresas no banco, Signals computados, Scores calculados, Oportunidades quentes, **Fila de eventos**, **Eventos com erro**, Tier strong.
- Funil semanal · 7 dias (no header da seção).
- Top 10 buyers por matches premium (header + colunas Matches/Premium/% premium).
- Versões da fórmula de score.

### CRM Hub (`CrmHubPage.tsx` / `KpiHeader.tsx`)
- Total Operações, Vendedores, Compradores, Em andamento, Concluídas, Canceladas, Carteira (R$), Comissão Vispe.
- "Próximas ações sugeridas pela Mari" (NextActionsPanel) — header.
- "Tarefas abertas" (TasksWidget).
- "Funil de pipeline (mandatos)" (PipelineFunnel) — header + cada estágio (Vigente, Em negociação, Vendemos).
- "Como o motor está aprendendo" (LearningInsightsCard).

### Dashboard Executivo (`ExecutiveDashboardContent.tsx`)
- Linha 1 KPIs: Total Operações, Buyside, Sellside, Em andamento, Concluídas, Canceladas.
- Linha 2 KPIs: Total das operações, Faturamento Vispe, Ticket médio, Tempo médio venda, Tempo médio compra.
- Todos os `ChartCard`: Status das operações, Evolução anual, Valor negociado por ano, Comissão anual Vispe, Operações por tipo, por região, Exclusividade, Fase do Sellside, Por localidade, Por estado, Top 3 maiores, Por responsável, Distribuição de status.

### Match Analytics (`MatchAnalyticsContent.tsx`)
- Todos os KpiTile (mandatos: Total/Vigente/Em negociação/Vendemos/Vencido/Vendeu sozinho/Tempo médio; compradores: Total/Aguardando/Em negociação/Mandatos exclusivos/Tempo médio).
- Cada `ChartCard`.

### Mandate/Buyer 360 e demais painéis
- `MatchesPanel`, `FinancialPipelinePanel`, `DocumentsPanel`, `WhatsAppPanel`, `ConversationSummary`, `ActivityTimeline` — header de cada um.

### Outros indicadores espalhados
- `ScoreDial`, `MatchQualityCard`, `MatchExplainabilityCard`, `MatchDecisionCard`, `EngineHealthCard`, `EventQueueHealthCard`, `DriftMonitorCard`, `DriftAnalyticsCard`, `MarketWavesCard`, `SellerIntentMonitorCard`, `SemanticEmbeddingsCard`, `BackfillHistoryCard`, `EBFunnel` (cada estágio).

---

## 4. Conteúdo dos tooltips (exemplos representativos)

| Indicador | What (o que é) | Action (o que fazer) |
|---|---|---|
| **Fila de eventos** | Eventos do motor ainda não processados (matches, scoring, feedback). | Acima de 1.000 indica atraso — reveja workers/edge functions de processamento. |
| **Eventos com erro** | Eventos que falharam 3 vezes e foram descartados. | Abra Auditoria para ver causa-raiz e reprocessar. |
| **Tier strong** | Empresas com `ma_score` entre 60 e 79 — qualidade boa, ainda não premium. | Use como pipeline secundário para abordagem fria/SDR. |
| **Oportunidades quentes** | Empresas com `ma_score ≥ 80`. | Priorize ligações e envio de teaser hoje. |
| **Próximas ações Mari** | Sugestões geradas pelo motor com base em interações recentes. | Clique em "Abrir" para executar; "Tarefa" para agendar. |
| **Comissão Vispe** | Soma de comissões realizadas em mandatos concluídos. | Compare com meta mensal no Dashboard Executivo. |
| **Funil de pipeline** | Distribuição dos mandatos por estágio comercial. | Estágio inflado vira gargalo — investigue tempo médio. |
| **Top 10 buyers por matches premium** | Compradores com mais matches `score ≥ 80`. | Priorize calls com esses buyers nesta semana. |

Texto completo fica em `ebTooltips.ts` para revisão pelo time.

---

## Detalhes técnicos

- **Sem novas dependências** — Radix Tooltip já presente.
- **Performance**: tooltips são lazy (Radix). Sem impacto em re-render.
- **Responsivo**: em mobile, tap no (i) abre o tooltip (Radix já trata).
- **A11y**: ícone tem `tabIndex={0}` e `aria-label="Mais informações"`.
- **Sem migrations**, **sem edge functions novas**, **sem mudança de schema**.
- Memória: criar `mem://style/info-hints-pattern` documentando o padrão para que toda nova métrica venha com tooltip.

---

## Entregáveis

- 1 componente novo (`InfoHint.tsx`)
- 1 dicionário (`ebTooltips.ts`)
- ~15 wrappers/cards refatorados para aceitar `info`
- ~6 páginas com tooltips ligados
- 1 entrada de memória nova
