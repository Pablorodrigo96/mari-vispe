
## Diagnóstico

Hoje, mesmo após login, o usuário vê:
- **O mesmo `<Header />` público** com "Comprar Empresa / Vender Empresa / Valuation / Investidores / Captação / Matching" — idêntico a um visitante.
- O CTA dourado "**Anunciar Grátis**" continua visível (só some quando o admin troca para outra persona) — para o usuário comum logado, o componente atualmente mostra `Meu Painel`, mas o resto do header é igual ao público.
- O `/painel` usa esse mesmo header público e renderiza apenas três cards de contadores + grid de ações pequenas. Não parece um software, parece uma landing page autenticada.
- Não existe um "app shell" (sidebar + topbar + breadcrumb + área de conteúdo) próprio do usuário final como já existe para `/admin` e `/equity-brain`.

A visão de visitante e a de logado precisam ser **dois produtos visuais distintos**:
- **Visitante** = site institucional/marketing (mantém-se intacto).
- **Logado** = plataforma SaaS (sidebar à esquerda, topbar enxuta, módulos em boxes, contexto da conta sempre visível).

---

## O que será feito (sem remover nada que já funciona)

### 1. Criar um App Shell para usuários logados — `AppShell`

Novo componente `src/components/layout/AppShell.tsx` que envolve **todas as rotas privadas do usuário final** (não-admin, não-equity-brain). Estrutura:

- **Sidebar fixa à esquerda** (`AppSidebar`, baseada em `@/components/ui/sidebar` com `collapsible="icon"`):
  - **Visão geral** → `/painel`
  - **Marketplace** (sub-itens: Buscar empresas, Mapa)
  - **Vender** (sub-itens: Meus Anúncios, Anunciar Empresa, Bulk Upload se elegível)
  - **Comprar** (sub-itens: Cadastrar Comprador, Matching, Resultados)
  - **Valuation** (sub-itens: Novo Valuation, Meus Valuations, Múltiplos, DCF, Certificador)
  - **Capital** (sub-itens: Solicitar, Minhas Captações)
  - **Parcerias** (visível só para advisor/parceiro: Potencial da Carteira, Painel do Parceiro)
  - **Cockpit Interno** (visível só para admin/advisor: Equity Brain, Admin)
  - Rodapé da sidebar: avatar + nome + e-mail + botão "Sair"
- **Topbar** enxuta (`AppTopbar`):
  - `SidebarTrigger` à esquerda
  - Breadcrumb dinâmico baseado na rota
  - Busca rápida global (input com `Cmd+K` futuro — placeholder agora)
  - `NotificationDropdown` (já existe)
  - `ViewAsSwitcher` (apenas para admin real)
  - Avatar com dropdown reduzido (Meu Perfil, Configurações, Sair)
- **Área de conteúdo** com padding consistente e `bg-muted/20`.

Memória `mem://style/dark-mode-contrast-standards` e `mem://constraints/published-vs-preview-url` permanecem respeitadas.

### 2. Refatorar `/painel` (`Painel.tsx`) como dashboard de software real

Substituir o layout atual por uma estrutura em **boxes/widgets** dentro do `AppShell`:

- **Hero compacto**: saudação + chips de papel + barra de progresso "Complete seu perfil" (se faltar dado).
- **KPIs em 4 cards** (não 3): Anúncios ativos, Valuations, Captações, Visualizações 30d.
- **Grid 2×2 de "módulos"** (boxes grandes, com ícone, descrição e CTA primário):
  - **Marketplace & Mapa** — buscar empresas
  - **Vender uma empresa** — wizard novo + atalho para Meus Anúncios
  - **Avaliar uma empresa** — Valuation, atalhos para múltiplos/DCF/certificador
  - **Captar capital** — solicitar funding + minhas captações
- **Seção "Para o seu perfil"**: boxes condicionais por papel (advisor/partner → Potencial da Carteira; franchisee → Mapa de Leads; admin/advisor → Equity Brain destaque).
- **Atividade recente** (últimas notificações, últimos anúncios, últimas captações) em uma coluna lateral.
- **Onboarding card**: passos pendentes (cadastrar comprador, completar perfil, anunciar primeira empresa).

### 3. Tornar o `<Header />` público **estritamente público**

Modificar `src/components/layout/Header.tsx`:
- Quando `user && !simulateLoggedOut` → o componente **retorna `null`** (não renderiza nada). O usuário logado nunca verá esse header de marketing.
- Páginas privadas usarão o `AppShell` (com seu próprio topbar). Páginas públicas (Index, Marketplace público, Valuation público, Capital, Investors, Auth, Terms, BlindTeaser) continuam com o `<Header />` público — mas, como elas redirecionam logados, o impacto é nulo.
- Mantemos o caminho de impersonação: admin em `viewAs='visitante'` continua vendo o header público (necessário para QA).

### 4. Aplicar o `AppShell` às rotas privadas do usuário final

