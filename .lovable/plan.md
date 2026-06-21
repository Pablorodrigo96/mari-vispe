
# Equity Planner — MVP

Produto novo em **`/equity-planner`** seguindo a identidade Mari (Carbon/Volt/Graphite/Bone, glassmorphism). Mais consultivo que o Valuation atual: parte do mesmo motor de avaliação mas devolve **diagnóstico de prontidão + plano de 12-36 meses + mapa de compradores + loop de re-medição**.

## Escopo da entrega (Fase 1 + Buyer Map + Loop)

1. **Classificador de Arquétipo** (3 curados no MVP: Serviço Profissional, Projeto/Obra, Recorrente).
2. **Diagnóstico** nas 12 dimensões → **IPE composto** ponderado pelo arquétipo.
3. **Valuation** com EBITDA normalizado × múltiplo posicionado pelo IPE.
4. **Value Bridge** (4 parcelas: Δ lucro, Δ múltiplo via IPE, Δ crescimento, prêmio estratégico).
5. **Plano em Equity Sprints** trimestrais (12 meses no MVP).
6. **Buyer Map** com 3 arquétipos de comprador + tese e prêmio estimado.
7. **Dashboard de Progresso** com loop de re-medição (snapshots de IPE/valor).

Fora do MVP: integrações contábeis, DCF refinado, automação de execução de iniciativas, os outros 5 arquétipos curados, promoção automática de calibrações dinâmicas.

## Entrada de dados — dois modos no MVP

A. **Wizard guiado** (~40 perguntas adaptativas em linguagem de dono, ramificadas por arquétipo). Autosave por step.
B. **Colar diagnóstico de reunião** (texto livre / transcrição). Claude extrai e preenche o data model; lacunas viram perguntas no wizard para o dono completar.

Ambos terminam no mesmo data model `equity_assessments`.

## Inteligência (Claude via `anthropicGateway.ts` existente)

Reusa a chave `ANTHROPIC_API_KEY` já configurada, com fallback Gemini que já existe no projeto. Modelo: `claude-sonnet-4` para orquestrador/síntese, `claude-haiku` para classificação/extração.

Edge functions novas:
- `equity-planner-classify` — recebe intake/texto → devolve arquétipo + confiança + sinais.
- `equity-planner-compute` — server-side: roda diagnóstico, calcula IPE/múltiplo/Value Bridge/iniciativas/Buyer Map em uma única chamada orquestrada (Claude tool-use).
- `equity-planner-resnapshot` — re-roda compute usando últimas respostas, grava em `equity_progress_log`.
- `equity-planner-signup` — espelha `plano-perfeito-signup` (lead capture pré-auth).

Regra dura de grounding: todo número ancora em input do cliente ou na tabela de comps; senão a IA declara lacuna em vez de chutar.

## Backend (Supabase)

Tabelas novas em `public` (todas com GRANT + RLS por `user_id`):

- `equity_companies` — snapshot da empresa avaliada (cnpj, setor_livre, arquetipo_id, porte, regime).
- `equity_assessments` — uma avaliação completa (ipe_composto, veredito_liquidez, raw_intake jsonb, source: 'wizard'|'meeting_paste').
- `equity_dimension_scores` — 12 linhas por assessment (dimensão, score 0-100, evidências).
- `equity_valuations` — método, múltiplo_aplicado, faixa, valor, premissas.
- `equity_value_bridge_items` — parcelas do bridge ligadas a iniciativas.
- `equity_initiatives` — playbook do cliente (dimensão_alvo, Δ IPE, Δ valor, custo, prazo, sprint, status, tipo inclui `migracao_arquetipo`).
- `equity_buyer_map` — arquétipo_comprador, tese, prêmio_estimado, prioridade.
- `equity_progress_log` — snapshots de IPE/valor para o gráfico de loop.

Tabelas de calibração (somente admin/advisor edita; leitura authenticated):
- `equity_archetypes` — 3 seeds (1, 2, 3) com pesos das 12 dimensões + faixa de múltiplo + KPIs + universo de compradores.
- `equity_comps_benchmarks` — múltiplo_min/max por arquétipo×porte (seed com valores Brasil PME).
- `equity_initiative_library` — playbook base de iniciativas por arquétipo×dimensão.

RLS: dono vê só seus assessments; advisor/admin vê tudo; `service_role` para edge functions; `equity_archetypes`/`comps`/`initiative_library` são `SELECT` para `authenticated` e `ALL` para admin/service_role.

