---
name: Deal Room Notifications
description: Triggers em deal_qa e deal_documents inserindo em public.notifications quando há nova pergunta, resposta ou doc liberado.
type: feature
---
**Bloco 2.3 (Fase 2).**

Triggers SECURITY DEFINER:
- `tg_deal_qa_notify_insert` (AFTER INSERT em `deal_qa`): se `author_role='buyer'`, insere notification para todos staff (admin+advisor via `_notify_staff_user_ids()`) com `type='deal_qa_new'`.
- `tg_deal_qa_notify_answer` (AFTER UPDATE OF answer, visible_to_buyer em `deal_qa`): quando answer passa de vazio → preenchido E `visible_to_buyer=true`, notifica `buyer_user_id` com `type='deal_qa_answered'`.
- `tg_deal_documents_notify_visible` (AFTER INSERT OR UPDATE OF visible_to_buyer em `deal_documents`): quando `visible_to_buyer` vira true, notifica todos `buyer_deal_access` ativos do deal com `type='deal_doc_shared'`.

Tabela alvo: `public.notifications` (campos: user_id, type, title, content). Realtime e sino já existentes consomem automaticamente.
