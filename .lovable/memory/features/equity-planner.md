---
name: Equity Planner MVP
description: Diagnóstico de prontidão (12 dim → IPE) + valuation com Value Bridge + plano em sprints + buyer map + loop de re-medição, em /equity-planner.
type: feature
---
Produto novo, consultivo, complementa Valuation. Rotas: `/equity-planner` (landing), `/equity-planner/novo` (wizard 5 steps com modo wizard|meeting_paste), `/equity-planner/:id` (5 abas Raio-X/Valor/Plano/Compradores/Progresso), `/meus-equity-planners`.

Backend (Supabase, RLS por user_id; advisor/admin acesso total):
- `equity_archetypes` (3 seeds: servico_profissional, projeto_obra, recorrente — pesos das 12 dim + faixa múltiplo + piso liquidez).
- `equity_comps_benchmarks` (múltiplos por arquétipo×porte, seed Brasil PME).
- `equity_initiative_library` (playbook base por arquétipo×dimensão).
- `equity_companies`, `equity_assessments`, `equity_dimension_scores`, `equity_valuations`, `equity_value_bridge_items`, `equity_initiatives`, `equity_buyer_map`, `equity_progress_log`.

Edge function única: `equity-planner-compute` — recebe `{assessmentId, intakeText, companyData}`, chama Claude (`anthropicGateway.ts` com fallback Gemini), parseia JSON, calcula IPE ponderado por arquétipo, valuation via comp×curva sigmoide com piso de liquidez (45 default), grava tudo + snapshot em progress_log. Botão "Re-medir" no assessment chama a mesma função.

Lib: `src/lib/equity-planner/constants.ts` (DIMENSOES com 12 chaves, ARQUETIPOS_LABEL, VEREDITO_LABEL, brl helper).

Iniciativas marcadas `tipo='migracao_arquetipo'` ganham destaque visual no sprint board. Projeto→Recorrente é a jogada-chave do masterplan.

Sem cobrança no MVP. Buyer Map e loop de progresso estão dentro do escopo (Fase 1+2). DCF refinado, integrações contábeis e os outros 5 arquétipos ficam para fase seguinte.
