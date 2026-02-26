

## Plano: Cadastro de Franqueado com Aprovação Admin

### Contexto
O sistema atual tem 3 roles no cadastro (seller, buyer, advisor) + admin. Precisamos adicionar o role "franchisee" (Franqueado) ao enum do banco, ao formulário de cadastro, e criar um fluxo de aprovação onde o admin autoriza o franqueado, que então recebe acesso ao Plano Master automaticamente sem pagar.

---

### 1. Migração: Adicionar `franchisee` ao enum + tabela de aprovação

Adicionar o valor `franchisee` ao enum `app_role` e criar uma tabela `franchisee_requests` para controlar o fluxo de aprovação.

```sql
ALTER TYPE public.app_role ADD VALUE 'franchisee';

CREATE TABLE public.franchisee_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.franchisee_requests ENABLE ROW LEVEL SECURITY;

-- User can view own requests
CREATE POLICY "Users can view own franchisee requests"
  ON public.franchisee_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert own requests
CREATE POLICY "Users can insert own franchisee requests"
  ON public.franchisee_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all
CREATE POLICY "Admins can view all franchisee requests"
  ON public.franchisee_requests FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update
CREATE POLICY "Admins can update franchisee requests"
  ON public.franchisee_requests FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));
```

---

### 2. Formulário de Cadastro (`Auth.tsx`)

Adicionar a opção "Franqueado" na lista de perfis:

| ID | Label | Descrição |
|---|---|---|
| `franchisee` | Franqueado | Sou franqueado da rede |

Quando o usuário seleciona "Franqueado" e cria a conta:
- O role `franchisee` é inserido em `user_roles`
- Um registro é criado em `franchisee_requests` com `status = 'pending'`
- Notificação é enviada aos admins: "Novo franqueado pendente de aprovação: [Nome]"
- Toast de sucesso informa: "Conta criada! Sua aprovação como franqueado está em análise."

| Arquivo | Acao |
|---|---|
| `Auth.tsx` | Adicionar opção Franqueado na lista de roles + criar request ao cadastrar |
| `AuthContext.tsx` | Adicionar `franchisee` ao tipo `UserRole` |

---

### 3. Painel Admin: Aprovação de Franqueados (`AdminUsers.tsx`)

Adicionar seção/aba no painel de usuários para gerenciar solicitações de franqueados:
- Lista de solicitações pendentes com nome, telefone, data
- Botões "Aprovar" e "Rejeitar"
- Ao aprovar:
  1. Atualiza `franchisee_requests.status = 'approved'`
  2. Cria uma assinatura Master gratuita na tabela `subscriptions` (plan = 'master', status = 'active', sem stripe_subscription_id)
  3. Envia notificação ao franqueado: "Parabéns! Sua conta de franqueado foi aprovada. Você agora tem acesso ao Plano Master."
- Ao rejeitar:
  1. Atualiza `franchisee_requests.status = 'rejected'`
  2. Remove o role `franchisee` do `user_roles`
  3. Envia notificação ao franqueado: "Sua solicitação de franqueado não foi aprovada."

| Arquivo | Acao |
|---|---|
| `AdminUsers.tsx` | Adicionar seção de franqueados pendentes com ações de aprovação/rejeição |

---

### 4. Hook `useUserRoles.ts`

Adicionar `franchisee` ao tipo e expor `isFranchisee`.

| Arquivo | Acao |
|---|---|
| `useUserRoles.ts` | Adicionar `franchisee` ao tipo AppRole e expor `isFranchisee` |

---

### 5. Config do Admin (`AdminUsers.tsx` + `roleConfig`)

Adicionar `franchisee` ao `roleConfig` com label "Franqueado", ícone e cor, e ao filtro de roles.

---

### Seção Tecnica

**Migração SQL:**
- `ALTER TYPE app_role ADD VALUE 'franchisee'`
- Nova tabela `franchisee_requests` com RLS
- Notificação via trigger ou client-side

**Fluxo de aprovação:**
```text
Cadastro → role 'franchisee' + request 'pending' + notificação admin
    ↓
Admin aprova → request 'approved' + subscription Master criada + notificação user
Admin rejeita → request 'rejected' + role removido + notificação user
```

**Assinatura Master para franqueado aprovado:**
```text
INSERT INTO subscriptions (user_id, plan, status, multiples_limit, dcf_limit)
VALUES (user_id, 'master', 'active', 999, 999)
```
Sem `stripe_subscription_id` e sem `expires_at` (acesso permanente enquanto ativo).

**Arquivos modificados:** 4 arquivos + 1 migração SQL

| Arquivo | Acao |
|---|---|
| Migração SQL | Adicionar franchisee ao enum + criar tabela franchisee_requests |
| `AuthContext.tsx` | Adicionar franchisee ao tipo UserRole |
| `Auth.tsx` | Adicionar opção Franqueado + criar request + notificar admins |
| `useUserRoles.ts` | Adicionar isFranchisee |
| `AdminUsers.tsx` | Seção de aprovação de franqueados com ações |

