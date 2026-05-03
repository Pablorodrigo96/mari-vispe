
# Painel Admin: Monitoramento Completo de IA + APIs Externas

## Diagnóstico real (auditado agora)

A plataforma chama várias APIs externas que **hoje não são monitoradas em lugar nenhum**. Mapeamento completo:

### IA / LLMs
| Provider | Modelos | Usado em (edge functions) | API Key |
|---|---|---|---|
| **Lovable AI Gateway** | gemini-2.5-flash, gemini-2.5-pro, gpt-5-mini, gpt-5 | mari-brain, mari-chat, mari-summarize-deal, mari-summarize-thread, mari-suggest-actions, mari-draft-message, mari-generate-buyer-thesis, mari-classify-buyer-type, mari-generate-insights, mari-refresh-active-summaries, enrich-buyer-via-ai, generate-dashboard-insight, generate-whatsapp-draft, analyze-financial-doc, compute-semantic-embeddings, embed-signal, whatsapp-classify-batch | LOVABLE_API_KEY |
| **Anthropic Claude** | claude-* (3 funções) | claude-generate-pitch, claude-analyze-call, claude-classify-thesis | ANTHROPIC_API_KEY |
| **Perplexity** | sonar/online | crawl-ma-sources, ingest-company-news, extract-news-event | PERPLEXITY_API_KEY |

### APIs externas não-IA (também valem monitorar)
| Provider | Função |
|---|---|
| **Stripe** | pagamentos, subscriptions, checkout |
| **BrasilAPI** | geocode-companies-batch (CEP) |
| **CNPJ.ws / external DB** | sync-companies-from-cnpj, national-search |
| **Meta WhatsApp Graph** | metaWhatsappAdapter, whatsapp-webhook |
| **Nominatim** | geocoding (referenciado no codebase) |

## O que vai ser entregue

### 1. Banco — telemetria unificada

**Tabela `public.api_usage_logs`** (genérica para todas as integrações):
- `id`, `created_at`
- `provider` (`lovable_ai`, `anthropic`, `perplexity`, `stripe`, `brasilapi`, `cnpj_ws`, `meta_whatsapp`, `nominatim`)
- `category` (`llm`, `payments`, `data_enrichment`, `messaging`, `geocoding`)
- `model` (quando aplicável: `google/gemini-2.5-flash`, `claude-3-5-sonnet-20241022`, `sonar-pro`, etc.)
- `function_name` (qual edge function chamou)
- `feature` (`mari_chat`, `pitch_generation`, `news_ingestion`, `cnpj_lookup`, etc.)
- `user_id` (quem disparou, se autenticado)
- `input_tokens`, `output_tokens`, `total_tokens` (NULL para não-LLM)
- `request_count` (default 1; útil para batch)
- `cost_usd`, `cost_brl` (snapshot calculado no momento)
- `latency_ms`, `status` (`success`/`error`/`rate_limited`), `http_status`
- `error_message`, `metadata jsonb` (params extras: cep, cnpj, model_version, etc.)

Índices: `(created_at desc)`, `(provider, created_at)`, `(function_name)`, `(user_id)`, `(status)`.
RLS: SELECT só admin. INSERT só service_role.

**Tabela `public.api_pricing`** (admin edita preços vigentes):
- `provider`, `model`, `category`
- `input_per_1k_usd`, `output_per_1k_usd` (LLMs)
- `flat_per_call_usd` (APIs por requisição: BrasilAPI free=0, Perplexity ~$0.005/req, etc.)
- `currency` (default USD), `effective_from` timestamptz
- `notes` text

Seed inicial:
- `lovable_ai/google/gemini-2.5-flash`: in $0.075/1M, out $0.30/1M
- `lovable_ai/google/gemini-2.5-pro`: in $1.25/1M, out $5.00/1M
- `lovable_ai/openai/gpt-5-mini`: in $0.25/1M, out $2.00/1M
- `lovable_ai/openai/gpt-5`: in $1.25/1M, out $10.00/1M
- `anthropic/claude-3-5-sonnet`: in $3.00/1M, out $15.00/1M
- `anthropic/claude-3-5-haiku`: in $0.80/1M, out $4.00/1M
- `perplexity/sonar`: $0.001 + $0.20/1M
- `perplexity/sonar-pro`: $0.005 + $1.00/1M
- `stripe`: 0 (Stripe cobra do payout, não rastreável aqui — registramos só nº de chamadas)
- `brasilapi`: 0 (gratuito)
- `cnpj_ws`: ~$0.01/req (configurável)
- `meta_whatsapp`: variável (registramos contagem; admin edita custo médio)

**Tabela `public.api_settings`** (kv): `usd_brl_rate` (default 5.20), atualizável manualmente.

