
# Onda D — Inteligência Externa

Objetivo: destravar 3 fluxos encadeados — popular `equity_brain.company_news`, recomputar matches do dia e regerar insights da Mari — para que NewsPage e DashboardPage parem de aparecer vazias.

Custo-alvo total: **abaixo de R$ 1,00** (guard duro). Nenhuma coluna/tabela/função nova, nenhum cron novo ativado sem aprovação.

---

## D.1 — Fix do parser de notícias

A função `supabase/functions/ingest-company-news/index.ts` chama Perplexity (`sonar`, domínio restrito a 14 portais BR confiáveis), mas o parser de citações não casa nada e devolve 0 inserts. Hoje:

- O response esperado: usa `data.citations ?? data.search_results.map(r=>r.url)`.
- Para cada URL faz `content.split(/\n\n+/)` e procura o bloco que contenha a URL inteira ou o radical do domínio.
- Provavelmente o `sonar` atual devolve citações em `search_results` (não em `citations`) e o `content` vem como markdown numerado `[1] [2]` sem URLs embutidas — então o `blk.includes(url)` nunca casa e o radical do domínio raramente bate.

### D.1.1 — Investigar (READ ONLY, REPORTAR ANTES DE FIXAR)

1. Reler `searchPerplexity` (linhas 46-137) e mostrar o trecho do parser ao Pablo.
2. Rodar 1 chamada controlada de teste:
   - Pegar 1 company qualified com `razao_social` populada (`equity_brain.companies_scored` ordenado por `ma_score`).
   - Invocar `ingest-company-news` com `{ scope: "top500", limit: 1, dry_run: true }` e capturar `edge_function_logs` para ver o response cru (vamos adicionar 1 `console.log` temporário do payload `data` antes de processar — esse log é descartado depois).
3. Reportar a Pablo:
   - Trecho atual do parser.
   - Resposta crua Perplexity (até 2000 chars).
   - Hipótese (campo onde vêm citações, formato do content).
4. **PARAR e aguardar Pablo confirmar a hipótese.**

### D.1.2 — Fix do parser (após Pablo confirmar)

Esperado, baseado em hipótese mais provável:

- Trocar `data.citations ?? data.search_results.map(r=>r.url)` por leitura defensiva de **ambos** + extrair `title` e `published_date` de `search_results[i]` (sonar costuma devolver `{ url, title, date, snippet }`).
- Quando houver `search_results`, usar `r.title`, `r.snippet`/`r.date` direto, sem regex no markdown.
- Manter fallback antigo só se nenhum dos dois campos vier.
- Suportar parâmetro `lookback_days` no body — mapear para `search_recency_filter` (`day`/`week`/`month`/`year`) já que sonar só aceita esses presets; aproximação: `<=1→day, <=7→week, <=30→month, else year`.
- Remover `console.log` temporário do D.1.1.
- Re-deploy via `supabase--deploy_edge_functions`.

### D.1.3 — 3 batches sequenciais com guard

Disparar via `supabase--curl_edge_functions` POST `/ingest-company-news`:

- Batch 1: `{ scope: "top500", limit: 5, lookback_days: 7 }` — sanity.
- Conferir `equity_brain.company_news` (count + amostras das 5min).
- Se OK → Batch 2: `{ scope: "top500", limit: 20, lookback_days: 30 }`.
- Se OK → Batch 3: `{ scope: "top500", limit: 50, lookback_days: 30 }`.
- **Guard:** se >50% das companies do batch retornarem 0 news, ABORTAR e reportar.
- Conferir custo via `api_usage_logs` (provider=perplexity, function_name=ingest-company-news, últimos 30min).

---

## D.2 — Disparar engine de match manualmente

Sem custo de IA (determinístico).

1. `SELECT jobname, schedule, command, active FROM cron.job WHERE jobname='equity-brain-recompute-scores-daily';`
2. Identificar a edge function que o cron chama (lendo o `command`).
3. Snapshot ANTES:
   ```sql
   SELECT
     COUNT(*) FILTER (WHERE computed_at > now() - interval '24 hours') AS u24,
     COUNT(*) FILTER (WHERE computed_at > now() - interval '7 days')  AS u7d,
     MAX(computed_at) AS mais_recente
   FROM equity_brain.matches WHERE is_current = true;
   ```
4. Disparar manualmente a função (curl) e aguardar conclusão.
5. Snapshot DEPOIS + buckets 60+/70+/80+ e total `is_current`.

---

## D.3 — Re-rodar `mari-generate-insights`

Pré: D.1 + D.2 concluídos (mesmo parcial).

1. Contar `mari_insights` por `kind` ANTES.
2. `SELECT equity_brain.generate_mari_insights_all();`
3. Contar novos (últimos 5min) por `kind`, sample de 10 mais recentes, validar especialmente `top_match_novo_24h`.

---

## Checkpoint 4 — Stop obrigatório

Entregar relatório consolidado com:

- Tabela D.1/D.2/D.3 com status, custo, resultado-chave.
- Custo Onda D + acumulado total.
- NewsPage (vazia → X), DashboardPage (Y→Z insights), Bucket 80+ antes/depois.
- Decisões pendentes: agendar `crawl-ma-sources` weekly, investigar bucket 80+, rodar 291 matches `setor_fit<0.7`, próxima onda.

**NÃO** ativar nenhum cron novo. **NÃO** mexer em schema/RLS/enums.

---

## Arquivos tocados

- `supabase/functions/ingest-company-news/index.ts` — único arquivo modificado (D.1.1 log temporário e D.1.2 fix do parser + suporte a `lookback_days`).

## NÃO fazer

- Criar coluna/tabela/enum/função nova.
- Ativar cron novo (`crawl-ma-sources`, `ingest-company-news`).
- Tocar em RLS, schema, ou outras edge functions.
- Rodar batches além do tamanho aprovado (5 → 20 → 50).
