---
name: Role Approval Gate
description: Advisor and franchisee roles require admin approval; trigger creates request, role granted only via approve_*_request RPC.
type: feature
---
- Signup com `advisor` ou `franchisee` NÃO insere em `user_roles`. Trigger `handle_new_user` cria linha em `advisor_requests` ou `franchisee_requests` (status `pending`) e notifica admins.
- Aprovação via RPC `approve_advisor_request(p_request_id)` / `approve_franchisee_request(p_request_id)` (SECURITY DEFINER, admin-only). Insere o role e notifica usuário.
- Rejeição: `reject_advisor_request` / `reject_franchisee_request` com `p_reason`.
- Admin UI: `/admin/aprovacoes` (AdminApprovals.tsx) lista pedidos pendentes.
- Usuário pendente: redirecionado para `/aguardando-aprovacao` se não tiver role auto (seller/buyer).
- seller/buyer continuam com auto-grant.
