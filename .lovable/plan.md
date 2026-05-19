# Próxima fase: Bloco 1.5 (fechamento Fase 1) + Bloco 2.1 (kickoff Fase 2)

Com 1.1–1.4 + 1.6 entregues (roles, tasks, docs + assinatura mock, identity reveal, audit), faltam dois passos pra fechar Fase 1 e abrir Fase 2.

---

## Bloco 1.5 — NDA flow + gating de UI por role (`legal`, `observer`)

Sem novas tabelas grandes. Costura de regras de acesso + fluxo NDA usando o que já existe (`deal_documents`, `clicksign-mock`, `IdentityRevealCard`).

### Banco (migration enxuta)
- Adicionar coluna `nda_signed_at timestamptz` em `eb_buyers` (ou view derivada se já houver registro em `deal_documents` com `category='nda'` + `status='signed'`).
- RPC `public.buyer_has_signed_nda(_buyer_id uuid, _deal_id uuid) returns boolean` consultando `deal_documents`.
- Atualizar RPC `eb_can_view_identity(deal_id)` (já existe pra advisor/admin) pra também liberar buyer **quando NDA assinado** no contexto daquele deal.
- Trigger: ao inserir `deal_documents` `category='nda' status='signed'`, gravar `audit_events` `nda_signed` + atualizar `nda_signed_at`.

### Frontend
1. **`useUserRole`** já existe — expor helpers `isLegal`, `isObserver` (read-only global no EB).
2. **`StageDocumentsPanel`** — esconder botões de upload/archive/signature pra `observer`; permitir pra `legal` em qualquer stage.
3. **`StageTasksChecklist`** — `observer` vê check disabled.
4. **`PipelineKanbanPage`** — `observer` não arrasta cards (drag handlers no-op).
5. **`UnifiedDealPage` (lado buyer)** — novo card `NDARequiredCard` quando buyer logado tenta ver identidade e ainda não assinou NDA do deal: botão "Assinar NDA" → gera doc via template `nda_mutuo` + dispara `clicksign-mock` → polling status; ao assinar, `IdentityRevealCard` libera sozinho.
6. **`AdminUsers`** — badges visuais distintos pros novos roles + filtro por role.

### Auditoria
- Novos `audit_events`: `nda_requested`, `nda_signed`, `observer_blocked_action` (telemetria de UI gating).

---

## Bloco 2.1 — Buyer Deal Room v1 (kickoff Fase 2)

Rota nova `/equity-brain/sala/:dealId` exclusiva pro buyer aprovado (NDA assinado + match ativo).

### Banco
- Tabela `buyer_deal_access` (`id`, `deal_id`, `buyer_id`, `granted_by`, `granted_at`, `revoked_at`, `access_level` `'teaser'|'full'`).
- View `buyer_deal_room` (security_invoker) consolidando: teaser blind, identity (se liberada), docs visíveis pro buyer, marcos do pipeline (sem detalhes internos), checklist DD do lado buyer.
- RLS: buyer só vê linhas onde `buyer_id = (select buyer of auth.uid())` e `revoked_at is null`.

### Frontend
1. **`src/pages/buyer/DealRoomPage.tsx`** — layout 2 colunas:
   - **Esquerda**: visão do alvo (blind/identity conforme NDA), métricas, KPIs.
   - **Direita**: timeline pública do deal (etapas atingidas), docs disponíveis, próximos passos, botão WhatsApp pro advisor.
2. **`useBuyerDealRoom(dealId)`** hook.
3. **`BuyerDealAccessManager`** dentro de `UnifiedDealPage` (lado advisor) — conceder/revogar acesso, listar buyers ativos.
4. **`BuyerSidebar`** — novo item "Minhas salas" listando deals com acesso ativo.

### Auditoria
- `deal_room_opened`, `deal_room_doc_downloaded`, `buyer_access_granted/revoked`.

---

## Decisões propostas (default ✅)

- **D13** NDA usa template `nda_mutuo` já seedado em 1.4; mock por padrão, real Clicksign fica pra Fase 3. ✅
- **D14** `observer` é read-only global no EB (não só docs/tasks); `legal` é editor full em docs/NDA/SPA, sem permissão pra mover pipeline. ✅
- **D15** Buyer Deal Room é **opt-in** por buyer — advisor concede acesso explícito; sem auto-grant em match. ✅
- **D16** Documentos visíveis ao buyer = subset com flag `visible_to_buyer` (novo bool em `deal_documents`, default false). ✅

---

## Ordem de execução

1. Migration 1.5 (NDA helpers + RLS update em `eb_can_view_identity`).
2. Frontend 1.5 (gating + NDARequiredCard).
3. Migration 2.1 (`buyer_deal_access` + view `buyer_deal_room` + `visible_to_buyer` em `deal_documents`).
4. Frontend 2.1 (DealRoomPage + manager + sidebar buyer).
5. Smoke test end-to-end: advisor concede acesso → buyer entra na sala → assina NDA → vê identity + docs liberados.

Aprovar D13–D16 + ordem → executo direto.
