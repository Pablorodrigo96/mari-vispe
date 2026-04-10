

## Plano: Corrigir 3 Vulnerabilidades de Segurança Restantes

A migração anterior aplicou apenas os fixes de realtime e view. Os fixes de privilege escalation e capital_providers foram perdidos, e há um novo finding sobre buyer_profiles.

### 1. Privilege Escalation — user_roles (CRITICO)

**Problema:** A policy "Users can insert own roles" ainda está ativa. Qualquer usuário pode se tornar admin.

**Solução (Migração SQL):**
- Dropar a policy "Users can insert own roles"
- Atualizar o trigger `handle_new_user` para inserir roles a partir de `raw_user_meta_data`, filtrando 'admin'

O `AuthContext.tsx` já está correto (passa roles via metadata).

### 2. Capital Providers — dados sensíveis expostos

**Problema:** A view `public_capital_providers` nunca foi criada. A policy pública de SELECT ainda expõe `webhook_url` e `contact_email`.

**Solução (Migração SQL):**
- Dropar a policy "Anyone can view active providers"
- Criar view `public_capital_providers` com `security_invoker=on`, excluindo campos sensíveis
- Conceder SELECT na view para public

### 3. Buyer Profiles — email e WhatsApp expostos

**Problema:** A policy "Authenticated can view active buyers" expõe email e WhatsApp de todos os compradores ativos para qualquer usuário autenticado.

**Solução (Migração SQL):**
- Dropar a policy atual de SELECT
- Criar view `public_buyer_profiles` com `security_invoker=on` que exclui `email` e `whatsapp`
- Criar policies: owners e admins podem ver tudo na tabela base; authenticated vê apenas a view (sem dados de contato)

### Arquivos Alterados

| Arquivo | Mudança |
|---|---|
| Migração SQL | Dropar policy de roles, atualizar trigger, criar views seguras para providers e buyers |

