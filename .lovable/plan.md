
## Diagnóstico curto

- O que construímos (Equity Brain, 80+ buyers, BoardPage, score versions) está em **`/equity-brain/*`**, isolado do `/admin` por design. Você não viu mudança porque estava em `/admin` (marketplace público), não no cockpit interno.
- Não existe atalho do `/admin` para o `/equity-brain` → vou adicionar.
- Não existe "ver como persona X" → vou criar um **View-As switcher** (só visual, não mexe em permissões reais).
- Header e Home tratam logado e deslogado igual → vou separar com `LoggedInHomeDashboard` e Header consciente de auth.
- **Nada será removido.** Tudo é aditivo: rotas, botões e componentes existentes continuam funcionando.

---

## Bloco 1 — Tornar o Equity Brain visível e descobrível

### 1.1 Adicionar `/equity-brain/board` ao roteador
- Em `src/App.tsx`, dentro do bloco `<Route path="/equity-brain" ...>`, adicionar:
  ```tsx
  <Route path="board" element={<EBBoardPage />} />
  ```
- Importar `BoardPage` (já existe em `src/pages/equity-brain/BoardPage.tsx`).

### 1.2 Adicionar item "Board" na sidebar do Equity Brain
- Em `src/components/equity-brain/EBSidebar.tsx`, incluir entrada "Board Executivo" com ícone `LayoutDashboard` e rota `/equity-brain/board`.

### 1.3 Adicionar atalho do `/admin` para o cockpit interno
- Em `src/components/admin/AdminSidebar.tsx`, adicionar um bloco visualmente separado no rodapé do menu:
  - Título: "Cockpit Interno"
  - Links (visíveis somente para admin/advisor):
    - **Equity Brain →** `/equity-brain`
    - **Board Executivo →** `/equity-brain/board`
    - **Buyers (Compradores M&A) →** `/equity-brain/buyers`
- Usar `useUserRoles` para condicional. Estilo: borda superior + ícone `Sparkles` para destacar.

### 1.4 Card destaque no `AdminDashboard`
- Em `src/pages/admin/AdminDashboard.tsx`, adicionar acima do grid de stats um banner-card chamado **"Equity Brain — Cockpit M&A Vispe"** mostrando 3 KPIs rápidos do schema `equity_brain` (companies, buyers ativos, opportunities tier S+A) + botão "Abrir Cockpit".
- Usar `supabase.from('equity_brain.buyers').select('count', { count: 'exact' })` etc.
- Visível apenas se `isAdmin || isAdvisor`.

---

## Bloco 2 — View-As (Visualizar como persona)

### 2.1 Novo contexto `ViewAsContext`
- Criar `src/contexts/ViewAsContext.tsx` com:
  - `viewAs: 'real' | 'admin' | 'head_parcerias' | 'bdr' | 'parceiro' | 'franqueado' | 'consultor' | 'seller' | 'buyer'`
  - `setViewAs(role)`, `resetViewAs()`
  - Persistência em `localStorage` (key `pmeb3.view_as`)
  - **Apenas usuários com role real `admin` podem alterar `viewAs`.** Demais usuários ficam travados em `'real'`.
- Embrulhar `<App>` em `<ViewAsProvider>` em `src/App.tsx`, dentro de `<AuthProvider>`.

### 2.2 Hook `useEffectiveRoles`
- Criar `src/hooks/useEffectiveRoles.ts` que combina `useUserRoles` + `ViewAsContext`:
  - Se `viewAs === 'real'`, retorna roles reais.
  - Senão, retorna um set "fake" derivado da persona (ex.: `bdr` → `['advisor']`; `parceiro` → `['advisor']` + `isPartnerAccountant=true`; `franqueado` → `['franchisee']`; `head_parcerias` → `['admin']` com flag UI).
- **Importante:** este hook é só para **renderização de UI**. RLS no Supabase continua usando role real, então não há risco de escalonamento. Se um admin "vendo como buyer" tentar acessar `/admin/users`, o RLS o deixa passar (ele é admin de fato), mas a UI esconde o item — comportamento desejado para QA visual.

### 2.3 Componente `ViewAsSwitcher`
- Criar `src/components/layout/ViewAsSwitcher.tsx`: um `DropdownMenu` no Header (ao lado do avatar) que aparece **somente para admin real**.
- Opções: "Visão Real (Admin)", "Como Head de Parcerias", "Como BDR", "Como Parceiro Contábil", "Como Franqueado", "Como Consultor", "Como Vendedor", "Como Comprador".
- Ao trocar, mostra um banner fino fixo no topo: `🔄 Visualizando como [persona] — Voltar à visão real` (botão).

