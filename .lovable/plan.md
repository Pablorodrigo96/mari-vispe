
# FASE 2 — Cockpit Inteligente (cliente final)

## Objetivo
Transformar `/painel` (área logada do empresário/comprador) em um cockpit que mostra **inteligência aplicada** — não só atalhos. Trazer a lógica do Equity Brain (que hoje só os advisors veem) para o cliente, com vocabulário e nível certos para ele.

## Princípio
- **Não mexer** no Equity Brain (`/equity-brain/*`) — área dos advisors continua intocada.
- Reaproveitar dados/funções existentes (`mari_insights`, `valuation_history`, `listings`, `crm_activities`, `buyer_revealed_thetas`, `match_views`/`teaser_view_analytics`).
- O Painel atual (hero + KPIs + 4 módulos + onboarding) **fica embaixo**. Em cima entra a faixa "Sua semana na Mari" com 5 cards.

## Os 5 cards (linha superior do `/painel`)

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  Sua semana na Mari · {data}                                            │
├──────────────┬──────────────┬──────────────┬──────────────┬────────────┤
│ 1. Janela    │ 2. Comprado- │ 3. Próximo   │ 4. Insight   │ 5. Sinal   │
│ de venda     │ res ativos   │ passo IA     │ da Mari      │ do mercado │
└──────────────┴──────────────┴──────────────┴──────────────┴────────────┘
```

Cada card é adaptativo por papel:

1. **Janela de venda (12m)** — `p_close_12m` da empresa do usuário (se for seller com listing) ou da última empresa avaliada. Mostra %, faixa (otimista/base/pessimista) e mini-sparkline. Se buyer: mostra "% de mandatos com janela ativa" no setor da tese.
2. **Compradores ativos** — conta `buyer_revealed_thetas` compatíveis com o setor/região do listing (seller) ou nº de mandatos novos compatíveis com a tese (buyer). Link → `/matching` (já renomeado para "Compradores").
3. **Próximo passo (IA)** — pega top 1 de `mari_insights` (já existe) com `target_user_id = user.id` ou inferido. Fallback: regra simples (sem listing → "Anuncie sua empresa"; sem valuation → "Avalie em 2 min"; sem tese → "Cadastre sua tese").
4. **Insight da Mari** — segundo item de `mari_insights` ou resumo gerado on-demand via `generate-dashboard-insight` (edge function já existe). Cache 24h.
5. **Sinal do mercado** — usa `eb_isp_uf_summary`/`compute-market-waves` para o setor do usuário: "Setor X teve N transações nos últimos 90d, ticket médio R$Y". Se sem setor definido: top movimento do mês geral.

Cada card tem badge de **abstenção** quando dados insuficientes ("Precisamos de mais dados pra calcular — ver o que falta →").

## Arquivos

### Criar
- `src/components/cockpit/CockpitWeekStrip.tsx` — wrapper grid responsiva (1col mobile, 2 col md, 5 col xl).
- `src/components/cockpit/cards/WindowCard.tsx`
- `src/components/cockpit/cards/ActiveBuyersCard.tsx`
- `src/components/cockpit/cards/NextStepCard.tsx`
- `src/components/cockpit/cards/MariInsightCard.tsx`
- `src/components/cockpit/cards/MarketSignalCard.tsx`
- `src/components/cockpit/CardShell.tsx` — shell padrão (título, valor grande, sub, CTA, estado de abstenção, tooltip "i").
- `src/hooks/useCockpitData.ts` — agrega: contexto do usuário (primeiro listing, primeira tese, último valuation, setor preferido) em uma única query.
- `src/hooks/useMarketSignal.ts` — query a `eb_isp_uf_summary` ou view equivalente filtrada por setor.

### Editar
- `src/pages/Painel.tsx`: inserir `<CockpitWeekStrip />` logo após o hero "Olá, {greetingName}" e antes da grid de KPIs. Manter todo o resto.
- `src/hooks/useTodayCards.ts`: **não tocar** (é dos advisors).
- `src/i18n/labels` (criar se não existir) ou inline: glossário cliente — "Atratividade", "Janela de venda (12m)", "Compradores compatíveis", "Próximo passo", "Sinal do mercado".

### Não tocar
- Tudo em `src/pages/equity-brain/*` e `src/components/equity-brain/*`.
- `useTodayCards.ts`, `useMariBrain.ts` (o Mari Brain global FAB continua igual).
- Schemas/migrations — só leitura.

## Detalhes técnicos

- **Roles**: `useEffectiveRoles()` define qual variante cada card mostra. Ordem de prioridade do "contexto principal": último valuation > primeiro listing ativo > tese de buyer > genérico.
- **Sem dados**: o card renderiza estado de abstenção com CTA acionável (link para a ação que destrava o cálculo). Nunca inventa número.
- **Loading**: skeleton do `CardShell`. Stale-time 5 min nos cards 1, 2, 5; 1h no 4.
- **Performance**: `useCockpitData` faz 1 round-trip que retorna o "contexto do usuário"; cada card tem sua própria query leve em cima desse contexto.
- **Reaproveitamento de edge functions já existentes**: `generate-dashboard-insight`, `mari-generate-insights`, `compute-market-waves`. Sem novas edge functions nesta fase.
- **Fallback gracioso**: se uma RPC falhar (ex: `eb_isp_uf_summary` sem dados pro setor), o card cai pro estado de abstenção, não quebra a página.

## Fora do escopo desta fase
- Calculadora pública `/mari` (Fase 3).
- `/painel-comprador` dedicado (Fase 4).
- Editar copy de qualquer outra página.
- Mudar schemas, criar tabelas ou migrations.

## Critério de pronto
- `/painel` carrega com 5 cards no topo, cada um com dado real OU estado de abstenção claro.
- Cliente sem nenhum dado vê 5 cards de "ainda não temos sinal" com CTAs que destravam.
- Equity Brain (`/equity-brain/hoje`) continua idêntico — nenhum card duplicado, nenhum hook compartilhado quebrado.
- Mobile: 1 coluna; tablet: 2; desktop ≥1280px: 5.
