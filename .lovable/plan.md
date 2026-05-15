# Bloco 0 — Inspeção do signup atual

Sem mudança de código nesta etapa. Só relatório do estado atual + GAPs, conforme o doc `PROMPT_REFORMA_SIGNUP_ROLES.md`. Confirmação sua antes de seguir para Bloco 1.

## Arquivo principal

- **`src/pages/Auth.tsx`** — 510 linhas. Single file com tabs Login/Criar Conta.
- Componente de seleção de perfil: **botões customizados (`<button>`) com state `signupRoles: UserRole[]`** — visualmente parecem cards/checkboxes, mas tecnicamente são toggles de array (multi-select). Função `toggleRole` (linha 123) adiciona/remove do array.
- Roles oferecidos (linhas 32-37): `seller` (Empreendedor), `buyer` (Comprador), `advisor` (Assessor), `franchisee` (Franqueado).

## Fluxo de submit

1. `handleSignUp` (linha 160) valida nome/telefone/email/senha e exige `signupRoles.length > 0`.
2. Chama `signUp({ email, password, fullName, phone, roles })` do `AuthContext`.
3. `AuthContext.signUp` passa `roles` no `options.data` (raw_user_meta_data).
4. **Trigger `handle_new_user`** (migration `20260504204941`) lê `raw_user_meta_data.roles` e:
   - `seller` / `buyer` → INSERT direto em `public.user_roles`.
   - `advisor` → INSERT em `public.advisor_requests` (status `pending`), **NÃO concede role**.
   - `franchisee` → INSERT em `public.franchisee_requests` (status `pending`), **NÃO concede role**.
   - Sempre cria `profiles` row com nome/telefone.
5. Redirect (`useEffect` linha 89): se admin/advisor → `/equity-brain/hoje`; senão → `/painel`.
6. Para `advisor`/`franchisee` puros sem aprovação, toast informa "aguardando aprovação", mas a sessão fica logada (sem role útil → cai no `/painel` genérico).

## Tabelas / objetos envolvidos

- `auth.users` (Supabase) — criada pelo `signUp`.
- `public.profiles` — criada pelo trigger; **tem `is_partner_accountant boolean`**.
- `public.user_roles` — `(user_id, role app_role)` enum `seller|buyer|advisor|admin|franchisee`.
- `public.advisor_requests`, `public.franchisee_requests` — fila de aprovação admin.
- Edge functions de signup: nenhuma chamada direta. Toda a lógica está no trigger SQL.

## GAPs identificados (vs. objetivo do doc)

1. **Multi-select em vez de seleção única**: `signupRoles` é array, `toggleRole` adiciona/remove → usuário pode marcar 4 perfis ao mesmo tempo.
2. **Não existe perfil "Assessor externo / contador parceiro"**: a opção `advisor` cobre tanto BDR/consultor interno quanto parceiro externo. Por isso `is_partner_accountant` **nunca é setado pelo signup** — é flag manual no banco. **Esta é a raiz do bug confirmado na auditoria.**
3. **Sem campo no signup que distinga parceiro externo de advisor interno** → impossível setar a flag automaticamente hoje.
4. **Microcopy genérica**: mesma copy/labels para qualquer perfil. Sem campos extras (CNPJ pra parceiro, região pra franqueado, ticket pra buyer).
5. **Redirect não-contextualizado por perfil escolhido**: `resolveRoleHome` só diferencia advisor/admin (`/equity-brain/hoje`) vs. resto (`/painel`). Não considera o perfil que o usuário acabou de marcar; lê do banco. Para parceiro externo, deveria ir pra `/parceiro`, mas como flag não foi setada, vai pra `/equity-brain/hoje` (advisor genérico).
6. **Sem onboarding sequencial pós-signup** (CNPJ da empresa pro empreendedor, tese pro comprador, regiões pro franqueado, etc.).

## O que vem no Bloco 1 (próximo, depende do seu OK)

- Trocar a lógica de `signupRoles: UserRole[]` por **`perfilSelecionado: TipoPerfil | null`** (radio único) — mantém visual de cards.
- Adicionar opção **"Assessor externo / contador parceiro"** separada de "Assessor interno (Vispe)" — necessária para Bloco 2 setar `is_partner_accountant` corretamente.
- Botão "Criar Conta" gated por perfil selecionado.
- Smoke test: 4 cadastros, um por perfil, validar que só 1 fica marcado.

**Pronto para Bloco 1?**

Aguardando seu "go" para começar Bloco 1. Me confirma também se a opção "Assessor externo (parceiro/contador)" deve aparecer **separada** de "Assessor/Representante" (interno), ou se prefere manter 4 perfis e adicionar uma sub-pergunta "você é parceiro externo da Vispe?" só quando "Assessor" for marcado.
