# Fase 6 — Drift v1↔v2 + Ingestão Real de Feedback

Objetivo: medir continuamente a divergência entre o motor v1 (legado) e o v2 (adaptativo), e popular o loop bayesiano com **feedback histórico real** (interest_logs, messages) além do botão 1-clique no card.

---

## 1. Drift Analytics (v1 vs v2)

**Tabela nova** `equity_brain.drift_snapshots`:
- `id`, `snapshot_at`, `cnpj` (nullable — null = snapshot global)
- `top_n` (10/50/100), `overlap_pct` (jaccard top-N)
- `spearman_corr` (correlação de ranks)
- `mean_score_v1`, `mean_score_v2`, `std_v1`, `std_v2`
- `histogram_v1` jsonb, `histogram_v2` jsonb (10 bins)
- `sample_size`
- RLS: admin-only

**Edge Function nova** `compute-drift-snapshot`:
- Para cada empresa ativa (ou amostra de 200), busca top-100 buyers em `equity_brain.matches` (v1) e `equity_brain.matches_v2` (v2)
- Calcula overlap, Spearman, distribuições
- Insere snapshot global agregado + per-cnpj para top 50 empresas
- Loga em `engine_runs`

**Cron**: semanal, domingo 05:00 BRT (após mandate-decay).

---

## 2. Ingestão de Feedback Histórico

**Edge Function nova** `backfill-deal-events-from-history`:
- Lê `interest_logs` → gera `deal_events` tipo `contacted` (idempotente via `metadata.source='backfill_interest'` + unique check)
- Lê `messages` agrupadas por (listing_id, sender_email) → gera `reply_received` quando há ≥2 mensagens
- Para cada evento gerado, tenta linkar a um `match_id` em `matches_v2` correspondente (cnpj da listing + buyer_id se conhecido); se não houver, cria com `match_id = null` e `cnpj` direto
- Marca em `equity_brain.engine_runs.metadata.backfilled_count`
- Idempotente: pula registros já processados (lookup por metadata key)

**Trigger automática**: rodar uma vez via botão admin no painel Shadow.

---

## 3. UI — Aba "Drift" no /equity-brain/shadow

Novo componente `DriftAnalyticsCard.tsx`:
- **Histograma comparativo** v1 vs v2 (recharts BarChart com bars lado a lado)
- **Tabela top-N overlap** (N=10/50/100): % concordância
- **Gráfico série temporal** (LineChart): overlap_pct e spearman ao longo das semanas
- **Filtro por cnpj** (autocomplete) para drill-down em uma empresa específica
- Botão "Computar agora" que invoca `compute-drift-snapshot` manualmente

Adicionar tab "Drift" no `ShadowPage.tsx` (já tem Saúde, Comparação, etc.).

---

## 4. UI — Feedback 1-clique no MatchDecisionCard

Em `src/components/equity-brain/MatchDecisionCard.tsx`:
- Adicionar botão **"📨 Resposta recebida"** ao lado dos botões existentes (Rejeitar/Contatar)
- Ao clicar: `supabase.rpc('eb_log_deal_event', { p_match_id, p_event_type: 'reply_received' })`
- Toast de sucesso + atualizar estado local
- Permissão: admin/advisor (mesma do RPC)

---

## 5. Painel admin de backfill

No `ShadowPage.tsx` aba "Saúde", adicionar card **"Backfill Histórico"**:
- Botão "Executar backfill agora" (chama `backfill-deal-events-from-history`)
- Mostra última execução: `rows_processed`, `backfilled_count`, status
- Aviso: "Idempotente — pode rodar múltiplas vezes com segurança"

---

## Arquivos

**Migração SQL**:
- Criar `equity_brain.drift_snapshots` + RLS

**Edge Functions** (novas):
- `supabase/functions/compute-drift-snapshot/index.ts`
- `supabase/functions/backfill-deal-events-from-history/index.ts`

**Edge Function** (editar):
- `supabase/functions/setup-equity-brain-crons/index.ts` → adicionar cron `eb-v2-drift-weekly`

**Componentes** (novos):
- `src/components/equity-brain/DriftAnalyticsCard.tsx`
- `src/components/equity-brain/BackfillHistoryCard.tsx`

**Componentes** (editar):
- `src/pages/equity-brain/ShadowPage.tsx` → nova tab "Drift" + card backfill
- `src/components/equity-brain/MatchDecisionCard.tsx` → botão "Resposta recebida"

---

## Validação pós-deploy

1. Invocar `compute-drift-snapshot` manualmente → verificar 1 row global em `drift_snapshots`
2. Invocar `backfill-deal-events-from-history` → conferir `deal_events.metadata.source='backfill_*'`
3. Rodar `update-buyer-revealed-thetas` → confirmar que thetas mudam após backfill
4. Abrir aba Drift → conferir histogramas e overlap
5. Cron registrado em `cron.job` com schedule `0 5 * * 0`

Após aprovação, sigo direto com a implementação.