**View materializada `api_usage_daily_summary`** (refresh hourly via cron) agregando por dia/provider/model para o gráfico.

### 2. Helpers compartilhados de instrumentação

`supabase/functions/_shared/apiTrack.ts` exportando:

```ts
// LLM via Lovable AI Gateway (lê usage do response)
callLovableAI({ model, messages, feature, function_name, user_id, ...opts })

// LLM via Anthropic (lê usage.input_tokens / output_tokens)
callAnthropic({ model, messages, system, max_tokens, feature, function_name, user_id })

// Perplexity (lê usage; calcula request fee + tokens)
callPerplexity({ model, messages, feature, function_name, user_id })

// Genérico para APIs não-LLM
trackExternalCall({ provider, category, feature, function_name, user_id, fn })
  → mede latência, status, exceções; insere log fire-and-forget.
```

Todos calculam custo via `api_pricing` no insert e gravam snapshot. Insert é fire-and-forget (não bloqueia resposta).

### 3. Refactor das edge functions

Substituir os `fetch` diretos pelos helpers. Lista:
- **17 funções LLM** (Lovable AI) → `callLovableAI`
- **3 funções Claude** → `callAnthropic`
- **3 funções Perplexity** → `callPerplexity`
- **APIs não-LLM** (sync-companies-from-cnpj, national-search, geocode-companies-batch, metaWhatsappAdapter, whatsapp-webhook) → wrap com `trackExternalCall`
- **Stripe** (sync-stripe, checkout, etc.) → wrap com `trackExternalCall` apenas para contagem/latência

Mudança curta (~5-8 linhas por função). Mesma assinatura de retorno = risco baixo.

### 4. Página `/admin/ai-monitor` (renomeio: "Monitor de APIs")

Adicionar à `AdminSidebar` com ícone Activity.

**Header — filtros globais:**
- Período: 24h / 7d / 30d / 90d / custom
- Provider (multi-select)
- Categoria (LLM / Payments / Data / Messaging / Geocoding)

**Bloco A — KPIs (5 cards):**
- Custo total R$ (com Δ% vs período anterior)
- Total tokens (input+output, só LLM)
- Total chamadas
- Taxa de erro %
- Latência média (ms)

**Bloco B — Gráficos (recharts):**
- Linha empilhada: custo R$/dia por provider
- Barra: top 10 funções por custo
- Pizza: share de custo por categoria

**Bloco C — Tabela detalhada:**
- Colunas: Provider · Modelo · Função · Chamadas · Tokens in/out · Custo R$ · Latência média · % erro
- Ordenável, exportável CSV

**Bloco D — Pricing & Settings (admin edita inline):**
- CRUD de `api_pricing` (preço por 1M tokens / por requisição)
- Atualizar `usd_brl_rate`
- Histórico das últimas 200 chamadas com modal de payload (metadata jsonb)

**Bloco E — Alertas (apenas visual nesta fase):**
- Badge vermelho se gasto do mês > R$ X (configurável em `api_settings`)
- Lista de "anomalias": funções com erro >10% nas últimas 24h

### 5. Cron de manutenção
- `api-usage-summary-refresh`: refresh da view materializada a cada 1h
- `api-usage-cleanup`: deletar logs > 180 dias (configurável) mensalmente

## Não está no escopo (fica para fase 2)
- Backfill histórico (começa a contar do deploy — sem dados anteriores possíveis)
- Alertas por email/WhatsApp ao estourar orçamento
- Detalhamento por usuário individual (campo existe, basta acrescentar filtro)
- Conciliação automática com fatura real do provider (Stripe/Anthropic)

## Considerações técnicas
- `usage` do Lovable AI e Anthropic seguem padrão OpenAI-compatível (`prompt_tokens`/`input_tokens`).
- Perplexity retorna `usage.prompt_tokens`, `usage.completion_tokens` + cobra $/req fixo.
- Custo travado no insert (snapshot do preço vigente) — mudança de pricing não reescreve histórico.
- Fire-and-forget: `void supabase.from('api_usage_logs').insert(...).then().catch(console.error)` para não atrasar UX.

## Próximos passos após aprovação
1. Migration: `api_usage_logs`, `api_pricing` (com seed completo), `api_settings`, view materializada, RLS, crons.
2. Criar `_shared/apiTrack.ts` com 4 helpers.
3. Refatorar ~26 edge functions (Lovable AI + Claude + Perplexity + APIs não-LLM + Stripe).
4. Criar `src/pages/admin/AdminApiMonitor.tsx` + rota + item sidebar.
5. Validar com chamadas de teste em mari-chat, claude-generate-pitch, ingest-company-news antes de declarar pronto.

Tempo estimado: feature grande (~1-2 builds).
