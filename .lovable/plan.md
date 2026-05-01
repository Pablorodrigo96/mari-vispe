## Plano — Corrigir tela branca em `/admin`

### Diagnóstico revisado

Após reler o código, **NÃO há sidebar duplicada**. As rotas `/admin/*` em `App.tsx` estão envolvidas apenas em `<RequireRole roles={["admin"]}>` (não em `<AppShell>`), e cada página admin se auto-envolve em `<AdminRoute><AdminLayout>`. Estrutura consistente entre todas as 11 páginas.

A tela branca, portanto, **não é causada por wrappers conflitantes**. Causas prováveis (em ordem):

1. **`RequireRole` + `AdminRoute` em série** podem estar travando em `loading` se o hook de roles dispara duas vezes. Se um deles redireciona para `/` antes do outro resolver, o usuário pode ver flash branco.
2. **Erro runtime silencioso** em alguma página admin (ex.: query Supabase quebrada, import faltante após migrações recentes da Fase 3).
3. **`useEffectiveRoles` vs `useUserRoles`**: AdminSidebar usa `useEffectiveRoles`, AdminRoute usa `useUserRoles`. Se divergirem, sidebar renderiza mas conteúdo redireciona.

### Etapas de correção

**Etapa 1 — Instrumentar para confirmar causa real**
- Adicionar `console.log` temporários em `AdminRoute` (`user`, `isAdmin`, `loading`) e `RequireRole` para ver no replay qual guard está bloqueando.
- Adicionar `ErrorBoundary` envolvendo `<main>` em `AdminLayout` para capturar runtime errors e exibir mensagem em vez de tela branca.

**Etapa 2 — Unificar guards (remover redundância sem mudar layout)**
- Remover `<AdminRoute>` interno de cada uma das 11 páginas admin (já existe `<RequireRole roles={["admin"]}>` em `App.tsx`).
- **Manter** `<AdminLayout>` em todas (ele fornece a sidebar admin específica — sem ele, sidebar some).
- Padronizar `useUserRoles` ↔ `useEffectiveRoles` (ambos consultam `user_roles`, mas `useEffectiveRoles` tem suporte a impersonation).

**Etapa 3 — Verificar import quebrado**
- Rodar busca por imports de tabelas/colunas recém-criadas na Fase 3 (`whatsapp_messages`, `advisor_whatsapp_config`) que possam ter typo no `AdminWhatsAppMonitor` ou `AdminDashboard`.

**Etapa 4 — Validar**
- Acessar `/admin`, `/admin/users`, `/admin/whatsapp-monitor`, `/admin/crm` em sequência.
- Confirmar sidebar admin renderizando + conteúdo carregando.
- Remover `console.log` temporários.

### Arquivos afetados

- `src/components/admin/AdminLayout.tsx` — adicionar ErrorBoundary
- `src/components/admin/AdminRoute.tsx` — adicionar logs (depois remover)
- `src/pages/admin/AdminDashboard.tsx`
- `src/pages/admin/AdminUsers.tsx`
- `src/pages/admin/AdminListings.tsx`
- `src/pages/admin/AdminSubscriptions.tsx`
- `src/pages/admin/AdminValuations.tsx`
- `src/pages/admin/AdminCapital.tsx`
- `src/pages/admin/AdminCapitalProviders.tsx`
- `src/pages/admin/AdminCRM.tsx`
- `src/pages/admin/AdvisorWhatsAppSetup.tsx`
- `src/pages/admin/AdminWhatsAppMonitor.tsx`

(remover `<AdminRoute>` wrap de cada uma)

### Riscos e mitigações

- **Risco**: usuário admin sem role correto perde acesso. **Mitigação**: `RequireRole` em `App.tsx` cobre exatamente o mesmo cheque.
- **Risco**: ErrorBoundary mascarar erro real. **Mitigação**: ele exibe a mensagem do erro + stack na própria tela.

### Fora de escopo

- Refatorar `AdminLayout` para usar `AppShell` global (mudaria UX da área admin — pode ser próxima iteração).
- Corrigir warnings de `forwardRef` em `MariBrandStamp` / `Toaster` (cosmético, sem impacto).

Aprova?