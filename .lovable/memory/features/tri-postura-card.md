---
name: Tri-Postura Card
description: Card no perfil da empresa (DealDetailPage) mostrando top 5 contrapartes compatíveis em 3 papéis simultâneos — vendedor / comprador / parceiro.
type: feature
---

Componente `TriPosturaCard` (src/components/equity-brain/TriPosturaCard.tsx) plugado no topo de `/equity-brain/empresa/:cnpj` (DealDetailPage, tab overview).

Hook `useTriPostura(cnpj)` faz 3 queries leves nas views públicas:
- **sell**: `eb_matches` where cnpj=X (top 5 buyers por match_score)
- **buy**: se a empresa tem registro em `eb_buyers` (lookup por cnpj), busca matches onde buyer_id=esse; senão lista vazia.
- **partner**: heurística — `eb_companies_blind` com mesmo `setor_ma` e UF distinta (top 5 por faturamento).

Não roda engine novo — reusa matches já calculados pelo `match-company-v2`. Codinome respeitado via views *_blind.
