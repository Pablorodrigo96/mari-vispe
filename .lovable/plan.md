# Próxima fase: Bloco 1.6 (fechamento 1.2) + Bloco 1.4 (documentos)

Duas frentes encadeadas. 1.6 é curto (só plugar UI já pronta); 1.4 é o bloco grande de documentos por etapa + assinatura mock.

---

## Bloco 1.6 — Plugar StageTasksChecklist (fecha 1.2)

Sem novas tabelas. Só costura de UI.

1. **UnifiedDealPage** (`src/pages/equity-brain/UnifiedDealPage.tsx`)
   - Adicionar seção "Tarefas desta etapa" na coluna central (abaixo do MatchWhyCard), usando `<StageTasksChecklist dealId={mandate.id} stageKey={mandate.pipeline_stage} />`.
   - Mostrar contador `done/total` no header da seção.

2. **PipelineKanbanPage** (`src/pages/equity-brain/PipelineKanbanPage.tsx`)
   - Mini-badge `done/total` em cada card do Kanban via `useDealStageProgress(dealId)` (novo hook lendo `deal_stage_progress` view).
   - Badge fica vermelho se há `is_blocking` pendente, verde se tudo pronto, cinza neutro caso contrário.

3. **Novo hook** `src/hooks/useDealStageProgress.ts` — query simples na view, retorna `{ total, done, pending_blocking }`.

---

## Bloco 1.4 — Documentos por etapa + templates + Clicksign mock

### Banco (1 migration)

**`doc_templates`** (catálogo curado, admin-only)
- `id`, `code` (unique, ex.: `nda_mutuo`, `loi_v1`, `spa_template`), `label`, `category` (`nda`|`loi`|`spa`|`due_diligence`|`other`), `description`, `storage_path` (template em bucket `doc-templates`), `requires_signature` (bool), `applies_to_stages` (text[]), `is_active`.
- Seed inicial: NDA mútuo, LOI v1, SPA básico, Term Sheet, Checklist DD.

**`stage_doc_requirements`** (quais docs cada etapa pede)
- `id`, `stage_key` (FK `eb_pipeline_stages.key`), `template_code` (FK `doc_templates.code`), `is_required`, `is_blocking`, `position`.
- Seed: Prospecção (NDA), Negociação (LOI), DD (Checklist DD), Fechamento (SPA).
- Integra com `can_advance_stage` (Bloco 1.2): adicionar check de docs `is_blocking` faltando.

**`deal_documents`** (instâncias por deal — estender a tabela existente se já houver, ou criar)
- `id`, `deal_id`, `stage_key`, `template_code` (nullable; nem todo doc vem de template), `label`, `category`, `storage_path`, `uploaded_by`, `uploaded_at`, `status` (`draft`|`pending_signature`|`signed`|`archived`), `signature_provider` (`clicksign_mock`|`manual`|null), `signature_request_id`, `signed_at`, `signed_by`, `metadata` (jsonb).
- RLS: admin/advisor/legal full; observer read; trigger log em `audit_events` (`doc_uploaded`, `doc_status_changed`, `doc_signed`).

**Storage bucket** `deal-documents` (private) + policies por role.

**View `deal_doc_progress`** (security_invoker) — `deal_id`, `stage_key`, `required_count`, `present_count`, `pending_blocking` — análoga à `deal_stage_progress`.

**`can_advance_stage` atualizada** — agora bloqueia se há `stage_tasks` OU `stage_doc_requirements` `is_blocking` faltando.

### Edge function — Clicksign mock

`supabase/functions/clicksign-mock/index.ts`:
- POST `/request-signature` → recebe `document_id`, retorna `{ signature_request_id, signing_url }` (URL fake `/sign/:id`).
- POST `/webhook` → simula callback que marca `deal_documents.status = 'signed'` + log audit.
- Tudo gated por flag `MOCK_SIGNATURE=true`; pronto pra trocar por Clicksign real depois.

### Frontend

1. **`src/hooks/useDealDocuments.ts`** — lista docs por deal+stage; mutations upload/archive/request-signature.
2. **`src/hooks/useDealDocProgress.ts`** — wrap da view.
3. **`src/components/equity-brain/crm/StageDocumentsPanel.tsx`** — nova seção em UnifiedDealPage: lista requisitos da etapa (com check ✅/⚠️), botão "Anexar", "Gerar a partir do template", "Pedir assinatura".
4. **`src/components/equity-brain/crm/DocumentTemplatePicker.tsx`** — modal pra escolher template do catálogo filtrado por `applies_to_stages`.
5. **`src/components/equity-brain/crm/SignatureRequestDialog.tsx`** — confirma envio mock; mostra URL fake de assinatura + botão "Simular assinatura" (admin only, dev helper).
6. **PipelineKanbanPage** — mini-badge de docs ao lado do badge de tarefas.
7. **`auditService`** — novos event_types: `doc_uploaded`, `doc_template_generated`, `signature_requested`, `doc_signed`.

### Decisões propostas (default ✅)

- **D8** Bucket `deal-documents` é privado, signed URLs com TTL 5min. ✅
- **D9** Clicksign **mock** nesta fase; integração real fica para Fase 2 com secret `CLICKSIGN_API_KEY`. ✅
- **D10** Templates são arquivos `.docx` no bucket `doc-templates`; geração "a partir do template" nesta fase = copy do .docx + preenchimento de placeholders simples (`{{empresa}}`, `{{valor}}`) via edge function. ✅
- **D11** `legal` role pode editar docs em qualquer stage; `observer` só lê. ✅
- **D12** `can_advance_stage` passa a checar tasks **E** docs blocking — admin pode forçar com confirm (já implementado em 1.2). ✅

### Riscos

- Tabela `deal_documents` pode já existir em forma parcial — vou auditar antes da migration e usar `ALTER` ao invés de `CREATE` se for o caso.
- Edge function mock precisa estar claramente marcada (`*-mock`) pra não confundir com produção.
- Backfill: docs já carregados em outros lugares (DocumentsPanel atual) ficam visíveis via UNION na view, sem migração destrutiva.

---

## Ordem de execução

1. Bloco 1.6 (1 hook + 2 edits de UI) — rápido, fecha 1.2.
2. Bloco 1.4 migration (templates + requirements + deal_documents + bucket + view + can_advance_stage update).
3. Bloco 1.4 edge function clicksign-mock.
4. Bloco 1.4 hooks + componentes + plug em UnifiedDealPage e Kanban.

Aprovar D8–D12 + ordem → executo direto.