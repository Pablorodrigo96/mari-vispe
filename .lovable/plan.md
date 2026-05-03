# Onda B — Execução

## B.1 — Buyer Thesis (50)
- Invocar `mari-generate-buyer-thesis` com `{ batch: true, limit: 50 }` (já tem lógica interna sequencial 1s, filtra `is_current=true`, `sav_score IS NOT NULL`, `thesis_text IS NULL`, ordena por `sav_score DESC`).
- Guard manual: se >30% erro nos 10 primeiros (via logs), abortar.
- Reportar: processed, success, errors, custo IA via `api_usage_logs` (provider=lovable-ai, function_name=mari-generate-buyer-thesis, últimos 30 min).

## B.2 — SAV Score (880, sub-batches paralelos de 10)
- `calculate-sav-score` atual aceita `limit` mas filtro interno é `sav_calculated_at IS NULL OR < 24h`, ordenado por `match_score`. Não bate com filtro do Pablo (`sav_score IS NULL AND match_score>=60 AND setor_fit>=0.7`).
- Criar wrapper `calculate-sav-score-batch/index.ts`:
  - Query: `is_current=true AND abstain=false AND sav_score IS NULL AND match_score>=60 AND setor_fit>=0.7 ORDER BY match_score DESC, tese_fit DESC NULLS LAST LIMIT N`
  - Processa em paralelo (Promise.all grupos de 10) chamando `calcOne` inline (copiar lógica) ou invocando `calculate-sav-score` por match_id.
  - Retorna progresso a cada 200.
  - Guard: se >20% erro nos primeiros 50, abortar.
- Disparar com `limit: 880`.
- Reportar: total processado, distribuição por bucket SAV (0-39, 40-59, 60-79, 80-100), erros.

## Checkpoint 2 — Relatório
- B.1: theses geradas, custo BRL, sample de 3 teses.
- B.2: SAVs calculados, distribuição, sample de breakdown.
- Backlog restante (theses + SAV).
- Próximas decisões pendentes (cron buyer-thesis, parser news, 145 unqualified geocoding).

## Arquivos
- `supabase/functions/calculate-sav-score-batch/index.ts` (novo, wrapper admin-only com observability)

## NÃO fazer
- Geocoding ABENET extra, ativar crons, bulk além de 880, tocar em colunas/tabelas.