## Frontend

Rotas:
- `/equity-planner` — landing do produto (hero, como funciona, CTA).
- `/equity-planner/novo` — wizard (escolha do modo: guiado vs colar diagnóstico).
- `/equity-planner/:assessmentId` — **Raio-X de Equity**: header com IPE composto + veredito de liquidez, radar das 12 dimensões, top 5 destruidores.
- `/equity-planner/:assessmentId/valor` — Valuation atual + Value Bridge animado (cascata).
- `/equity-planner/:assessmentId/plano` — roadmap em sprints (Kanban trimestral) com Δvalor por iniciativa.
- `/equity-planner/:assessmentId/compradores` — Buyer Map.
- `/equity-planner/:assessmentId/progresso` — gráfico de evolução do IPE e valor + botão "Re-medir".
- `/meus-equity-planners` — lista de assessments do usuário.

Componentes principais (`src/components/equity-planner/`):
- `EquityPlannerWizard.tsx` (steps: identificação → arquétipo sugerido → diagnóstico por dimensão → revisão).
- `MeetingPasteIntake.tsx` (textarea + drag-drop transcrição + preview do que a IA extraiu).
- `RaioXDashboard.tsx`, `DimensionRadar.tsx`, `ValueBridgeCascade.tsx`, `EquitySprintsBoard.tsx`, `BuyerMapGrid.tsx`, `ProgressLoopChart.tsx`.
- `ArchetypeMigrationBanner.tsx` — destaque visual quando a maior iniciativa é mudar de arquétipo (ex.: projeto → recorrente).

Reusa: shell autenticado (AppShell), `StepLeadCapture`, BrasilAPI no intake, padrão `Info` + `ebTooltips`, `break-words`, glassmorphism dark, Recharts (já no projeto) para radar/cascata/linha.

## Integração com o ecossistema existente

- Card "Equity Planner" no `/painel` ao lado de Valuation.
- Item "Equity Planner" na sidebar dentro de "Avaliar" (mesma área de Valuation/DCF/Certifier).
- Quando assessment fica pronto e IPE ≥ piso de liquidez, oferece CTA "Criar anúncio cego no marketplace" (pré-popula Sell Wizard com codename).
- Quando IPE < piso, CTA "Falar com um advisor Vispe" (cria lead em `mari_leads` com `source = 'equity_planner'`).

## Segurança e LGPD

RLS por `user_id`; advisor/admin via `has_role`. Dados sensíveis (CNPJ, faturamento) ficam atrás de RLS e nunca em logs. Re-medição grava em `equity_progress_log` via service_role (edge function), preservando histórico imutável.

## Memória do projeto

Salvar `mem://features/equity-planner` descrevendo o motor (12 dimensões, IPE → múltiplo, Value Bridge, arquétipos, loop) + atalhos de rota, para próximas iterações não re-derivarem a tese.

## Detalhes técnicos

- 3 arquétipos seed populados via migration (não admin UI no MVP — basta seed correto).
- Pesos das 12 dimensões: base universal do masterplan, com override por arquétipo (ex.: arquétipo 3 reforça peso de Qualidade de Receita; arquétipo 2 reforça Concentração e Higiene Financeira).
- Curva `g(IPE)` sigmoide com piso de liquidez = 45 (parametrizável por arquétipo).
- Edge function `equity-planner-compute` usa Claude tool-use com 3 tools: `score_dimensions`, `propose_initiatives`, `map_buyers` — orquestrador chama em sequência e persiste no DB em uma transação RPC `save_equity_assessment`.
- Re-snapshot agendado opcional (cron trimestral, fora do MVP — botão manual basta).
- Sem cobrança no MVP: produto entra grátis para validar o loop diagnóstico→plano. Pricing/Stripe entra em fase seguinte.

## Ordem de implementação

1. Migration (tabelas + RLS + GRANT + seeds dos 3 arquétipos, comps e biblioteca de iniciativas).
2. Edge functions (`classify`, `compute`, `resnapshot`, `signup`) + helpers de prompt Claude.
3. Wizard + Meeting Paste intake.
4. Telas de saída (Raio-X, Valor/Bridge, Plano, Buyer Map, Progresso).
5. Integração com Painel/Sidebar + CTAs cruzados com Marketplace e Mari Leads.
6. Memória + smoke test fim-a-fim (1 caso por arquétipo).
