
## Objetivo

Criar uma **segunda porta de entrada** do projeto, na rota `/investir`, com cara de corretora/marketplace de ativos privados tokenizados (inspirada em XP, Bee4, Portfel, Genial, MaisRetorno, Investidores.vc), **sem tocar na home atual `/` nem no app logado existente**. Mesmo banco, mesma identidade mari (Carbon #0A0A0A · Volt #D9F564 · Bone · Graphite), mas composição/densidade nova de plataforma regulada.

Esta é a **Fase 1** do brief completo. Fases 2–4 (mercado secundário real, matching engine, custódia on-chain, AML, painel regulatório) ficam planejadas mas **não entram nesta entrega**.

## O que entra na Fase 1

### A. Landing pública `/investir`
- Hero institucional escuro (Carbon + Volt) com headline:
  - **"Invista em empresas privadas tokenizadas"**
  - Sub: "Acesse ativos digitais lastreados em empresas reais, participe de ofertas selecionadas e acompanhe sua carteira em uma plataforma regulada, segura e transparente."
  - CTAs: `Explorar empresas` · `Criar conta de investidor` · (secundário) `Como funciona`
- Faixa de números (estilo Bee4/XP): ofertas ativas, empresas listadas, setores cobertos, ticket mínimo médio.
- Grid de **ofertas em destaque** (cards densos com setor, ticket mínimo, prazo, % captado, status) — vem de `listings` filtradas por `is_tokenizable=true`.
- Seção "Como funciona em 4 passos" (Cadastro → KYC/Suitability → Reserva → Liquidação).
- Faixa de educação/risco (obrigatória regulatória, copy do brief).
- Footer institucional com disclaimers regulatórios completos.

### B. Listagem `/investir/empresas`
Inspirada em XP "lista de ações" + Genial + MaisRetorno:
- Tabela densa filtrável: empresa, setor, instrumento, ticket mínimo, preço/token, % captado, status, prazo, risco.
- Filtros laterais: setor, instrumento (equity/dívida/CIC/recebível), faixa de ticket, status, risco, liquidez esperada.
- Toggle grid/lista. Busca por nome/CNPJ. Ordenação.
- Reaproveita `listings` + nova flag/colunas de tokenização.

### C. Página do ativo `/investir/empresa/:slug` (ou `/ativo/:symbol`)
Estilo MaisRetorno + Portfel:
- Header com nome, código do token, badge de status, preço, variação, ticket mínimo.
- Abas: Visão geral · Oferta · Empresa · Documentos · Riscos · Histórico.
- Bloco "Resumo da oferta" (volume, preço/token, % captado, prazo, mínimo, instrumento jurídico).
- Bloco "Direitos econômicos" e "Restrições de elegibilidade".
- Documentos vinculados (com hash mostrado, mesmo que custódia/blockchain só venham na Fase 2).
- CTA fixo lateral: **Reservar / Investir**.

### D. Auth + Onboarding do investidor
- Rota `/investir/auth` separada visualmente (mas usa o mesmo Supabase Auth atual). Após login redireciona para `/investir/painel`.
- Novo role `investor` em `app_role` (sem aprovação admin, auto-grant no signup pela porta /investir).
- Onboarding obrigatório antes de reservar:
  1. **KYC**: dados pessoais, CPF, RG/CNH (upload), comprovante de residência, selfie.
  2. **Suitability**: questionário de perfil (conservador/moderado/agressivo/qualificado/profissional).
  3. **Aceite de termos**: termo de risco, termo de adesão, política de privacidade — versionados.
- Status KYC: `pending | in_review | approved | rejected | expired`. Aprovação manual no admin (sem provedor externo nesta fase).

### E. Wallet financeira interna
- Página `/investir/carteira`:
  - Saldo disponível · Saldo bloqueado (em reserva) · Saldo em liquidação.
  - Botão **Depositar** (Pix via Stripe ou Stripe Checkout) e **Sacar** (manual/admin nesta fase).
  - Extrato (financial_ledger).
- Toda movimentação gera linha em `financial_ledger` com saldo before/after.

### F. Reserva em oferta primária
- Botão "Reservar" na página do ativo abre modal:
  - Valida: KYC aprovado, suitability compatível, saldo suficiente, ativo `status=primary_open`, ticket ≥ mínimo, dentro de limites.
  - Bloqueia saldo (`available → blocked`).
  - Cria `primary_reservation` com status `pending_payment | confirmed | allocated | refunded | cancelled`.
- Liquidação primária simplificada (Fase 1): admin confirma alocação → cria `token_positions` para o investidor → debita `blocked` → credita `token_positions.quantity`. **Sem on-chain real** — registra `wallet_address=null`, `custody_type=platform_custodial`.

### G. Painel do investidor `/investir/painel`
- Visão da carteira tokenizada: lista de posições (token, empresa, qtd, preço médio, valor investido, último preço de referência, P&L estimado).
- Reservas em andamento.
- Próximos eventos (placeholder vazio para Fase 2).
- Cards de KPI no topo (patrimônio total, posições, ofertas reservadas).

### H. Admin mínimo `/admin/tokenizacao`
- Listar `listings` e marcar como tokenizável + preencher campos do token (symbol, name, total_supply, initial_price, instrument, rights, status).
- Aprovar/rejeitar KYCs.
- Confirmar alocações de reserva primária.
- Tudo restrito a `admin` (já existe).

## O que NÃO entra (fica planejado para Fases 2–4)

- Mercado secundário `/negociar`, book de ordens, matching engine, trades, settlements automáticos.
- Custódia on-chain real, smart contracts, wallets cripto, transações on-chain.
- AML engine, alertas automáticos, compliance rules engine multi-camada.
- Eventos corporativos (dividendos, splits, recompras).
- Painel regulatório completo com exports CSV/PDF e relatórios CVM.
- Integração de KYC com provedor externo (Unico, Idwall, etc).

## Identidade visual

- **Cores**: mantém Carbon `#0A0A0A`, Volt `#D9F564`, Graphite `#2A2A2A`, Bone `#FAFAF7` (tokens já existentes).
- **Composição nova**: densidade tipo terminal financeiro (tabelas densas, números tabulares, monoespaçada para preço/código de token), mas hero amplo e editorial (estilo Portfel/Bee4).
- **Tipografia**: continua a do mari, com variante tabular para dados (`font-variant-numeric: tabular-nums`).
- **Header próprio** `/investir/*` (não usa AppShell nem Header público atual) — minimalista escuro com nav: Empresas · Mercado · Como funciona · Riscos · Entrar.
- **Disclaimer bar** fixa no rodapé de toda área `/investir`.

## Detalhes técnicos

### Rotas (React Router, novas — `/` segue intacta)
```
/investir                       → InvestirHome
/investir/empresas              → InvestirListagem
/investir/empresa/:slug         → InvestirAtivo
/investir/auth                  → InvestirAuth (login/signup com role=investor)
/investir/onboarding/kyc        → InvestirKYC
/investir/onboarding/suitability→ InvestirSuitability
/investir/painel                → InvestirDashboard
/investir/carteira              → InvestirWallet
/investir/reservas              → InvestirReservas
/admin/tokenizacao              → AdminTokenizacao (admin-only)
```

Layout próprio `InvestirShell` (header + footer regulatórios) envolvendo tudo sob `/investir/*`.

### Migrações (todas com GRANTs + RLS + triggers updated_at)

**Estende `app_role`**: adicionar valor `'investor'`.

**`tokens`** (1:1 com `listings` tokenizáveis):
`id, listing_id (FK), symbol, name, instrument_type, total_supply, circulating_supply, initial_price, current_reference_price, min_ticket, total_offering_amount, economic_rights, political_rights, transfer_rules, eligibility_restrictions, blockchain_network (nullable), smart_contract_address (nullable), token_standard (nullable), status (enum: structuring|legal_review|approved|issued|primary_open|primary_closed|secondary_open|suspended|closed), issued_at, created_at, updated_at`.

Adicionar a `listings`: `is_tokenizable boolean default false`.

**`investor_kyc`**: `id, user_id, status, cpf, full_name, birth_date, address jsonb, documents jsonb (urls + hashes), submitted_at, reviewed_at, reviewed_by, rejection_reason`. RLS: dono lê/escreve o próprio; admin lê/atualiza tudo.

**`investor_suitability`**: `id, user_id, profile (conservador|moderado|agressivo|qualificado|profissional), answers jsonb, score, valid_until, created_at`. RLS: dono lê/escreve o próprio.

**`investor_terms_acceptances`**: `id, user_id, term_type, version, accepted_at, ip, user_agent`.

**`financial_wallets`**: `id, user_id (unique), available_balance numeric, blocked_balance numeric, pending_settlement_balance numeric, currency default 'BRL', created_at, updated_at`. Trigger ao criar `profiles.role=investor`.

**`financial_ledger`**: `id, user_id, type (deposit|withdrawal|reservation_block|reservation_release|allocation_debit|fee|adjustment), amount, balance_before, balance_after, reference_type, reference_id, status, created_at`.

**`token_positions`**: `id, user_id, token_id, quantity, locked_quantity, average_price, custody_type default 'platform_custodial', wallet_address nullable, created_at, updated_at`. Unique (user_id, token_id).

**`primary_reservations`**: `id, user_id, token_id, quantity, unit_price, total_amount, status (pending_payment|confirmed|allocated|refunded|cancelled), compliance_check_id, allocated_at, created_at, updated_at`.

**`compliance_checks`**: `id, user_id, entity_type, entity_id, check_type (kyc|suitability|eligibility|limits), status (passed|failed|pending), reason, metadata jsonb, created_at`.

**`audit_logs`**: `id, user_id, admin_id, action, entity_type, entity_id, ip_address, user_agent, metadata jsonb, created_at`. (Base mínima; uso completo virá nas próximas fases.)

Funções/triggers:
- `fn_create_investor_wallet()` ao virar `investor`.
- `fn_block_reservation_balance()` (trigger BEFORE INSERT em `primary_reservations`).
- `fn_allocate_reservation(reservation_id)` RPC: debita blocked, cria/atualiza `token_positions`, escreve `financial_ledger` + `audit_logs`.

### Pagamentos
- Stripe (modo `payment`) para depósito em wallet (one-off Checkout que credita `available_balance` ao confirmar via edge function `verify-deposit`).
- Pix fica como opção visual mas, na Fase 1, roteia para o mesmo Checkout (Stripe Pix BR) — sem conta de pagamento própria.

### Edge functions novas
- `investor-create-deposit` — cria sessão Stripe.
- `investor-verify-deposit` — valida session e credita ledger.
- `investor-create-reservation` — valida compliance + bloqueia saldo + cria reservation.
- `admin-allocate-reservation` — admin confirma alocação.

### Copy/disclaimers
Footer fixo da área `/investir`: os 5 disclaimers obrigatórios do brief (risco de perda total, baixa liquidez, rentabilidade passada, leia documentos, restrições regulatórias).

## Estrutura de arquivos

```
src/pages/investir/
  InvestirHome.tsx
  InvestirListagem.tsx
  InvestirAtivo.tsx
  InvestirAuth.tsx
  InvestirDashboard.tsx
  InvestirWallet.tsx
  InvestirReservas.tsx
  onboarding/InvestirKYC.tsx
  onboarding/InvestirSuitability.tsx
src/pages/admin/AdminTokenizacao.tsx
src/components/investir/
  InvestirShell.tsx
  InvestirHeader.tsx
  InvestirFooter.tsx
  OfferCard.tsx
  OfferTable.tsx
  AssetHero.tsx
  AssetTabs.tsx
  ReservationModal.tsx
  WalletBalanceCard.tsx
  KycForm.tsx
  SuitabilityWizard.tsx
  DisclaimerBar.tsx
supabase/functions/investir-create-deposit/
supabase/functions/investir-verify-deposit/
supabase/functions/investir-create-reservation/
supabase/functions/investir-admin-allocate/
supabase/migrations/<timestamp>_investir_phase1.sql
```

## Ordem de implementação (após aprovação)

1. Migração SQL completa (todas as tabelas, role investor, GRANTs, RLS, triggers).
2. `InvestirShell` + `/investir` (landing) com mocks do BD.
3. Listagem + página do ativo lendo `listings` + `tokens`.
4. Auth investor + KYC + suitability.
5. Wallet (depósito Stripe + ledger).
6. Reserva primária + edge functions.
7. Admin tokenização + alocação.
8. Polimento visual, disclaimers, audit logs básicos.

Confirma este escopo e a ordem? Se sim, aprovo e parto para a migração SQL.
