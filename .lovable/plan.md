## Bloco 1.3 — `audit_events` (próximo)

Ordem aprovada na Fase 0: **1.1 ✅ → 1.3 → 1.2 → 1.4 → 1.5 → 1.6**.

### Objetivo
Tabela única e imutável de auditoria para todo evento sensível do M&A (mudança de stage, disclosure de identidade, upload/aprovação de doc, envio de NDA, criação de NBO, etc.). Base para timeline do Deal 360, compliance LGPD e relatórios SLA.

### Migration (Bloco 1.3)

**Tabela `public.audit_events`**
- `id uuid pk`
- `deal_id uuid` (= `mandate_id`, conforme D2)
- `entity_type text` (`mandate` | `buyer` | `company` | `document` | `pipeline` | `nda` | `qna` | `negotiation`)
- `entity_id uuid`
- `event_type text` (ex: `stage_changed`, `identity_revealed`, `doc_uploaded`, `doc_approved`, `nda_sent`, `nbo_received`)
- `actor_user_id uuid`, `actor_role app_role`
- `payload jsonb` (diff/contexto: from/to, doc_id, target_user, etc.)
- `ip inet`, `user_agent text` (best-effort, para LGPD)
- `created_at timestamptz default now()`
- Índices: `(deal_id, created_at desc)`, `(entity_type, entity_id)`, `(actor_user_id)`, `(event_type)`

**Imutabilidade**
- Trigger `BEFORE UPDATE/DELETE` que `RAISE EXCEPTION` (audit é append-only).
- Sem coluna `updated_at`.

**RLS**
- Habilitar.
- `SELECT`: `admin` OR `advisor` OR `has_role('legal')` OR `actor_user_id = auth.uid()`.
- `INSERT`: qualquer usuário autenticado (escrita controlada pelo helper, ver abaixo).
- `UPDATE`/`DELETE`: bloqueado por trigger (nenhuma policy).

**Helper SQL `public.log_audit_event(...)`** `SECURITY DEFINER`, `search_path=public` — encapsula insert com `actor_role` resolvido via `has_role`, evita duplicação no app.

**View `public.deal_timeline`** (`security_invoker=on`)
- Une `audit_events` + `eb_pipeline_transitions` + `crm_activities` (se `deal_id` mapeável) num feed ordenado por `created_at` para alimentar Deal 360.

**Backfill leve**
- Popular `audit_events` com `stage_changed` a partir de `eb_pipeline_transitions` existentes (idempotente via `event_type + entity_id + payload->>'transition_id'`).

### Frontend (mínimo, sem nova UI)
- `src/services/audit/auditService.ts` — wrapper `logAuditEvent({ dealId, entityType, entityId, eventType, payload })` chamando o RPC `log_audit_event`.
- `src/hooks/useDealTimeline.ts` — query da view `deal_timeline` por `deal_id`.
- **Sem** alteração visual nesta etapa — Deal 360 consome a hook no Bloco 1.6.

### Pontos de integração (apenas wiring, sem refactor)
- `usePipelineStages` / handler de drag-drop do Kanban: chamar `logAuditEvent` em transição.
- Fluxo de disclosure existente (`IdentityRevealCard`): logar `identity_revealed`.
- Upload de doc no `DocumentsPanel`: logar `doc_uploaded`.

### Riscos
- Volume: índice `(deal_id, created_at desc)` resolve leitura. Particionamento fica para Fase 5 se necessário.
- `app_role` ainda não tem `legal`/`observer` — entra no Bloco 1.2 (D3). Por ora policy aceita só `admin`+`advisor`+self.
- Backfill de transições antigas: idempotente, seguro rodar múltiplas vezes.

### Entregáveis
1. Migration `audit_events` + trigger imutável + RLS + helper + view + backfill
2. `auditService.ts` + `useDealTimeline.ts`
3. 3 pontos de wiring (pipeline, disclosure, upload)
4. Validação: inserir evento de teste, confirmar bloqueio de UPDATE/DELETE, ler via view

Após aprovação executo a migration e o wiring mínimo, sem tocar UI do Deal 360 (fica para 1.6).
