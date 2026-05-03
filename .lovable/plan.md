# Fase 1 — Backfill MARI (Investigação + Geocoding sem custo de IA)

Executar os 4 jobs em sequência, **parar no Checkpoint 1** e entregar relatório consolidado para o Pablo aprovar Fase 2. Nenhuma coluna/tabela/edge function nova. Nenhuma IA chamada nesta fase.

## Job 1.1 — Geocoding de ~146 companies

1. `supabase--read_query`: contagem inicial de companies sem lat/long.
2. `supabase--curl_edge_functions` POST `/geocode-companies-batch` em 3–4 rodadas de 50, com `project_debug--sleep 10` entre rodadas (respeita Nominatim 1 req/s).
3. Após cada rodada, recontar cobertura via `read_query`.
4. Para companies que falharem em todas as tentativas, marcar `geocoded_source='failed'` — **isso é UPDATE**, então faço via migration curta (única alteração de estado de dados nesta fase, sem mudar schema).
5. Reportar: ganho líquido, falhas com motivo (sem CEP / sem município / Nominatim sem hit), tempo, cobertura final.

## Job 1.2 — Diagnóstico `mari_insights` zerada (read-only)

1. `read_query` em `cron.job` filtrando `mari-insights-daily` (ativo? schedule?).
2. `read_query` em `cron.job_run_details` últimas 20 execuções (status, return_message).
3. `supabase--edge_function_logs function_name=mari-generate-insights` últimas execuções.
4. `code--view supabase/functions/mari-generate-insights/index.ts` — checar INSERT em `mari_insights`, early returns, dependências em tabelas vazias (`deals`, `crm_tasks`, `company_news`).
5. `read_query` no `pg_proc` para corpo de `equity_brain.generate_mari_insights_all` e `_for_advisor`.
6. Reportar 3–5 hipóteses ranqueadas + fix recomendado em uma frase. **Sem aplicar fix.**

## Job 1.3 — Diagnóstico `company_news` zerada (read-only)

1. `read_query` em `api_usage_logs` filtrando `function_name IN ('ingest-company-news','crawl-ma-sources','extract-news-event')` — call_count, last_call, sucessos, erros.
2. `read_query` em `cron.job` para qualquer schedule com `news` ou `crawl-ma`.
3. `secrets--fetch_secrets` para confirmar presença (não valor) de `PERPLEXITY_API_KEY`.
4. `code--view` nas 3 functions — verificar INSERT em `company_news` e dependência de inputs vazios.
5. Reportar hipóteses + fix recomendado. **Sem aplicar.**

## Job 1.4 — Auditoria dos 141.601 matches (read-only)

`supabase--read_query` rodando as 7 queries do prompt (em paralelo onde possível):
- Histograma `match_score` por bucket de 10
- Top 30 buyers por `match_count` + avg/max score
- Top 30 companies por `match_count` + avg score
- `is_current` true vs false
- `abstain` true vs false (em `is_current=true`)
- Distribuição por `engine_version`
- Top 10 matches por score com fits + buyer + company

Reportar: forma da distribuição, outliers de buyer/company (possível bug do engine), estimativa de "promissores reais", e **veredito sobre top-500 para Job 2.2** (qualidade ou precisa filtro adicional? Se sim, sugerir SQL).

## Checkpoint 1 — STOP

Entregar relatório markdown no formato exato definido no prompt (4 seções + recomendação para Fase 2). **Não avançar para Fase 2 sem aprovação explícita.**

## Regras respeitadas

- Nenhuma coluna/tabela/edge function criada.
- Apenas 1 UPDATE de dados (marcar `geocoded_source='failed'` em companies que Nominatim não resolveu) — pergunto ao Pablo antes se preferir não aplicar.
- Nenhuma chamada de IA → custo zero.
- Fases 2 e 3 ficam intocadas até checkpoint aprovado.
