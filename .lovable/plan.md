
# Plano — Fase 1.5 + Fase 2 do Backfill MARI

Executa em duas ondas com checkpoints. Sem novas tabelas/colunas. Único custo de IA fica na Onda B, controlado.

---

## ONDA A — Fixes sem custo de IA

### A.1 — ABENET geocoding
- Row encontrada: `cnpj=03576095000184`, `municipio="Goiás, Mato Grosso do Sul"`, `uf=GO`, `cep=NULL`.
- **Pergunta para o Pablo (faço antes de qualquer UPDATE):** o município correto é `Goiás/GO` (cidade histórica) ou `Campo Grande/MS` (ou outro em MS)?
- Após resposta: `UPDATE equity_brain.companies SET municipio=…, uf=… WHERE cnpj='03576095000184'` (via insert tool).
- Disparar `geocode-companies-batch` com `limit:1` e reportar resultado.

### A.2 — `mari_insights`: adicionar 2 regras novas
Esqueleto atual de `generate_mari_insights_for_advisor(p_advisor)` (já confirmado via `pg_proc`):
- Rule 1: `mandate_expiring_30/15/7d` (depende de `data_vencimento`, hoje quase tudo NULL)
- Rule 2: `deal_stale_7d` (depende de `last_activity_at`)
- Rule 3: `stage_overdue` (depende de `stage_changed_at`)

Migration `CREATE OR REPLACE FUNCTION` mantendo as 3 regras + adicionando:

- **Rule 4 `new_top_match`**: para cada mandato vigente, matches com `is_current=true`, `match_score>=60`, `computed_at > now()-24h`, JOIN `companies` por `cnpj` e `mandates.company_cnpj`. Insere insight (kind=`new_top_match`, priority=8) com dedupe diário via `trigger_rule = 'new_top_match_'||to_char(current_date,'YYYYMMDD')` e `ON CONFLICT DO NOTHING`. Limite 1/mandato/dia (LIMIT 1 dentro do loop).
- **Rule 5 `hot_opportunity`**: matches `is_current=true`, `match_score>=70`, sem insight `hot_opportunity` para o mesmo (mandate_id, buyer_id) nos últimos 7 dias. Priority=7. Limite 3/mandato/semana via subquery COUNT.

Observação: tabela `mari_insights` não tem coluna `kind`; usar `insight_type` + `trigger_rule` (já em uso). Vou confirmar com o Pablo se prefere reaproveitar `insight_type='opportunity'` ou criar valores novos.

Após migration: `SELECT equity_brain.generate_mari_insights_all();` e contagem por `trigger_rule`. Validar `/equity-brain` (DashboardPage) visualmente.

### A.3 — `company_news` fix
Bug confirmado em `supabase/functions/ingest-company-news/index.ts`:
- linha 147 e 180: `.eq("status","active")` → trocar para `.eq("status","vigente")`.
- `PERPLEXITY_API_KEY` está presente (managed connector).
- Re-deploy automático.
- Disparo manual: POST `/ingest-company-news` body `{scope:"top500", lookback_days:7, limit:20}`.
- Verificar `equity_brain.company_news` por `event_type` + custo via `api_usage_logs` (provider Perplexity, últimos 10 min).

### Checkpoint 1
Relatório markdown no formato exigido pelo prompt. Bloqueia se: API key faltar, Rule 4/5 gerar 0, ou ABENET falhar.

---

## ONDA B — Backfill com IA (50+50)

### B.1 — Buyer Thesis (50)
- Não existe `mari-generate-buyer-thesis-cron`. Vou **criar essa edge function wrapper** (única função nova, prevista no prompt na seção B.1).
- Lógica: query SQL do prompt (50 buyers sem `buyer_theses`), itera sequencial com `await sleep(2000)`, chama `mari-generate-buyer-thesis` por buyer (ou inline com `trackedAIFetch`), guard de aborto se >30% erro nos 10 primeiros.
- **Atenção:** `mari-generate-buyer-thesis` atual recebe `match_id` (gera tese por match e grava em `matches.thesis_text`), não `buyer_id` para `buyer_theses`. **Vou pedir confirmação ao Pablo:**
  - (a) gerar tese por match (50 matches sem `thesis_text`, ordenados por `sav_score`/prioridade) usando função existente, OU
  - (b) gerar tese por buyer agregando matches e gravando em `buyer_theses` (precisa lógica nova no wrapper).
- Após confirmação: agendar cron `mari-buyer-thesis-batch-daily` 03h via `cron.schedule` e imediatamente desativar (`active:=false`).
- Disparar primeira rodada manual de 50.

### B.2 — SAV Score (50, filtro reforçado)
- `calculate-sav-score/index.ts` (184 linhas) **não tem chamada de IA** — é cálculo determinístico em TS. Não precisa instrumentar `trackedAIFetch`. Reportar isso ao Pablo (custo IA = zero para SAV).
- Verificar se já aceita batch; se não, criar `calculate-sav-score-batch` wrapper que recebe IDs e itera (Promise.all em grupos de 10).
- Query do prompt para 50 IDs, executar, validar distribuição por bucket.

### Checkpoint 2 — STOP
Relatório consolidado. Aguarda aprovação para: ativar cron buyer thesis, bulk de 450 SAVs restantes, agendar cron `ingest-company-news`.

---

## Perguntas que vou fazer durante execução
1. **A.1**: município correto do ABENET (`Goiás/GO` ou `?/MS`)?
2. **A.2**: posso usar `insight_type='opportunity'` para Rule 4 e `insight_type='opportunity'` para Rule 5, diferenciando só por `trigger_rule`? Ou criar novos valores?
3. **B.1**: tese por match (caminho a, função existente) ou por buyer (caminho b, lógica nova)?

## Arquivos que serão tocados
- `supabase/migrations/<ts>_mari_insights_rules_4_5.sql` (novo)
- `supabase/functions/ingest-company-news/index.ts` (2 linhas)
- `supabase/functions/mari-generate-buyer-thesis-cron/index.ts` (nova)
- Possivelmente `supabase/functions/calculate-sav-score-batch/index.ts` (nova) — confirmar necessidade

## O que NÃO vou fazer
- Criar colunas/tabelas novas.
- Geocodificar as 145 unqualified.
- Ativar qualquer cron sem aprovação.
- Disparar bulk de 450 SAVs ou 429 buyer theses.
