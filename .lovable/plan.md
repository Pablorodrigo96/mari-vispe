## Bloco 1.2 — Tasks por etapa + roles `legal` / `observer`

Ordem da Fase 0: **1.1 ✅ → 1.3 ✅ → 1.2 → 1.4 → 1.5 → 1.6**.

### Objetivo
Cada etapa do pipeline passa a ter uma **checklist de tarefas obrigatórias** (ex.: Mandato exige assinatura; NDA exige template enviado; Teaser exige aprovação). Sem todos os itens críticos concluídos, advisor não consegue avançar a etapa. Também adiciona dois papéis novos (`legal` e `observer`) usados em RLS (audit, docs, qna).

### Migration

**1) Enum `app_role` — adicionar valores**
- `ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'legal';`
- `ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'observer';`
- Atualiza `audit_events` RLS para incluir `has_role(uid,'legal')` no SELECT (advisor/legal/observer veem; observer só leitura).

**2) Tabela `stage_task_templates`** (catálogo de tarefas por etapa)
- `id uuid pk`
- `stage_key text` (FK lógica → `eb_pipeline_stages.key`)
- `code text unique` (ex: `mandate_signed`, `nda_sent`, `teaser_approved`)
- `label text`, `description text`
- `is_required boolean default true`
- `is_blocking boolean default true` (se true, impede avançar de etapa)
- `position int`
- `applies_to text default 'all'` (`all` | `real` | `marketplace`)
- `is_active boolean default true`
- Seed inicial cobrindo 12 etapas (Prospecção → Closing), ~3-5 tarefas por etapa.

**3) Tabela `stage_tasks`** (instâncias por deal)
- `id uuid pk`
- `deal_id uuid not null` (= mandate_id)
- `stage_key text not null`
- `template_code text` (FK lógica)
- `label text`, `is_required bool`, `is_blocking bool`
- `status text default 'pending'` (`pending` | `done` | `skipped` | `na`)
- `done_at timestamptz`, `done_by uuid`
- `due_at timestamptz`
- `note text`
- `created_at`, `updated_at`
- Índice: `(deal_id, stage_key, status)`
- Unique `(deal_id, template_code)` para idempotência

**4) Trigger `instantiate_stage_tasks`**
- AFTER INSERT em `eb_mandates`: cria tarefas das etapas iniciais (Prospecção + Mandato).
- AFTER UPDATE de `pipeline_stage` em `eb_mandates`: cria tarefas da nova etapa (idempotente via unique).

**5) Função `can_advance_stage(deal_id, target_stage)` → boolean**
- Retorna `false` se existe `stage_tasks` com `status='pending' AND is_blocking=true` no `stage_key` da etapa **atual** (não permite sair com pendência bloqueante).
- Usada pelo frontend para desabilitar drag-drop / botão "Avançar".

**6) View `deal_stage_progress`** (security_invoker)
- Para cada `(deal_id, stage_key)`: `total`, `done`, `pending_blocking`, `pct_done`.
- Alimenta barrinha de progresso nos cards do Kanban.

**7) RLS**
- `stage_task_templates`: SELECT autenticado; INSERT/UPDATE/DELETE admin.
- `stage_tasks`: SELECT/UPDATE admin OR advisor OR legal OR observer (observer só SELECT); INSERT só via trigger (system).

**8) Backfill**
- Para mandatos existentes, instanciar tarefas da etapa atual (não cria histórico de etapas passadas).

### Frontend (UI mínima, integrado ao que já existe)

- `src/hooks/useStageTasks.ts` — lista tarefas por `deal_id` + mutation `toggleTask(id, status)`.
- `src/hooks/useCanAdvanceStage.ts` — wrap do RPC `can_advance_stage`.
- `src/components/equity-brain/crm/StageTasksChecklist.tsx` — checklist enxuto (label + check + status). Reutilizado em:
  - **Card do Kanban** (`PipelineKanbanPage`): mini-badge `3/5` com tooltip.
  - **`UnifiedDealPage`** (`/equity-brain/deal/:id`): seção "Tarefas desta etapa".
- `PipelineKanbanPage.handleDrop`: chamar `can_advance_stage` antes de mover; se `false`, toast "Conclua tarefas bloqueantes antes de avançar" e cancela. Quem é admin pode forçar (botão "Forçar avanço" → registra `stage_force_advanced` em `audit_events`).
- Cada toggle de task chama `logAuditEvent({ entityType:'pipeline', eventType:'task_completed'|'task_reopened', payload:{ template_code } })`.

### Sem mudança visual maior
- Não muda layout do Kanban — só adiciona uma linha de progresso e um modal de checklist quando clicar no card (reusa Sheet já existente, se houver; caso contrário, popover simples).
- Tema mari mantido (Volt `#D9F564` como accent de progresso, Carbon de fundo).

### Decisões implícitas (sem novas perguntas)
- Tarefas bloqueantes: bloqueiam saída da etapa **atual**, não entrada na próxima — mais simples e cobre 100% do uso.
- Observer = somente leitura em audit/tasks/docs. Não aparece em sidebar como role distinta agora (entrega no Bloco 1.6).
- Legal = leitura ampla em audit/docs + edição em NDA/SPA (NDA/SPA são Bloco 1.4 — aqui só liberamos os SELECT).
- Sem UI para editar `stage_task_templates` nesta etapa — admins editam via SQL/admin tool (UI fica para 1.6).

### Riscos
- `ALTER TYPE ADD VALUE` não pode rodar dentro de transação com uso imediato em alguns contextos — separar `ALTER TYPE` em DDL isolada antes de policies.
- Trigger AFTER UPDATE só dispara se `pipeline_stage` mudar — usar `WHEN (OLD.pipeline_stage IS DISTINCT FROM NEW.pipeline_stage)`.
- Backfill de tarefas para 529 mandatos: idempotente via unique `(deal_id, template_code)`, seguro.
- `can_advance_stage` deve degradar bem se não houver templates configurados para a etapa (retorna `true`).

### Entregáveis
1. Migration: enum + 2 tabelas + 1 trigger + 1 função + 1 view + RLS + seed templates 12 etapas + backfill
2. 2 hooks (`useStageTasks`, `useCanAdvanceStage`)
3. 1 componente `StageTasksChecklist` reusado em 2 lugares
4. Wiring no Kanban (bloqueio + force-advance audit)
5. Validação: criar deal de teste, ver tarefas, tentar avançar com pendência bloqueante, confirmar bloqueio

Após aprovação executo migração + UI mínima sem refatorar Kanban.
