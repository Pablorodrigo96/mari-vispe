---
name: MARI Ops — Observability stack
description: Wrapper withObservability, schema mari_ops, RPCs públicas, smoke tests + cron 6h, dashboard /equity-brain/admin/health
type: feature
---
# Observabilidade — Fase 0

## Schema `mari_ops`
- `health_check` (function_name, status, duration_ms, error_text, payload_summary, request_id, source, ts)
- `smoke_tests` (test_name, status pass/fail/skip, duration_ms, actual jsonb, message)
- `model_metrics`
- View `health_summary_24h` (security_invoker)

## Wrapper edge functions
`supabase/functions/_shared/observability.ts` exporta `withObservability(handler, { name })`.
Toda função nova **DEVE** ser envolvida. Padrão: `serve(withObservability(async (req) => {...}, { name: "fn-name" }))`.

## RPCs públicas (acesso pelo PostgREST)
PostgREST não expõe schemas custom — sempre acessar `mari_ops` via RPC:
- `mari_ops_record_health(...)` — usado pelo wrapper
- `mari_ops_record_smoke(...)` — usado pelo smoke tester
- `mari_ops_health_volume_recent(p_minutes)` — diagnóstico
- `get_health_summary_24h()` — admin only (has_role check interno)
- `get_health_recent_errors(limit_n)` — admin only

## Smoke tests
`supabase/functions/mari-smoke-tests/index.ts` com 6 checks (DB counts, fn alive, ops self-check). Cron `mari-smoke-tests-6h` a cada 6h via pg_cron + pg_net.

## Dashboard
`/equity-brain/admin/health` — admin only. KPIs (verde/amarelo/vermelho) + tabela por função (p50/p95) + últimos erros 7d. Auto-refresh 60s.

## 10 funções instrumentadas (Fase 0)
match-company-v2, calculate-scores, mari-brain, news-to-crm-alert, crm-detect-new-matches, ingest-company-news, compute-mandate-active-proba, update-buyer-revealed-thetas, eb-match-isp-cold, mari-suggest-actions
