

## Plano: Corrigir 4 Vulnerabilidades de Segurança

### 1. Privilege Escalation — Qualquer usuário pode se tornar admin (CRÍTICO)

**Problema:** A policy "Users can insert own roles" permite que qualquer usuário autenticado insira uma row com `role = 'admin'` na tabela `user_roles`, ganhando acesso total ao sistema.

**Solução (Migração SQL):**
- Dropar a policy "Users can insert own roles"
- Mover a inserção de roles do signup para o trigger `handle_new_user` (SECURITY DEFINER), que já roda com privilégios elevados
- O trigger inserirá os roles passados via `raw_user_meta_data` (excluindo 'admin')

**Arquivo `src/contexts/AuthContext.tsx`:**
- Passar os roles selecionados via `options.data.roles` no `signUp`
- Remover o insert direto na tabela `user_roles` após o signup

### 2. Capital Providers — Webhook URLs e emails expostos publicamente

**Problema:** A policy "Anyone can view active providers" (role: public) expõe `webhook_url` e `contact_email`.

**Solução (Migração SQL):**
- Dropar a policy pública de SELECT
- Criar uma view `public.public_capital_providers` (WITH security_invoker=on) que exclui `webhook_url` e `contact_email`
- Adicionar policy de SELECT na view para public
- Manter a policy ALL para admins na tabela base

### 3. Realtime — Qualquer usuário pode ouvir canais de outros

**Problema:** As tabelas `notifications`, `capital_messages` e `capital_timeline` estão no Realtime sem restrição de canal.

**Solução (Migração SQL):**
- Remover `notifications`, `capital_messages` e `capital_timeline` da publication `supabase_realtime`
- O app já faz polling via React Query, então a funcionalidade não será afetada

### 4. Security Definer View — `public_listings`

**Problema:** A view `public_listings` usa SECURITY DEFINER (padrão quando não especificado), executando com as permissões do criador.

**Solução (Migração SQL):**
- Recriar a view com `WITH (security_invoker=on)`

### Arquivos Alterados

| Arquivo | Mudança |
|---|---|
| Migração SQL | Corrigir as 4 vulnerabilidades (roles, providers, realtime, view) |
| `src/contexts/AuthContext.tsx` | Passar roles via user_metadata e remover insert direto em user_roles |

