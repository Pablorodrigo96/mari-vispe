---
name: Stage documents and signature mock
description: Doc templates catalog, stage requirements, deal_documents, clicksign-mock edge function, can_advance_stage gates on tasks AND docs.
type: feature
---
**Catálogo**: `doc_templates` (NDA, LOI, Term Sheet, DD checklist, SPA) com `applies_to_stages[]` + `requires_signature`.
**Requisitos**: `stage_doc_requirements(stage_key, template_code, is_required, is_blocking)`.
**Instâncias**: `deal_documents(deal_id=mandate_id, stage_key, template_code, status: draft|pending_signature|signed|archived, signature_provider, signing_url)` com audit trigger.
**Buckets privados**: `deal-documents` (signed URLs TTL 300s) e `doc-templates` (read auth, write admin).
**View**: `deal_doc_progress(deal_id, stage_key, required_count, present_count, pending_blocking)` security_invoker.
**Gate de avanço**: `can_advance_stage(deal_id, from_stage)` bloqueia se tem `stage_tasks` OU `stage_doc_requirements` blocking pendentes.
**Edge fn `clicksign-mock`** (verify_jwt=false default): `action: request-signature` → marca pending + mock URL; `action: simulate-sign` (dev/admin) → marca signed.
**Frontend**: `useDealDocuments`, `useStageDocRequirements`, `useDealDocProgress`, `useUploadDealDocument`, `useArchiveDealDocument`, `useRequestSignature`, `useSimulateSign`, `getSignedUrl`. Componente `StageDocumentsPanel` em `UnifiedDealPage`. Mini-badge `DocProgressBadge` no Kanban (verde/vermelho/cinza).
**Roles**: admin/advisor/legal full write; observer só lê; service_role para callbacks.
**Trocar mock por real**: secret `CLICKSIGN_API_KEY` + integração HTTP na edge function.
