
# Equity Brain v2 — O que ainda falta

Olhando o escopo original do prompt do v2 (sistema híbrido adaptativo com 6 capacidades) contra o que já está em produção, **as 4 fases entregues cobrem o núcleo**: motor v2 com blend de pesos, mandate active probability, MatchDecisionCard com SHAP/IC/price bands, RPC de feedback e loop Bayesiano de revealed_thetas.

Status atual no banco:
- 3.582 matches v2 calculados
- 10 buyer_archetypes ativos
- 86 companies_scored
- **0 deal_events / 0 revealed_thetas / 0 ai_runs / 0 call_feedback** ← o loop nunca rodou de verdade

Faltam 5 frentes para fechar o ciclo e oficializar o v2 em produção. Sugiro executar em **3 fases curtas**.

---

## Fase 5 — Operacionalização (cron + observabilidade)

Hoje o motor adaptativo só roda se alguém clicar no botão na ShadowPage. Precisa virar processo contínuo.

1. **Ativar pg_cron jobs** via `setup-equity-brain-crons`:
   - `match-company-v2` recompute incremental: a cada 6h para companies com mudança em `company_signals`
   - `update-buyer-revealed-thetas`: diário 03:00 BRT (processa eventos das últimas 24h)
   - `compute-mandate-active-proba`: semanal (decay de mandatos sem atividade)
2. **Tabela `equity_brain.engine_runs`** (nova): registra cada execução (engine, started_at, finished_at, rows_processed, error). Já existe `ai_runs` mas é para LLM; criar uma irmã para os engines determinísticos.
3. **Card "Saúde do Motor"** na ShadowPage: última execução de cada job, taxa de erro, throughput.

## Fase 6 — Drift v1 ↔ v2 + ingestão real de feedback

Sem deal_events, o loop adaptativo é teórico. Duas frentes em paralelo:

1. **Dashboard de Drift v1↔v2** (nova aba "Drift" em ShadowPage):
   - Distribuição de scores v1 vs v2 (histograma)
   - Top-N agreement (% de overlap nos top 50 matches por buyer)
   - Buyers com maior divergência (candidatos a investigação)
   - Série temporal: drift médio por semana → mostra se v2 está convergindo ou divergindo
2. **Backfill seed de deal_events**: criar script admin que importa eventos históricos de `interest_logs` + `messages` mapeando para `contacted` / `reply_received`. Dá ~50-200 eventos iniciais para o Bayesiano ter sinal.
3. **Hook automático no MatchDecisionCard**: quando BDR clica "Contatado via WhatsApp", já dispara `eb_log_deal_event('contacted')` sem precisar abrir modal. Reduz fricção e aumenta volume de eventos.

## Fase 7 — Ingestão de calls (capacidade #5 do escopo original) + Flip oficial

A capacidade "feedback automático de calls via Claude" existe nas 3 edge functions (`claude-analyze-call`, `claude-classify-thesis`, `feedback-from-call`) mas **não tem UI**. Calls são a fonte mais rica de sinal.

1. **UI de upload de call** em `/equity-brain/calls/[id]`:
   - Upload de áudio/transcript
   - Trigger `claude-analyze-call` → extrai sentiment, objeções, próximos passos
   - `claude-classify-thesis` → identifica tese real do buyer pela conversa
   - `feedback-from-call` → grava em `call_feedback` + `deal_events`
2. **Loop fechado**: `update-buyer-revealed-thetas` passa a consumir também `call_feedback` (não só deal_events) para refinar revealed_thetas com mais granularidade.
3. **Flip oficial v2 → produção**:
   - Migrar páginas `/equity-brain/oportunidades`, `/grafo`, `/mapa`, `/board` para consumir `match-company-v2` por padrão
   - Manter `match-company` (v1) como fallback acessível via flag `?engine=v1`
   - Remover prefixo "Shadow" da página, renomear para `/equity-brain/lab` (cantinho de experimentação)
   - Atualizar `mem://features/equity-brain-v2-*` marcando como GA

---

## O que NÃO precisa (já está pronto ou fora de escopo)

- Motor v2 com blend de pesos ✅ Fase 2
- Mandate active probability ✅ Fase 2
- SHAP/IC/price bands no card ✅ Fase 3
- RPC de feedback `eb_log_deal_event` ✅ Fase 3
- Loop Bayesiano ✅ Fase 4
- Edge functions de Claude (já existem, só falta UI) ✅ código pronto
- Vector embeddings: extensão pgvector já habilitada, mas sem caso de uso aprovado — fica para v3

---

## Resumo executivo

| Fase | Entrega | Esforço |
|------|---------|---------|
| 5 | Cron ativo + saúde do motor | Pequeno |
| 6 | Drift dashboard + backfill de eventos + 1-click feedback | Médio |
| 7 | UI de calls + flip oficial v2 em produção | Médio |

Recomendo começar pela **Fase 5** (operacionalização) porque sem cron rodando o sistema continua estático. Depois Fase 6 para gerar volume de feedback, e por fim Fase 7 para fechar com calls + flip.

**Quer que eu comece pela Fase 5?**
