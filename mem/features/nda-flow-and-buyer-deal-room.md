---
name: NDA Flow + Buyer Deal Room
description: Bloco 1.5 + 2.1 — NDA signed unlocks identity, buyer_deal_access controls room access, deal_documents.visible_to_buyer flags shared materials.
type: feature
---

- Migration adiciona `deal_documents.visible_to_buyer` (default false), tabela `buyer_deal_access` (deal_id × buyer_user_id × access_level teaser/full), RPC `buyer_has_signed_nda(deal_id)`, view `buyer_deal_room` (security_invoker) e trigger `trg_deal_documents_nda_signed` que loga `nda_signed` em `audit_events`.
- `eb_can_view_identity(cnpj, listing, deal_id)` agora aceita 3º parâmetro e libera buyer com NDA assinado + acesso ativo. Roles `legal` também são liberadas (full edit).
- `useUserRoles` expõe `isLegal`, `isObserver`, `canEditEB` (admin|advisor|legal) e `isReadOnly` (observer puro).
- `StageDocumentsPanel`, `StageTasksChecklist` e `PipelineKanbanPage` (drag) escondem ações de edição quando `!canEditEB`.
- `BuyerDealAccessManager` (em UnifiedDealPage para admin/advisor): concede/revoga acesso por UUID do usuário comprador.
- Rotas `/salas` (lista) e `/salas/:id` (DealRoomPage) — sala do comprador com identidade gated por NDA, docs com `visible_to_buyer=true` e timeline pública do deal.