### 2.4 Adaptar consumidores existentes
- `Header.tsx`, `AdminSidebar.tsx`, `EBSidebar.tsx`, `Footer.tsx` (e onde `useUserRoles` é chamado para condicional de UI) passam a usar `useEffectiveRoles` em vez de `useUserRoles` direto.
- `RequireRole` e `AdminRoute` continuam usando `useUserRoles` (real) — nunca quebrar segurança.

---

## Bloco 3 — Separar visão logado vs deslogado

### 3.1 Header consciente de auth
- Em `src/components/layout/Header.tsx`:
  - Botão **"Anunciar Grátis"** só aparece se `!user` (visitante). Para logado, substituir por **"Meu Painel"** apontando para `/painel` (rota nova, ver 3.2).
  - Mostrar `ViewAsSwitcher` ao lado do avatar quando admin real.
  - Mobile menu: mesma lógica (esconder "Anunciar Grátis" para logado, mostrar "Meu Painel").

### 3.2 Nova rota `/painel` — Home pessoal pós-login
- Criar `src/pages/Painel.tsx`: dashboard pessoal que **substitui** a `Index` quando o usuário está logado e digita `/`.
- Em `src/pages/Index.tsx`: adicionar no topo:
  ```tsx
  if (!loading && user) return <Navigate to="/painel" replace />;
  ```
  (Importar `useAuth` e `Navigate`.)
- Conteúdo do `Painel.tsx`:
  - **Saudação personalizada** ("Olá, {full_name}") + chip com roles efetivas.
  - **Cards de ação rápida** filtrados por role efetiva:
    - Vendedor → "Meus Anúncios", "Cadastrar Empresa", "Ver Matches"
    - Comprador → "Marketplace", "Cadastrar Comprador", "Captação"
    - Consultor/Parceiro → "Potencial da Carteira", "Painel do Parceiro"
    - Franqueado → "Leads na minha região"
    - Admin → "Painel Admin", "Equity Brain", "Board Executivo"
  - **Atividade recente** do usuário: últimos valuations, último anúncio criado, última notificação.
  - **CTA secundário discreto** "Quer anunciar mais uma empresa? →" (mantém o fluxo de venda, sem o banner agressivo de visitante).
- Reaproveitar componentes existentes (`Card`, `StatsCard`, `NotificationDropdown` resumido).

### 3.3 Marketplace e demais páginas públicas continuam abertas a logados
- `/marketplace`, `/valuation`, `/capital`, `/anuncio/:id` permanecem idênticos — usuário logado pode navegar livremente. A separação é só em `/` (home) e nos CTAs do Header.

### 3.4 Footer
- Adicionar bloco condicional no Footer que, se logado, mostra link para `/painel` em vez de "Criar conta".

---

## Bloco 4 — Verificações finais

- Testar fluxo: logout → `/` mostra landing pública com "Anunciar Grátis"; login → `/` redireciona para `/painel` que mostra dashboard pessoal.
- Como admin: menu de avatar tem **"Painel Admin"** + **"Equity Brain"** + switcher "Visualizar como…".
- "Visualizar como BDR" → sidebar do admin esconde itens não-BDR; voltar à visão real → tudo retorna.
- Confirmar que nenhuma rota foi removida e que `RequireRole(['admin','advisor'])` continua barrando o `/equity-brain` por role real.

---

## Arquivos que serão criados

- `src/contexts/ViewAsContext.tsx`
- `src/hooks/useEffectiveRoles.ts`
- `src/components/layout/ViewAsSwitcher.tsx`
- `src/pages/Painel.tsx`

## Arquivos que serão editados (sem remover funcionalidades)

- `src/App.tsx` — provider + rota `/painel` + rota `/equity-brain/board`
- `src/components/layout/Header.tsx` — CTA condicional + switcher
- `src/components/layout/Footer.tsx` — link condicional para painel
- `src/components/admin/AdminSidebar.tsx` — bloco "Cockpit Interno"
- `src/components/equity-brain/EBSidebar.tsx` — item Board
- `src/pages/admin/AdminDashboard.tsx` — banner Equity Brain
- `src/pages/Index.tsx` — redirect logado → `/painel`

---

## Riscos e mitigações

- **Risco:** quebrar segurança ao introduzir View-As. **Mitigação:** RLS continua usando `auth.uid()` real; View-As muda apenas UI. `RequireRole` e `AdminRoute` ignoram `viewAs`.
- **Risco:** usuário logado perder acesso à landing pública. **Mitigação:** rota `/sobre` ou link "Ver como visitante" no menu (incluso como bônus no switcher: opção "Sair temporariamente do painel").
- **Risco:** Painel.tsx ficar pesado. **Mitigação:** queries com `useQuery` e `enabled: !!user`, sem chamar nada antes do auth carregar.
