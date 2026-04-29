
# Pipeline Kanban — Fix + Editor de Stages + SLA + Histórico

## Por que o Kanban está vazio

A tela faz `SELECT` em `eb_mandates` pedindo a coluna **`data_assinatura_contrato`**, que **não existe** nessa tabela (o nome real é `data_assinatura`). O PostgREST devolve **HTTP 400 (`42703 column ... does not exist`)** e nenhum mandato é carregado — por isso todas as 6 colunas aparecem zeradas, mesmo havendo **86 mandatos em stage `match`** no banco.

Fix imediato: trocar `data_assinatura_contrato` por `data_assinatura` no `select` e no objeto `values` passado ao `QuickEditPopover`.

---

## Novidades

### 1. Editor de Stages (CRUD de etapas)

Novo painel "Configurar etapas" (botão de engrenagem no header do Kanban) com modal que permite:

- **Adicionar** etapa (key + label + cor + posição).
- **Renomear / recolorir** etapas existentes.
- **Reordenar** via drag-and-drop.
- **Remover** etapa (com obrigação de migrar mandatos da etapa removida para outra).
- **SLA por etapa** (nº de dias ideal antes de virar "congelada").

Persistência: nova tabela `public.eb_pipeline_stages` (`key`, `label`, `color`, `position`, `sla_days`, `is_terminal`, `archived_at`). RLS: SELECT autenticado, INSERT/UPDATE/DELETE só admin/advisor.

O `PIPELINE_STAGES` hardcoded em `dealFormatters.ts` vira fallback; o Kanban e o `QuickEditPopover` passam a ler stages do hook `usePipelineStages()` (TanStack Query, cache 5min). Mandatos com `pipeline_stage` cujo enum não exista mais ficam numa coluna virtual "Sem etapa" para realocação.

> Nota técnica: como hoje `pipeline_stage` é um ENUM Postgres, o editor grava em texto livre dentro de `eb_pipeline_stages` e a coluna `eb_mandates.pipeline_stage` é migrada para `text` com CHECK opcional. Migration cuidará do cast.

### 2. Gestão de tempo / Oportunidade congelada

Para cada card mostrar:

- **Tempo na etapa**: `now() - stage_changed_at` (badge "12d na etapa").
- **Estado SLA** baseado em `eb_pipeline_stages.sla_days`:
  - verde: dentro do prazo
  - amarelo: 80–100% do SLA
  - **vermelho + ícone snowflake**: estourou → "Congelada"
- Filtro no header: "Mostrar só congeladas".
- KPI no topo: `% deals congelados`, `tempo médio por etapa`, `tempo médio total do funil`.

Alerta automático:

- Edge function nova `pipeline-freeze-alerts` (cron diário às 09:00) varre mandatos com `now() - stage_changed_at > sla_days` e:
  - cria notificação em `public.notifications` para o `responsavel_id`
  - cria atividade `kind='alert_frozen'` em `equity_brain.crm_activities`
  - dedup: não dispara se já existir alerta nas últimas 24h
- Botão manual "Reanimar" no card → atualiza `stage_changed_at = now()` e loga atividade.

### 3. Histórico de transições

Nova tabela `public.eb_pipeline_transitions`:

```text
id, mandate_id, from_stage, to_stage, from_outcome, to_outcome,
moved_by, moved_at, time_in_previous_stage_seconds, note
```

Trigger `eb_mandates_after_update_pipeline` insere uma row sempre que `pipeline_stage` ou `outcome` mudam, calculando `time_in_previous_stage_seconds = now() - OLD.stage_changed_at` e atualizando `stage_changed_at = now()`.

UI:
- Aba **"Histórico"** dentro de `MandateDetailPage` mostra timeline vertical (de cima pra baixo) com `from → to`, autor, duração, nota.
- Página nova **`/equity-brain/crm/pipeline/historico`** com:
  - Tabela paginada de todas as transições + filtros (período, responsável, setor, UF, stage de origem/destino).
  - **KPIs agregados**:
    - Tempo médio total `match → closed`
    - Tempo médio por etapa (heatmap horizontal)
    - Taxa de conversão entre etapas (funil com %)
    - Top 5 mandatos mais demorados / mais rápidos
  - Export CSV reusando `lib/exportCsv.ts`.
- Cada KPI/coluna ganha o `InfoHint` (padrão `info-hints-pattern`) e a chave é registrada em `ebTooltips.ts`.

---

## Arquivos

**Criar**
- `supabase/migrations/<timestamp>_pipeline_stages_and_transitions.sql` — tabelas, trigger, alter enum→text, RLS.
- `supabase/functions/pipeline-freeze-alerts/index.ts` + cron via `cron.schedule`.
- `src/hooks/usePipelineStages.ts`
- `src/components/equity-brain/crm/PipelineStagesEditor.tsx` (modal CRUD)
- `src/components/equity-brain/crm/StageTimeBadge.tsx`
- `src/pages/equity-brain/PipelineHistoryPage.tsx`
- `src/components/equity-brain/crm/MandateTransitionsTab.tsx`

**Editar**
- `src/pages/equity-brain/PipelineKanbanPage.tsx` — fix da coluna, integração com `usePipelineStages`, badges de tempo, filtro congeladas, botão de configuração.
- `src/components/equity-brain/crm/QuickEditPopover.tsx` — usar `data_assinatura` (não `_contrato`) e ler stages do hook.
- `src/lib/dealFormatters.ts` — manter como fallback apenas.
- `src/pages/equity-brain/MandateDetailPage.tsx` — nova aba "Histórico".
- `src/App.tsx` — rota `/equity-brain/crm/pipeline/historico`.
- `src/components/layout/AppSidebar.tsx` (se houver entrada CRM) — link para Histórico.
- `src/lib/ebTooltips.ts` — entradas dos novos KPIs.
- `mem://index.md` + nova memória `mem://features/pipeline-stages-sla-history.md`.

---

## Observações

- A migração que altera `pipeline_stage` de enum para text precisa de cast explícito; mantemos um CHECK opcional contra a lista de keys conhecidas para evitar lixo.
- O cron de freeze é idempotente (dedup 24h) e respeita responsável: notificação vai para o owner do mandato; admins recebem agregado semanal (fora do escopo desta entrega — ficará registrado como TODO).
- Sem mudança no fluxo de identidade/disclosure já existente.
