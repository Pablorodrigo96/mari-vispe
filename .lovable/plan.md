# Fase 1 — Reposicionamento Narrativo da Carroceria

Decisões confirmadas:
- Stats `/sell` ("R$ 2bi+", "45 dias", "+500", "98%"): **manter** como estão (case real).
- Ato 5 da home: **fazer agora** (card simples, refinamos depois).
- Pós-cadastro por role no Auth: **fazer agora**.
- Menu `/matching`: renomear para **Compradores**.

## 1. Home (`src/pages/Index.tsx`)

Reescrever copy do Hero + adicionar "Ato 5":

- **Hero H1**: "A IA que prevê quais empresas vão ser vendidas — e por quanto."
- **Sub**: "A mari analisa milhões de sinais de mercado e devolve probabilidade, faixa de valor e razões. Quando não sabe o suficiente, ela se abstém."
- **CTAs**: "Quero vender minha empresa" → `/vender` · "Quero comprar uma empresa" → `/comprar` (alias `/investors`) · "Sou investidor / family office" → `/investors`.
- **Ato 5 (novo bloco antes do Footer)**: Card simples com 3 colunas mostrando o diferencial — "Probabilidade + Faixa", "Razões explicáveis (SHAP)", "Abstenção quando não sabe". Componente isolado `src/components/home/MariDifferentialCard.tsx`.

## 2. Página Vender (`src/pages/Sell.tsx`)

- **H1**: "Sua empresa pode valer mais do que você imagina."
- **Sub**: mantém a ideia de compradores qualificados + sigilo.
- **Corrigir bugs de rota**: `/auth/register` → `/auth?tab=register&redirect=/vender` e `/auth/login` → `/auth?tab=login&redirect=/vender`.
- Stats permanecem: +500 / R$ 2bi / 45 dias / 98%.

## 3. Página Investidores (`src/pages/Investors.tsx` + `InvestorsHero.tsx`)

- **H1**: "Encontre as empresas certas — antes do mercado."
- **Sub**: foco em deal flow curado + score preditivo.
- CTA principal: "Cadastrar tese de investimento" → `/auth?tab=register&role=buyer&redirect=/comprar`.

## 4. Auth (`src/pages/Auth.tsx`) — pós-cadastro por role

- Aceitar query params: `?tab=login|register`, `?redirect=/path`, `?role=seller|buyer|advisor|franchisee` (pré-seleciona role no signup).
- Após signup/login bem-sucedido, redirecionar para `redirect` se presente; caso contrário, rotear por role:
  - seller → `/meus-anuncios`
  - buyer → `/comprar` (matching/compradores)
  - advisor/admin → `/equity-brain/hoje`
  - franchisee → `/painel`
- Default fallback: `/painel`.

## 5. Rotas e aliases (`src/App.tsx`)

- Adicionar aliases que evitem links quebrados:
  - `/comprar` → renderiza `Investors` (componente reutilizado).
  - `/mari` → renderiza `Valuation`.
- Rotas existentes preservadas.

## 6. Renomear "Matching" → "Compradores"

- **Cockpit (`src/components/layout/AppSidebar.tsx`)** e **Header público (`src/components/layout/Header.tsx` / `PublicChrome.tsx`)**: trocar label do item `/matching` para "Compradores".
- **Não renomear rota** (`/matching` continua funcionando) para não quebrar links externos/históricos.
- **EBSidebar.tsx**: já está como "Compradores", não tocar.

## 7. Glossário cliente-facing (sem mudar schema)

Onde aparecem termos técnicos para o cliente final (Painel, MyListings, BlindTeaser), substituir labels visuais:
- `equity_score` → "Atratividade"
- `p_close_12m` → "Janela de venda (12m)"
- "buyers" / "matching" → "Compradores compatíveis"
- "motor de scores" / "cockpit" → remover ou trocar por "seu painel"

Implementação: apenas strings nos componentes de cliente (não tocar EB).

## Arquivos tocados (resumo técnico)

- `src/pages/Index.tsx` — copy Hero + import do novo card.
- `src/components/home/MariDifferentialCard.tsx` — novo (Ato 5).
- `src/pages/Sell.tsx` — copy + fix rotas auth.
- `src/components/sell/FinalCTA.tsx` — sem mudança (já usa `/auth?redirect`).
- `src/pages/Investors.tsx` + `src/components/investors/InvestorsHero.tsx` — copy + CTA.
- `src/pages/Auth.tsx` — query params + redirect por role.
- `src/App.tsx` — aliases `/comprar`, `/mari`.
- `src/components/layout/AppSidebar.tsx` — label "Compradores".
- `src/components/layout/Header.tsx` e/ou `PublicChrome.tsx` — label "Compradores".
- `src/pages/Painel.tsx`, `src/pages/MyListings.tsx`, `src/pages/BlindTeaser.tsx` — glossário visual.

## Não-objetivos desta fase

- Nada de schema, RLS, edge functions, IA.
- Não mexer no Equity Brain / Motor.
- Não criar novas páginas além do card Ato 5.
- Refinamento visual do Ato 5 fica para o próximo comando.
