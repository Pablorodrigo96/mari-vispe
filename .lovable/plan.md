
# Restaurar Fluxos de Parceria + Pool Compartilhado de Oportunidades

## Diagnóstico (resumo)
A lógica de **Sérgio (Head de Parcerias)** e do **Contador Parceiro** **não foi perdida** — `AdminPartnerships.tsx` (3 abas: Visão Geral / Reservas / VDR), `PartnerDashboard.tsx`, `VDRUploader`, `ReservationCountdown`, todos os triggers (`auto_create_partner_reservation`, `qualify_reservation_on_vdr`, `update_listing_vdr_readiness`, `expire_old_reservations`) continuam ativos no banco.

O que **realmente quebrou** com a refatoração da App Shell:

1. `/parceiro` está dentro do `<AppShell>` mas a página ainda renderiza `PublicChrome` + `PublicFooter` + `pt-32` → visual quebrado (título atrás do topbar, footer público no meio do app SaaS).
2. `/admin/parcerias` ficou **fora** do `<AppShell>` (usa o `AdminLayout` antigo) → ao clicar a sidebar lateral some e o head de parcerias perde a navegação.
3. Nenhuma rota `/admin/*` tem mais o guarda `RequireRole` / `AdminRoute` — qualquer usuário logado abre.
4. O **Pool Compartilhado de Oportunidades** (regra que você descreveu: "todos os parceiros, franqueados, BDRs veem o teaser básico de qualquer empresa cadastrada por outro, para fazer match porta-de-entrada × porta-de-saída") **nunca foi implementado** como aba dedicada — hoje cada parceiro só vê os leads que ele mesmo cadastrou.

---

## Etapa 1 — Reintegrar `/parceiro` à App Shell (visual)

**Arquivo:** `src/pages/PartnerDashboard.tsx`

- Remover `import PublicChrome` / `PublicFooter` e suas tags (já estamos no AppShell, ele dá o chrome).
- Trocar `min-h-screen bg-background` → wrapper limpo com `p-6` (padrão das demais páginas dentro do shell).
- Remover `pt-28` / `pt-32` (topbar do shell já reserva o espaço).
- Manter o bloco "Acesso restrito" mas usando o card de empty-state padrão do app (sem header/footer público).

Resultado: o painel do contador respeita a sidebar/topbar persistente.

---

## Etapa 2 — Trazer `/admin/parcerias` (Sérgio) para a App Shell

**Arquivos:** `src/App.tsx`, `src/pages/admin/AdminPartnerships.tsx`

- No `App.tsx`, mover `/admin/parcerias` (e demais `/admin/*`) para **dentro** do bloco `<Route element={<AppShell />}>`, envolvidas por `<RequireRole roles={["admin"]}>` (que já existe).
- Em `AdminPartnerships.tsx`, substituir `<AdminLayout>` por um wrapper neutro `<div className="p-6 space-y-6">` (a sidebar do AppShell já cobre a navegação).
- O `AdminSidebar` antigo continua útil só para os outros admins legados — vamos **adicionar um link "Parcerias"** no grupo "Cockpit Interno" do `AppSidebar.tsx` para admins, e um atalho contextual visível só quando `isHeadParcerias === true` (persona "Head de Parcerias" via View-As).

Resultado: Sérgio mantém a sidebar persistente do app, com seu link "Parcerias" sempre acessível, e as 3 abas continuam funcionando inalteradas (todo o JSX de Visão Geral / Reservas / VDR é preservado).

---

## Etapa 3 — Restaurar guarda de admin nas rotas `/admin/*`

**Arquivo:** `src/App.tsx`

Envolver cada `<Route path="/admin/...">` com `<RequireRole roles={["admin"]}>` (componente já existe em `src/components/auth/RequireRole.tsx`). Sem isso, qualquer usuário logado bate na URL e abre o painel — regressão de segurança herdada da refatoração.

---

## Etapa 4 — Pool Compartilhado de Oportunidades (a regra de negócio nova que você descreveu)

> "Todas oportunidades cadastradas por contadores/parceiros/franqueados/BDRs vão para um banco único, onde os demais veem informações básicas do teaser e podem executar o match. Quem cadastrou ganha pela porta de entrada; quem dá match ganha pela porta de saída."

### 4.1 Backend (migration)

A view `public.public_listings` (security_invoker) **já existe** e já filtra os campos sensíveis (oculta CNPJ, user_id, CEP). Vamos:

