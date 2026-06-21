## Equity Planner — Próximos Incrementos (Blocos 1–8)

Execução sequencial dos 8 blocos pendentes identificados na auditoria, agrupados em 3 ondas para entregar valor cedo.

### Onda 1 — Núcleo do motor (blocos 1, 2, 3, 4)

**Bloco 1 — Migração de Arquétipo**
- Migration: nova tabela `equity_archetype_migrations (de_arquetipo_id, para_arquetipo_id, descricao_rota, delta_multiplo_esperado, descricao_curta)` + grants + RLS read-authenticated.
- Seed das rotas-chave: Projeto/Obra → Recorrente (managed services), Serviço → Recorrente (retainer), Serviço → Produto/IP.
- `equity-planner-compute`: detecta arquétipo-alvo viável e injeta como **iniciativa tipo `migracao_arquetipo`** no topo do plano com Δvalor calculado pela diferença de múltiplo.
- UI Assessment: badge "🚀 Migração de Arquétipo" destacada no topo da aba Plano com card explicativo da rota.

**Bloco 2 — Classificador de Arquétipo via IA**
- Edge function nova `equity-planner-classify`: recebe intake/meeting paste, chama Claude Haiku, retorna `{arquetipo_id, confianca, justificativa, sinais_detectados[]}`.
- Wizard: novo passo "Classificação" entre intake e revisão — usuário vê arquétipo sugerido, justificativa, e pode confirmar ou trocar manualmente.
- Persiste em `equity_assessments.archetype_classification_json`.

**Bloco 3 — Seed da `equity_initiative_library`**
- Insert via tool de ~40 iniciativas: 3–5 por dimensão × arquétipo-relevância, com `delta_ipe_padrao`, `esforco` (1–5), `prazo_meses`, `descricao`, `como_fazer`.
- `equity-planner-compute`: prompt do Claude passa a receber a biblioteca como contexto e **deve ancorar** cada iniciativa gerada em um item da library (ou marcar `custom: true` com justificativa).
- Fórmula de priorização explícita: `prioridade = (delta_valor) / (esforco * prazo_meses) * peso_dependencia`. Aplicada server-side; ordem do plano respeita "de-risking antes de crescimento" (dimensões 1, 4, 9 antes de 2, 6, 10).

**Bloco 4 — Veredito de Liquidez + Faixa Visual**
- `equity_assessments` ganha coluna `veredito_liquidez` (enum: `vendavel_hoje`, `vendavel_6_12m`, `vendavel_12_24m`, `inviavel_sem_reestruturacao`).
- Regra: IPE < piso_liquidez do arquétipo → inviável; senão escalona por IPE.
- UI Raio-X: badge grande do veredito + gauge mostrando posição na faixa de múltiplo do arquétipo (min ←|hoje|→ max) + linha do piso de liquidez.

### Onda 2 — Loop e ingestão (blocos 5, 6)

**Bloco 5 — Re-medição (Loop)**
- Botão "Nova avaliação" em `/equity-planner/:id` cria assessment-filho herdando company + intake.
- `equity_progress_log` recebe snapshot a cada compute (IPE composto, valor, top 3 destruidores).
- Aba Progresso passa a ter line chart real (IPE + Valor ao longo do tempo) e tabela comparativa dimensão-a-dimensão entre snapshots.

**Bloco 6 — Upload de Documentos**
- Bucket privado `equity-planner-docs` (RLS por user_id no path).
- Componente upload no wizard (DRE, balancete, contrato social — PDF/Excel).
- Edge function `equity-planner-extract`: Claude Sonnet com PDF base64 → extrai `{receita_anual, ebitda, despesas_dono, contingencias, contratos_recorrentes...}` → preenche intake.
- Tabela `equity_company_documents (assessment_id, file_path, tipo, extraction_json, status)`.

### Onda 3 — Profundidade financeira e comprador (blocos 7, 8)

**Bloco 7 — Buyer Map enriquecido + Prêmio Estratégico**
- Seed `equity_archetypes.universo_compradores_json` com 3 arquétipos-comprador (Estratégico/Financeiro/Individual) por arquétipo-vendedor, incluindo tese padrão.
- `equity-planner-compute` gera buyer map detalhado com prêmio estimado por comprador.
- Novo item no Value Bridge: "Prêmio Estratégico" amarrado ao comprador-alvo escolhido.
- UI Compradores: seleção de comprador-alvo reordena o plano (engenharia reversa) — re-priorização local instantânea.

**Bloco 8 — Add-backs estruturados + sanidade DCF/SDE**
- Novo step no wizard "Normalização do EBITDA" com campos: pró-labore real vs mercado, despesas pessoais no PJ, não-recorrentes, receita não-sustentável.
- `equity_valuations` ganha colunas `ebitda_contabil`, `ebitda_normalizado`, `addbacks_json`, `valor_dcf`, `valor_sde`.
- Compute calcula DCF simplificado (CAGR × 5 anos, WACC fixo do arquétipo, perpetuidade Gordon) e SDE para micro (<R$1M receita) como sanidade.
- UI Valor: tab "Triangulação" mostra os 3 valores (Múltiplos / DCF / SDE) + waterfall do EBITDA contábil → normalizado.

---

### Ordem de execução

Onda 1 (blocos 1→4) numa sequência só, depois Onda 2, depois Onda 3. Cada onda termina com:
- Migration aplicada
- Edge function deployada
- UI funcional na rota correspondente
- Memória `.lovable/memory/features/equity-planner.md` atualizada

### Detalhes técnicos
- Todas migrations seguem padrão GRANT → RLS → POLICY com escopo `auth.uid()`.
- Edge functions reusam `anthropicGateway.ts` existente (Sonnet para raciocínio, Haiku para classificação/extração estruturada).
- Sem alterações fora de `src/pages/EquityPlanner*`, `src/lib/equity-planner/`, `supabase/functions/equity-planner-*`, novas migrations e seed inserts.

Aprove para eu começar pela Onda 1.