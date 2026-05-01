---
name: EB Unified Deal View
description: Deal = par mandato+buyer movimentado como uma ficha única no pipeline. Página /equity-brain/deal/:id em 3 colunas (vendedor · MatchWhy + estágios · comprador). MatchWhyCard tem toggle simples↔técnico (default simples) com tradução pt-BR via matchWhyHumanizer.
type: feature
---

## Estrutura
- Tabela `equity_brain.deals` (criada na migration 20260501153702) liga `match_id`, `mandate_id`, `buyer_id`, `cnpj`, `stage`, `outcome`.
- RPC `promote_match_to_deal(_match_id)` é idempotente — promove um match para o pipeline retornando o `deal_id`.
- Hooks em `src/hooks/useDeal.ts`: `usePromoteMatchToDeal`, `useDeals`, `useDeal`, `useUpdateDealStage`.

## UI
- Página `/equity-brain/deal/:id` (`UnifiedDealPage.tsx`):
  - Header com par "EMPRESA → BUYER" + score + seletor de estágio (chips clicáveis trocam stage do deal).
  - Coluna 1: card vendedor (clicável → `/equity-brain/empresa/:cnpj`).
  - Coluna 2: `MatchWhyCard` compact + status do deal + atalho para tela completa do match.
  - Coluna 3: card buyer (clicável → `/equity-brain/crm/buyer/:id`).
- Botão "Pipeline" 🚀 no `MatchesPanel` chama `usePromoteMatchToDeal` e navega direto para `/equity-brain/deal/:id`.

## MatchWhyCard humanizado
- `src/lib/matchWhyHumanizer.ts` traduz cada feature do motor em frase pt-BR + badge de nível (MATCH PERFEITO/ENCAIXA/PARCIAL/FRACO) e ícone.
- `MatchWhyCard` agora tem toggle "simples ↔ técnico" no header (default = simples). Modo simples mostra resumo de uma frase + cards por feature com texto humano. Modo técnico mantém SHAP detalhado original.
- Rótulos dos 3 cards de cenário no modo simples: "Chance de fechar em 12 meses", "Valor estimado: pessimista / provável / otimista", "Tese do comprador".

## Não confundir
- `/equity-brain/deal/:id` é a página unificada do par (NOVA).
- `/equity-brain/empresa/:cnpj` continua sendo a 360 da empresa (DealCard antigo, foi mantido).
