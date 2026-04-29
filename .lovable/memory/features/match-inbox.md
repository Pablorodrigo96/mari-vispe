---
name: Match Inbox — Matches IA no centro
description: Hero "Matches do dia" no Dashboard, página /equity-brain/match-inbox com fila acionável de pares vendedor↔buyer, badge na sidebar com nº de matches quentes, aba Matches IA no CRM Hub, TopMatchesHeader em mandate/buyer detail. Tier hot/warm/cold via percentis dinâmicos (top 10% / 30%) calculados em useMatchPercentiles. Hook useMatchInbox consulta equity_brain.matches direto + JOIN client-side com companies/buyers/mandates (a view eb_matches_enriched fica vazia por causa de inner-joins; foi recriada como security_invoker para uso futuro). InfoHints em todos os badges/KPIs novos.
type: feature
---
- Página: `src/pages/equity-brain/MatchInboxPage.tsx` em `/equity-brain/match-inbox`.
- Hero reutilizável: `MatchHotHero` no Dashboard e na aba "Matches IA" do CRM Hub.
- `TopMatchesHeader` mostra top 5 matches no header do mandate/buyer 360.
- Badge na EBSidebar mostra nº de matches quentes (≥ percentil 10).
- Threshold dinâmico: hot = top 10%, warm = top 30%, cold = resto. Recalibra automaticamente conforme distribuição muda.
- Filtros: score mínimo, UF, setor, "só com mandato vigente".
