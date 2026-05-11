## Contexto

As 3 edge functions `claude-generate-pitch`, `claude-classify-thesis`, `claude-analyze-call` chamam `api.anthropic.com` direto com `ANTHROPIC_API_KEY`. Hoje:

- Já chamam `logApiUsage` com `provider="anthropic"` + token usage + custo → **a instrumentação existe**.
- Mas `api_usage_logs` tem **0 registros** para anthropic, porque **nenhuma das 3 funções é chamada** (zero callsites no código, zero invocações em `function_edge_logs`).
- `api_pricing` já tem linhas para `claude-sonnet-4-20250514`, `claude-3-5-sonnet`, `claude-3-5-haiku` e `default`.
- `api_settings` só tem `monthly_budget_brl=5000` (global, não por provider).

Risco real: as funções estão **deployadas e públicas**. Se forem invocadas (intencionalmente ou via abuso), a fatura Anthropic sobe sem teto e sem alerta.

## Objetivo

Manter Anthropic direto, mas eliminar o invisível: visibilidade de custo, alerta, e kill switch antes da chave virar surpresa de fatura.

## Mudanças

### 1. Kill switch + budget por provider (`api_settings`)

Adicionar 3 chaves novas:
- `anthropic_enabled` (bool, default `true`) — kill switch global.
- `anthropic_monthly_budget_usd` (number, default `50`) — teto mensal em USD.
- `anthropic_alert_threshold_pct` (number, default `0.8`) — dispara aviso a 80%.

### 2. Guard centralizado em `_shared/apiTrack.ts`

Nova função `assertProviderAllowed(provider)`:
- Lê `${provider}_enabled` de `api_settings` (cache 5 min, mesmo padrão do pricing).
- Lê custo MTD de `api_usage_logs` (cache 60 s).
- Se kill switch desligado → lança `ProviderDisabledError` (HTTP 503).
- Se MTD ≥ budget → lança `ProviderBudgetExceededError` (HTTP 402).
- Logs estruturados com `console.warn` para o limiar de alerta (≥ threshold_pct).

Chamada inserida no topo das 3 `claude-*/index.ts`, **antes** do `fetch` para Anthropic, devolvendo erro HTTP com mensagem clara.

### 3. View de custo agregado: `api_usage_daily_by_provider`

```sql
create view api_usage_daily_by_provider as
select
  date_trunc('day', created_at) as day,
  provider,
  count(*) as calls,
  sum(coalesce(input_tokens,0)) as tokens_in,
  sum(coalesce(output_tokens,0)) as tokens_out,
  sum(coalesce(cost_usd,0)) as cost_usd,
  count(*) filter (where status_code >= 400) as errors
from api_usage_logs
group by 1, 2;
```

RLS: visível apenas para `admin` (via `has_role`).

### 4. Painel admin: aba "Custo de APIs"

Em `/admin/analytics` (já existe `AdminAnalytics.tsx` + `VisitorsSection`/`TrackingHealthCard`), adicionar nova seção `ApiCostSection`:

- **KPIs topo**: custo MTD por provider (anthropic, lovable-ai, brasilapi, nominatim), MTD vs budget (barra), nº de chamadas, taxa de erro.
- **Gráfico**: linha de custo diário últimos 30d por provider (recharts, já em uso).
- **Tabela**: top 10 funções por custo no mês (function_name, calls, cost_usd, last_call).
- **Toggle kill switch** por provider (chama RPC `set_provider_enabled(provider, enabled)`).
- **Input budget mensal** (RPC `set_provider_budget(provider, usd)`).

Fonte: `api_usage_daily_by_provider` + `api_usage_logs` (top funções) + `api_settings`.

### 5. Alerta passivo (sem cron novo)

A `mari-generate-insights` (cron diário 06h já existe) ganha um check extra: se `cost_usd MTD ≥ threshold_pct * budget` para qualquer provider, cria 1 linha em `mari_insights` com `severity='warning'` e texto pronto ("Anthropic atingiu 80% do orçamento mensal: $40.12 / $50"). Aparece automaticamente em `/equity-brain/hoje` e no `/painel` para admin.

Sem novo cron, sem novo edge function, sem webhook externo (Fase 4 — escopo enxuto).

### 6. Smoke test

`supabase/functions/claude-classify-thesis/index_test.ts` (ou ajuste do existente): chama a função com `anthropic_enabled=false` em `api_settings` e valida 503; restaura true e valida 200.

## Detalhes técnicos

**Arquivos novos:**
- `supabase/migrations/<ts>_anthropic_observability.sql` — view + RPCs `set_provider_enabled`/`set_provider_budget` (admin-only) + 3 rows em `api_settings`.
- `src/components/admin/analytics/ApiCostSection.tsx`
- `src/hooks/useApiCostDaily.ts`

**Arquivos alterados:**
- `supabase/functions/_shared/apiTrack.ts` — adiciona `assertProviderAllowed()` + cache.
- `supabase/functions/claude-generate-pitch/index.ts`
- `supabase/functions/claude-classify-thesis/index.ts`
- `supabase/functions/claude-analyze-call/index.ts`
- `supabase/functions/mari-generate-insights/index.ts` — append budget warning.
- `src/pages/admin/AdminAnalytics.tsx` — monta `<ApiCostSection />`.

**Não escopo (deixar para fase futura se quiser):**
- Estender o guard para BrasilAPI, Nominatim, RFB/Anatel pg direct (mesmo padrão, mas user pediu Anthropic agora).
- Webhook Slack/email — alerta vive em `mari_insights` por enquanto.
- Rate limit por usuário — só budget global mensal.

## Resultado esperado

- Qualquer chamada Anthropic passa a aparecer em `api_usage_logs` com custo (já passaria; agora com guard fica garantido que **nunca** roda sem o registro).
- Admin vê custo realtime em `/admin/analytics` e pode desligar a chave Anthropic em 1 clique.
- Aviso automático em `/painel` quando custo passa 80% do teto.
- Risco de fatura-surpresa reduzido a, no máximo, o budget configurado.
