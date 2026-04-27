# Equity Brain v2 — Fases 5, 6 e 7 (fechamento do ciclo)

Implementação consecutiva das três fases restantes para tirar o v2 do "shadow" e colocar em produção com loop fechado.

## Fase 5 — Operacionalização (cron + observabilidade)

**Objetivo:** motor adaptativo rodando sozinho, com saúde monitorável.

1. **Tabela `equity_brain.engine_runs`** (migration)
   - Colunas: `id`, `engine` (text), `started_at`, `finished_at`, `rows_processed`, `status` (`running`/`success`/`error`), `error_message`, `metadata` (jsonb)
   - RLS: somente admin lê
   - Índice em `(engine, started_at desc)`

2. **Instrumentar 3 edge functions** para gravar em `engine_runs`:
   - `match-company-v2`
   - `update-buyer-revealed-thetas`
   - `compute-mandate-active-proba`
   - Cada execução insere 1 linha no início e atualiza no fim

3. **Estender `setup-equity-brain-crons`** com 3 novos jobs (além dos 3 já existentes):
   - `eb-v2-recompute-incremental` — a cada 6h → `match-company-v2` (modo incremental, só companies com signals novos)
   - `eb-v2-update-thetas-daily` — diário 03:00 BRT → `update-buyer-revealed-thetas`
   - `eb-v2-mandate-decay-weekly` — domingo 04:00 BRT → `compute-mandate-active-proba`

4. **Card "Saúde do Motor" na ShadowPage** (nova aba ou bloco no topo da aba existente)
   - Última execução de cada engine (timestamp + status + duração)
   - Taxa de erro últimas 24h
   - Throughput (rows_processed médio)
   - Botão "Ativar crons" (chama `setup-equity-brain-crons` com `action: enable`)

## Fase 6 — Drift v1↔v2 + ingestão real de feedback

**Objetivo:** gerar volume de eventos para o Bayesiano aprender de verdade.

1. **Aba "Drift" na ShadowPage** com 4 visualizações:
   - Histograma sobreposto de scores v1 vs v2 (recharts)
   - Tabela de Top-N agreement: % de overlap nos top 50 matches por buyer (top 20 buyers)
   - Lista de buyers com maior divergência (rank Spearman entre v1 e v2)
   - Linha temporal: drift médio semanal (precisa snapshot — ver passo 2)

2. **Tabela `equity_brain.drift_snapshots`** (migration)
   - Snapshot semanal de métricas agregadas v1 vs v2 (cron novo: domingo 05:00 BRT)
   - Edge function `compute-drift-snapshot` que popula

3. **Backfill seed de `deal_events`**
   - Edge function admin-only `backfill-deal-events-from-history`
   - Mapeia `interest_logs` → `contacted` (quando há WhatsApp/email do interessado)
   - Mapeia `messages` → `reply_received` (quando vendedor respondeu)
   - Joga ~50–200 eventos iniciais para o loop começar a aprender

4. **1-click feedback no `MatchDecisionCard`**
   - Substituir o modal pesado por 3 botões diretos: "📞 Contatado", "✅ Resposta", "❌ Rejeitado"
   - Cada um chama `eb_log_deal_event` direto, sem fricção
   - Modal só abre para "Rejeitado" (precisa do `rejection_reason`)

## Fase 7 — UI de calls + flip oficial v2 → produção

**Objetivo:** abrir a fonte mais rica de sinal (calls) e tornar v2 o motor padrão.

1. **Página `/equity-brain/calls/[id]`** (nova rota)
   - Listagem `/equity-brain/calls` com calls registradas
   - Detalhe `/equity-brain/calls/[id]` com:
     - Upload de áudio (storage bucket `call-recordings`, novo) ou colar transcript
     - Botão "Analisar" → dispara `claude-analyze-call` → `claude-classify-thesis` → `feedback-from-call` em sequência
     - Exibe sentiment, objeções, próximos passos, tese identificada
   - Link no sidebar (`EBSidebar.tsx`): "Calls"

2. **Storage bucket `call-recordings`** (privado, com RLS)
   - Migration que cria o bucket
   - Política: só admin/advisor lê e escreve

3. **Estender `update-buyer-revealed-thetas`**
   - Passa a consumir também `call_feedback` (não só `deal_events`)
   - Sinal mais granular: feedback de call vale 1.5x evento de deal (calibrável)

4. **Flip oficial v2 → produção**
   - `OportunidadesPage.tsx`, `GrafoPage.tsx`, `MapaPage.tsx`, `BoardPage.tsx`: trocar fetch de `match-company` para `match-company-v2` por padrão
   - Manter v1 acessível via query string `?engine=v1` (debug)
   - Renomear rota `/equity-brain/shadow` → `/equity-brain/lab` (fica como sandbox de experimentação)
   - Remover badge "Shadow" do header da página

5. **Atualizar memórias**:
   - `mem://features/equity-brain-v2-adaptive-loop` → marcar como GA
   - Nova: `mem://features/equity-brain-v2-production` documentando o flip

## Detalhes técnicos

- **Migrations**: 3 no total
  - `engine_runs` (Fase 5)
  - `drift_snapshots` + adicionar `call_feedback` weight em `update_thetas` (Fase 6/7)
  - `call-recordings` bucket + policies (Fase 7)
- **Edge functions novas**: 2 (`compute-drift-snapshot`, `backfill-deal-events-from-history`)
- **Edge functions modificadas**: 4 (`setup-equity-brain-crons`, `match-company-v2`, `update-buyer-revealed-thetas`, `compute-mandate-active-proba`)
- **Componentes UI**: nova aba "Drift", nova aba "Saúde", refactor de `MatchDecisionCard` (botões 1-click), nova página `CallsPage` + `CallDetailPage`
- **Sem novos secrets**: tudo usa `ANTHROPIC_API_KEY` (já existe) e `SUPABASE_SERVICE_ROLE_KEY` (já existe)

## Ordem de execução

Fase 5 → Fase 6 → Fase 7, em mensagens separadas com aprovação a cada migration.

**Pode aprovar para começar pela Fase 5.**
