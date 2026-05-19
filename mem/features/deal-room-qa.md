---
name: Deal Room Q&A
description: Tabela deal_qa + RLS + DealQAPanel/StaffQASection para troca de perguntas/respostas entre comprador e assessor dentro do Deal Room.
type: feature
---
**Bloco 2.2 (Fase 2).**

- Tabela `public.deal_qa` (deal_id sem FK, mesmo padrão de deal_documents): question, answer, author_role (buyer/advisor/admin/legal), `visible_to_buyer`, parent_id.
- RPC `buyer_has_active_access(deal_id, user_id)` (SECURITY DEFINER) usada na policy de INSERT do buyer.
- RLS:
  - SELECT staff (admin/advisor/legal/observer) → tudo.
  - SELECT buyer → `buyer_user_id = auth.uid() AND visible_to_buyer`.
  - INSERT buyer → exige acesso ativo + author_role='buyer'.
  - INSERT staff → exige role advisor/admin/legal.
  - UPDATE só staff (resposta + toggle visibilidade). DELETE só admin.
- Hooks em `src/hooks/useDealQA.ts`: `useDealQA`, `useAskQuestion`, `useAnswerQuestion`, `useStaffPostQuestion`, `useToggleQAVisibility`.
- UI:
  - `DealQAPanel` (genérico) — modo buyer e modo staff.
  - `StaffQASection` (lista buyers ativos por chips, painel por buyer selecionado).
  - Integrado no `DealRoomPage` (buyer) e `UnifiedDealPage` (staff, abaixo do BuyerDealAccessManager).
- Observer: `readOnly` desativa textareas/botões.
