# Gate de aprovação admin para roles sensíveis (advisor + franchisee)

## Objetivo
Ninguém vira **advisor** ou **franchisee** só marcando checkbox no signup. Esses roles passam a depender de aprovação explícita de um admin. Vendedor e comprador continuam liberados na hora.

## Comportamento alvo

| Role escolhido no signup | Antes | Depois |
|---|---|---|
| seller | entra direto | igual (entra direto) |
| buyer | entra direto | igual |
| advisor | entra direto + acesso total ao EB/CRM | **cria request `pending`, NÃO ganha role; vê tela "aguardando aprovação"** |
| franchisee | entra direto + request cosmético | **cria request `pending`, NÃO ganha role; vê tela "aguardando aprovação"** |

## Mudanças

### 1. Banco
- Nova tabela `public.advisor_requests` (espelha `franchisee_requests`): `user_id`, `status` (pending/approved/rejected), `reviewed_by`, `reviewed_at`, `reason`, `created_at`. RLS: usuário vê o próprio; admin vê/edita tudo.
- Atualizar `handle_new_user` trigger:
  - `valid_roles` passa a ser apenas `['seller','buyer']` para auto-insert em `user_roles`.
  - Se metadata.roles inclui `advisor` → cria linha em `advisor_requests` (pending) + notifica admins. **Não** insere em `user_roles`.
  - Se metadata.roles inclui `franchisee` → cria linha em `franchisee_requests` (pending) + notifica admins. **Não** insere em `user_roles`.
- Função `approve_advisor_request(request_id)` SECURITY DEFINER, restrita a admin: insere `user_roles(user_id, 'advisor')`, marca request approved, dispara notificação ao usuário.
- Função análoga `approve_franchisee_request(request_id)` (já existe fluxo parcial — consolidar para também inserir o role só agora).
- Funções de reject que apenas marcam status + notificam.

### 2. Front
- `Auth.tsx`: ao concluir signup com advisor/franchisee, mensagem de sucesso muda para "Conta criada. Acesso de Assessor/Franqueado aguardando aprovação." e redireciona para `/aguardando-aprovacao` (ou `/painel` se também tiver seller/buyer).
- Nova página leve `/aguardando-aprovacao` mostrando status do(s) request(s) do usuário e CTA para WhatsApp.
- Remover, do `Auth.tsx`, o INSERT direto em `franchisee_requests` (vai pra trigger).
- `useUserRoles` não muda — roles continuam vindos de `user_roles`. Como o role só existe após aprovação, sidebar/rotas (RequireRole, sidebar role-strict) já bloqueiam automaticamente.

### 3. Painel admin
- Em `AdminUsers` (ou nova aba `AdminApprovals`): lista de `advisor_requests` + `franchisee_requests` pendentes com botões Aprovar / Rejeitar (chama as funções RPC). Mostra nome, email, telefone, data.

### 4. Limpeza retroativa (opcional, te confirmo antes de rodar)
- Migration de auditoria: lista usuários atuais com role `advisor` ou `franchisee` que **não** têm request approved. Apenas lista — não revoga automaticamente para evitar quebrar contas legítimas. Você decide quem manter.

## Fora de escopo (confirmado por você)
- Valuations continuam **não** indo para o grafo EB. Sem mudança no fluxo de valuation.
- Listings continuam entrando no grafo via fluxo atual (sync admin). Sem mudança aqui.
- Sem mudança em rotas/sidebar — a proteção já existe, só estamos cortando a fonte do role.

## Validação pós-deploy
- Signup como "Assessor" → conta criada, sem role advisor, redireciona para tela de aguardando, admin recebe notificação.
- Admin aprova → usuário ganha role advisor, vê EB normalmente.
- Signup como "Franqueado" → idem fluxo.
- Signup seller/buyer → continua funcionando igual.
- Usuário existente já advisor/franchisee continua funcionando (não mexemos em quem já tem o role).
