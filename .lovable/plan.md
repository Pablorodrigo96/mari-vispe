## Problema

Em `/admin/users` o menu "..." só permite **Adicionar / Remover Role** e ativar Contador Parceiro. Não existe **Editar dados** nem **Excluir usuário** — por isso o admin não consegue editar nem deletar.

## O que vou entregar

1. **Botão "Editar usuário"** no dropdown de cada linha → abre dialog com campos:
   - Nome completo
   - Telefone
   - Empresa (`company_name`)
   - Cidade / Estado
   - Salva direto em `profiles` via update (RLS de admin já permite).

2. **Botão "Excluir usuário"** no dropdown (vermelho, com confirmação dupla):
   - Remove o usuário do **Auth** + cascata em todas as tabelas de dados pessoais.
   - Como o cliente não pode chamar `auth.admin.deleteUser`, vou criar uma **edge function `admin-delete-user`** (service role) que:
     - Confere se quem chamou tem role `admin` (via `has_role`).
     - Apaga `user_roles`, `profiles`, `subscriptions`, `franchisee_requests`, `advisor_requests`, `notifications`, `mari_leads`, `interest_logs`, `buyer_profiles`, `listings` do usuário.
     - Chama `supabase.auth.admin.deleteUser(userId)`.
   - Confirmação obrigatória digitando "EXCLUIR" para evitar acidente.

3. **Proteções**:
   - Não permitir o admin se auto-excluir (compara com `auth.uid()`).
   - Toast de sucesso/erro + refresh da lista.

## Detalhes técnicos

**Arquivos alterados**
- `src/pages/admin/AdminUsers.tsx` — novos itens no `DropdownMenu`, novos `Dialog` para Editar e Confirmar Exclusão, handlers `handleEditUser`, `handleDeleteUser`.
- `supabase/functions/admin-delete-user/index.ts` (nova) — recebe `{ user_id }`, valida admin, faz cleanup + `auth.admin.deleteUser`.
- `supabase/config.toml` — registrar a função (verify_jwt default = true, queremos JWT do admin).

**Sem mudança de schema** — RLS atual já cobre updates de `profiles` por admin. Edge function usa service role para o auth delete.

Após aprovação, executo as mudanças.