- **Criar** `public.partner_opportunity_pool` (view) que estende `public_listings` com:
  - `originator_type` (`partner_accountant` / `franchisee` / `advisor` / `bdr` / `direct_seller`) calculado a partir de `profiles.is_partner_accountant` + `user_roles`
  - `reservation_status` (`reserved` / `exclusive` / `expired` / `available`) — vindo de `partner_lead_reservations`
  - `is_my_lead` (booleano: o usuário corrente é o originador?)
  - **Sem expor o nome ou contato do originador** (privacidade) — só um identificador anonimizado e o tipo.
- **Criar tabela** `partner_opportunity_interests`:
  - Colunas: `id`, `listing_id`, `interested_user_id` (quem viu e marcou interesse de match), `originator_user_id` (cadastrante original), `commission_split` (`50_50` por padrão), `status` (`expressed` / `accepted` / `closed`), `created_at`.
  - RLS: originador vê os interesses no seu lead; usuário interessado vê os próprios; admin vê todos.
  - Trigger: ao criar interesse → notifica o originador ("Outro parceiro quer matchar um comprador da carteira dele com seu lead — split 50/50").

### 4.2 Front-end — nova aba no `PartnerDashboard`

`src/pages/PartnerDashboard.tsx` ganha um `<Tabs>` com 2 abas:

- **"Meus Leads Reservados"** (o que já existe hoje, intacto).
- **"Pool de Oportunidades"** (nova) — lista de cards anônimos com:
  - Categoria, faixa de receita anual, faixa de preço, cidade/UF, `vdr_readiness` (% de prontidão)
  - Badge de tipo de originador
  - Botão **"Tenho comprador para esse lead"** → abre modal pedindo confirmação (descreve a regra de comissão dividida 50/50) → cria registro em `partner_opportunity_interests` e dispara notificação ao originador.

A mesma aba aparece também para:
- Franqueados em `/painel` (widget rápido + link "Ver pool completo")
- Advisors / BDRs (mesma rota `/parceiro` ou `/oportunidades-pool`)

### 4.3 Lado do originador

No card "Meus Leads Reservados" (existente), passa a aparecer um **badge "🔥 N parceiros interessados"** quando há linhas em `partner_opportunity_interests`. Clicar abre modal listando os interessados (anonimizados: "Parceiro contador em SP", "BDR interno") com botões **Aceitar match** / **Recusar**.

---

## Etapa 5 — Documentar memória do projeto

Atualizar `mem://features/partner-accountant-hub` com a regra do pool compartilhado e do split 50/50, e adicionar `mem://features/shared-opportunity-pool` indexado.

---

## Arquivos que serão tocados

**Editados**
- `src/App.tsx` — mover `/admin/parcerias` (e demais admin) para dentro do AppShell + RequireRole
- `src/pages/PartnerDashboard.tsx` — remover PublicChrome/Footer + adicionar Tabs (Meus Leads / Pool)
- `src/pages/admin/AdminPartnerships.tsx` — trocar `<AdminLayout>` por wrapper limpo
- `src/components/layout/AppSidebar.tsx` — adicionar link "Parcerias" para admin/head_parcerias
- `mem://features/partner-accountant-hub` + `mem://index.md`

**Criados**
- `supabase/migrations/<ts>_partner_opportunity_pool.sql` — view do pool + tabela `partner_opportunity_interests` + RLS + trigger de notificação
- `src/components/partner/SharedOpportunityCard.tsx` — card anônimo do pool
- `src/components/partner/InterestModal.tsx` — modal "Tenho comprador para esse lead"
- `src/components/partner/InterestedPartnersBadge.tsx` — badge "🔥 N interessados" no card do originador
- `mem://features/shared-opportunity-pool`

**Não tocados (preservados como estão)**
- `src/components/partner/VDRUploader.tsx`
- `src/components/partner/ReservationCountdown.tsx`
- Todos os triggers de `partner_lead_reservations` e `vdr_documents`
- `src/components/admin/AdminSidebar.tsx` (continua para retrocompatibilidade)

---

## Critérios de aceite

1. Sérgio em `/admin/parcerias` vê a **sidebar do AppShell** persistente, com o item "Parcerias" destacado, e as 3 abas (Visão Geral / Reservas / VDR) renderizam idênticas ao especificado no fluxo original.
2. Contador Parceiro em `/parceiro` vê a mesma sidebar, sem header/footer público duplicado, e tem 2 abas: "Meus Leads" e "Pool de Oportunidades".
3. Tentar acessar `/admin/parcerias` sem ser admin → redireciona para `/`.
4. Qualquer parceiro/franqueado/BDR vê no Pool todos os teasers anonimizados de leads de outros, com `vdr_readiness`, faixa de receita e botão de interesse.
5. Originador recebe notificação em tempo real ao surgir interessado no seu lead.
6. Triggers existentes (reserva 45d, qualificação por VDR, expiração) continuam disparando — nenhuma regression.
