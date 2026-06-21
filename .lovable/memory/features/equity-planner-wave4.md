---
name: Equity Planner Wave 4 — Loop de Re-medição Visual
description: Snapshot enriquecido por compute, nova rodada (assessment filho) e comparação dimensão-a-dimensão entre medições.
type: feature
---
- `equity_progress_log` ganhou `dim_snapshot jsonb`, `valor_alvo`, `top_destruidores jsonb`, `arquetipo_id`, `veredito_liquidez`. Compute popula tudo a cada execução.
- `equity_assessments` ganhou `parent_assessment_id` + `rodada` para encadear re-medições.
- UI `/equity-planner/:id`:
  - Header: botão "Nova rodada" cria assessment filho (mesma company+intake) e dispara compute.
  - Aba **Progresso**: 3 cards de Δ (IPE/Valor/Valor potencial) vs. medição anterior, line chart IPE/Valor, tabela comparativa dimensão-a-dimensão ordenada por |Δ|, e histórico clicável de rodadas.
- Fluxos antigos preservados: "Re-medir" continua recomputando o mesmo assessment.
