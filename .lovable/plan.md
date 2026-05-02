
# Fase E1 — Metodologia Três Assimetrias (schema + benchmark + classificador)

Backend-only. Sem novas telas de uso final — apenas 2 telas admin para operar a base. Prepara terreno para E2 (SV/SAV + Simulador VPL) sem mexer em `match_score` atual.

## ⚠ Pré-requisito de dados
A spec referencia `transacoes_ma_brasil.json` (55 deals VSP-001…VSP-055), mas **só o .md foi anexado nesta sessão**. Vou implementar a edge function `eb-load-benchmark-transactions` esperando o JSON via body, e a tela `/equity-brain/admin/benchmark` terá um upload (`<input type="file">`) que lê o arquivo e envia o conteúdo. Assim que você subir o JSON pela tela, os 55 deals entram. Sem hardcode no migration.

## E1.1 — Migration `metodologia_tres_assimetrias.sql`
- ENUM `equity_brain.tipo_comprador_enum` (11 tipos).
- Tabela `taxonomia_compradores` populada com as 11 linhas (texto exato da spec) + RLS read-all.
- ALTER `equity_brain.buyers`: `tipo_comprador`, `tipo_classified_at`, `tipo_classified_confidence` + index parcial.
- ALTER `equity_brain.companies`: `score_vendabilidade`, `nivel_maturidade` (CHECK 1–5), `sv_calculated_at`, `sv_breakdown jsonb`, `sv_data_completeness`.
- ALTER `equity_brain.matches`: `sav_score`, `sav_breakdown`, `sav_calculated_at`, `thesis_text`, `thesis_generated_at` + index DESC parcial.
- Tabela `benchmark_transactions` (PK textual `VSP-xxx`, raw_data jsonb, índices por setor/fase e por tipo_comprador). RLS: leitura admin+advisor; escrita só admin.
- Tabela `transaction_proposals` com FK em `mandates` + RLS por responsável/padrinho/co_advisor/admin.

Validação prévia via `supabase--read_query` confirmando nomes reais (`equity_brain.mandates.responsavel_id`, `co_advisor_ids`, `equity_brain.buyers.is_synthetic`) antes de aplicar — ajusto se diferir.

## E1.2 — Edge function `eb-load-benchmark-transactions`
- Acesso admin (verifica via `has_role` no JWT).
- Body: `{ transactions_json: string | object }`. Faz `JSON.parse` se string.
- Itera `data.transacoes`, monta row mapeando campos da spec (incl. `vista_pct` vindo de `estrutura_pagamento.vista_pct`, `flag_caso_critico` por heurística "case study" em `observacoes_relevantes`), `upsert` por `id`.
- Loga em `mari_ops.health_check` (sucesso/erros).
- Retorna `{ inserted, errors, total }`.

## E1.3 — Edge function `mari-classify-buyer-type`
- Body: `{ buyer_id }` (single) ou `{ batch: true, limit?: number }`.
- Single: lê buyer + até 10 deals históricos da `benchmark_transactions` casando `comprador_nome` (ILIKE primeiro token), monta prompt PT-BR com taxonomia + dados + regras heurísticas, chama Lovable AI Gateway com `google/gemini-2.5-flash`, parseia JSON `{tipo, confidence, reasoning}`, valida contra enum, persiste em `buyers`.
- Batch: pega buyers `tipo_comprador IS NULL AND is_synthetic = false`, processa serial com `await sleep(1000)` (rate limit), agrega contagem, loga health_check.
- Tratamento de erro: parse fail / tipo inválido → loga warning, segue.

## E1.4 — Tela `/equity-brain/admin/benchmark`
- `BenchmarkPage.tsx`: header com botão **"Carregar JSON"** (file picker → lê via FileReader → invoca edge function).
- KPIs: total transações, multiplo médio EV/EBITDA, distribuição por setor (tabela compacta).
- Tabela paginada (filtros: setor, fase_ciclo_setorial, tipo_comprador, ano de `data_anuncio`).
- Linha clicável → `Sheet` lateral com `raw_data` em `<pre>` colapsável.
- Coluna "Caso crítico" com badge.

## E1.5 — Tela `/equity-brain/admin/buyer-classification`
- `BuyerClassificationPage.tsx`: KPIs (total / classificados / pendentes / confidence médio).
- Distribuição por tipo (gráfico barras simples — recharts já no projeto).
- Botões: "Classificar próximos 50" e "Classificar todos pendentes" (com `confirm()` mostrando estimativa = pendentes × 1s).
- Tabela últimas 50 classificações (`tipo_classified_at DESC`) com confidence + reasoning (campo extra em `buyers`? — usar `sv_breakdown`-style? **Decisão:** adicionar coluna `tipo_classified_reasoning text` nullable na migration para auditoria).

## E1.6 — Sidebar admin
Adicionar 2 itens em `ADMIN_ITEMS` de `EBSidebar.tsx`:
- `{ to: "/equity-brain/admin/benchmark", label: "Base Benchmark", Icon: Database }`
- `{ to: "/equity-brain/admin/buyer-classification", label: "Classificar Buyers", Icon: Tags }`

E rotas em `App.tsx` dentro de `EquityBrainLayout`.

## Arquivos
**Novos**
- `supabase/migrations/<ts>_metodologia_tres_assimetrias.sql`
- `supabase/functions/eb-load-benchmark-transactions/index.ts`
- `supabase/functions/mari-classify-buyer-type/index.ts`
- `src/pages/equity-brain/admin/BenchmarkPage.tsx`
- `src/pages/equity-brain/admin/BuyerClassificationPage.tsx`

**Editados**
- `src/components/equity-brain/EBSidebar.tsx` (2 itens admin)
- `src/App.tsx` (2 rotas)

## Fora de escopo (vai pra E2)
- Cálculo de `score_vendabilidade` / `sav_score`.
- Geração de `thesis_text`.
- Simulador VPL (UI consumindo `transaction_proposals`).
- Integrar tipo_comprador no ranking de matches.

## Critérios de aceite
- Migration aplicada sem warnings do linter.
- 11 linhas em `taxonomia_compradores`.
- Após upload do JSON, `SELECT count(*) FROM equity_brain.benchmark_transactions = 55` e distribuição setor confere (saude:24, telecom:16, tecnologia:5, varejo:3, servicos_b2b:3, infraestrutura:2, industria:1, educacao:1).
- Edge functions logam em `mari_ops.health_check`.
- Sidebar admin mostra os 2 itens novos; telas carregam sem erro.
- Batch classifier processa pelo menos 1 buyer com sucesso end-to-end.

Posso prosseguir?