No `src/App.tsx`, agrupar as seguintes rotas dentro de uma rota pai com `AppShell` (mantendo todas as URLs e componentes existentes — apenas adicionando o wrapper de layout):

- `/painel`
- `/meus-anuncios`, `/editar-anuncio/:id`
- `/meu-perfil`
- `/meus-valuations`
- `/cadastrar-comprador`
- `/minhas-captacoes`, `/minhas-captacoes/:id`
- `/matching`, `/matching/resultados`
- `/potencial-carteira`
- `/parceiro`
- `/matching-compradores/:listingId`

As rotas públicas (`/`, `/marketplace`, `/mapa`, `/vender`, `/valuation*`, `/investors`, `/capital*`, `/auth`, `/terms`, `/teaser/:ticker`, `/anuncio/:id`, `/payment-success`) **permanecem como estão** e continuam usando o `<Header />` público — mas internamente, se o usuário estiver logado e acessar `/marketplace`, `/valuation` etc., elas vão renderizar **dentro do `AppShell`** automaticamente (ver item 5).

### 5. Páginas "duplas" (públicas + autenticadas)

`/marketplace`, `/mapa`, `/valuation`, `/vender`, `/capital`, `/investors` são acessíveis tanto a visitantes quanto a logados. Para esses casos:

- Criar um wrapper leve `PublicOrShell` que decide em runtime: se há `user && !simulateLoggedOut`, envolve o conteúdo no `AppShell` e remove o `<Header />` público interno; caso contrário, renderiza igual a hoje.
- Para minimizar refactor, alterar cada uma dessas páginas para **não importar `<Header />` diretamente** e sim usar `<PageChrome>` (novo componente de 1 linha) que aplica o header certo conforme contexto. As páginas continuam funcionando para visitantes exatamente como hoje.

### 6. Remover CTAs de visitante quando logado

- `<Header />` (público) deixa de ser renderizado para logados (item 3).
- `Index.tsx` — sem alteração (já redireciona).
- `Footer.tsx` — manter, mas no `AppShell` o footer não aparece (padrão SaaS); fica apenas nas páginas públicas.
- Em páginas de marketing (`/valuation`, `/capital`, `/investors`) acessadas por logados, o conteúdo continua disponível (não excluímos nada), mas os CTAs "Anunciar Grátis / Cadastre-se / Entrar" são suprimidos via `useAuth()` — substituídos por CTAs contextuais ("Avaliar agora", "Solicitar captação", "Falar com consultor").

### 7. ViewAsSwitcher e RequireRole continuam funcionando

- O switcher migra do `<Header />` público para o `AppTopbar` (somente admin real vê).
- `viewAs='visitante'` força o usuário a ver o `<Header />` público + landing pages, exatamente como hoje (caminho de QA preservado).
- Nada muda em `RequireRole`, `AdminRoute`, RLS ou edge functions.

---

## Arquivos a criar
- `src/components/layout/AppShell.tsx`
- `src/components/layout/AppSidebar.tsx`
- `src/components/layout/AppTopbar.tsx`
- `src/components/layout/PageChrome.tsx`
- `src/components/painel/PainelHero.tsx`
- `src/components/painel/PainelKPIs.tsx`
- `src/components/painel/PainelModules.tsx` (boxes grandes 2×2)
- `src/components/painel/PainelActivity.tsx`
- `src/components/painel/PainelOnboarding.tsx`

## Arquivos a editar
- `src/App.tsx` — agrupar rotas privadas dentro do `AppShell`.
- `src/components/layout/Header.tsx` — retornar `null` para usuário logado (exceto persona "visitante").
- `src/pages/Painel.tsx` — refatorar para usar os novos widgets dentro do `AppShell`.
- `src/pages/Marketplace.tsx`, `MapView.tsx`, `Valuation.tsx`, `ValuationMultiplos.tsx`, `ValuationDCF.tsx`, `ValuationCertifier.tsx`, `Vender.tsx`, `Sell.tsx`, `Capital.tsx`, `Investors.tsx`, `ListingDetail.tsx` — trocar `<Header />` por `<PageChrome />` para que sejam embutidas no `AppShell` quando o usuário estiver logado.
- `mem://index.md` — adicionar referência à nova memória abaixo.

## Memória a salvar
- `mem://features/logged-in-app-shell` — descreve a separação visitante vs logado, o `AppShell` com sidebar + topbar e a regra de o `<Header />` público não renderizar para logados (exceto persona "visitante").

## Garantias
- **Nada é removido**: todas as rotas, edge functions, RLS, planos, paywalls, wizards, valuations e fluxos continuam idênticos.
- **Apenas dinâmica de página, layout, design e estrutura mudam**, conforme pedido.
- O caminho de impersonação `viewAs='visitante'` continua permitindo que admins testem a UX pública.
- Mobile: a sidebar usa `collapsible="offcanvas"` no breakpoint `md` (já é padrão do `@/components/ui/sidebar`), com `SidebarTrigger` sempre visível no topbar.
