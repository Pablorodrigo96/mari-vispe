
# Fase 7 — Closing the Feedback Loop (event-driven)

## Status atual

A infra **já existe**: `process-event`, `feedback-from-call`, `claude-analyze-call`, `fire-webhook`, tabela `equity_brain.events` com triggers, cron `process-events-every-minute` ativo. Mas:

- **846 eventos não processados** acumulados (743 `company.signal_added` + 103 `buyer.thesis_added`) — a fila está engargalada
- `claude-generate-pitch` existe como função mas nunca foi conectada ao fluxo de BDR
- Não há **monitoramento da saúde da fila** no painel Shadow
- O loop não fecha: signals novos da call não geram **embeddings semânticos** (campo `signal_text` fica órfão)
- BDR não tem botão **"Gerar pitch agora"** após registrar uma call

A Fase 7 amarra essas pontas.

---

## 1. Desbloquear a fila (one-shot + observabilidade contínua)

**Edge function nova** `drain-events-bulk`:
- Roda em loop interno chamando `process-event` até esvaziar (com timeout de 50s e cap de 30 batches)
- Auth: admin only
- Retorna agregado: `total_processed`, `success`, `errors`, `dropped`, `iterations`

**Botão admin** no Shadow → tab "Saúde": "Drenar fila agora" (mostra contagem atual via `equity_brain.events`).

**Card novo** `EventQueueHealthCard.tsx` no Shadow:
- Contador `unprocessed` (cor verde <100, amarelo <1000, vermelho ≥1000)
- Distribuição por `event_type`
- Última 20 erros (`processed_status='error'`) com `retry_count`, `error_message`, `entity_id`
- Auto-refresh a cada 30s

---

## 2. Pitch on-demand pós-call

**Editar** `feedback-from-call/index.ts`:
- Após processar `claude-analyze-call`, **se `outcome ∈ {qualified, interested_later, meeting_scheduled}`**, dispara em fire-and-forget `claude-generate-pitch` para preparar próxima abordagem
- Salva resultado em `call_feedback.followup_action` (texto curto) e novo campo `next_pitch jsonb`

**Migração SQL**:
- `ALTER TABLE equity_brain.call_feedback ADD COLUMN next_pitch jsonb;`

**Editar** `QuickCallModal.tsx`:
- Após sucesso, mostra preview do `next_pitch` retornado (se houver) com botões "Copiar" e "Marcar follow-up no calendário"

---

## 3. Embeddings semânticos dos signals

Hoje `company_signals.signal_text` é texto livre — sem embedding. Vamos enriquecer para busca futura por similaridade.

**Migração SQL**:
- `ALTER TABLE equity_brain.company_signals ADD COLUMN embedding vector(768);` (pgvector já habilitado)
- Index HNSW para cosine similarity

**Edge function nova** `embed-signal`:
- Recebe `signal_id`, gera embedding via Lovable AI Gateway (`google/text-embedding-004` se disponível, senão fallback para Lovable AI text completion + TF-IDF simples)
- Atualiza row

**Trigger SQL** `trg_embed_signal_text`:
- AFTER INSERT em `company_signals` quando `signal_text IS NOT NULL` → enfileira `event_type='signal.embed_pending'` em `equity_brain.events`

**Editar** `process-event`:
- Roteia `signal.embed_pending` → chama `embed-signal`

**Nota**: se text-embedding-004 não estiver disponível no gateway, deixamos a função preparada mas com flag `EMBEDDINGS_ENABLED=false` no início; foco da Fase 7 fica nos outros 3 itens. Decisão será na implementação após `secrets--fetch_secrets` confirmar modelos disponíveis.

---

## 4. Auto-correção de retries presos

**Editar** `process-event`:
- Antes do batch, faz "auto-retry" de eventos com `retry_count > 0 AND processed_at IS NULL AND created_at < now() - interval '5 min'` (já é o caso, mas explicitar lógica)
- Se `retry_count >= MAX_RETRIES`: drop com `processed_status='error'` (já implementado)

**Cron novo** `eb-event-cleanup-hourly`:
- A cada hora, limpa eventos `processed_status IN ('success','skipped')` com `processed_at < now() - 7 days` (mantém erros para auditoria)

---

## 5. UI — feedback visual no painel Shadow

**Editar** `ShadowPage.tsx`:
- Nova tab **"Eventos"** ou adicionar `EventQueueHealthCard` na aba "Saúde" existente (preferência: aba Saúde)
- Botão "Drenar fila agora" no topo

---

## Arquivos

**Migração SQL** (uma só):
- `ALTER TABLE equity_brain.call_feedback ADD COLUMN next_pitch jsonb;`
- `ALTER TABLE equity_brain.company_signals ADD COLUMN embedding vector(768);` + index
- Trigger `trg_embed_signal_text`

**Edge Functions novas**:
- `supabase/functions/drain-events-bulk/index.ts`
- `supabase/functions/embed-signal/index.ts` (com flag se modelo de embedding indisponível)

**Edge Functions editar**:
- `supabase/functions/process-event/index.ts` → handler `signal.embed_pending`
- `supabase/functions/feedback-from-call/index.ts` → disparar `claude-generate-pitch` quando outcome quente
- `supabase/functions/setup-equity-brain-crons/index.ts` → cron `eb-event-cleanup-hourly`

**Componentes novos**:
- `src/components/equity-brain/EventQueueHealthCard.tsx`

**Componentes editar**:
- `src/pages/equity-brain/ShadowPage.tsx` → integra novo card na tab Saúde
- `src/components/equity-brain/QuickCallModal.tsx` → preview de `next_pitch`

**Memória**:
- Atualizar `mem://features/equity-brain-v2-event-loop` (novo arquivo)

---

## Validação pós-deploy

1. Invocar `drain-events-bulk` → conferir que `unprocessed` cai de 846 para perto de 0
2. Registrar uma call com `outcome='qualified'` e `raw_notes` longas → confirmar que `next_pitch` é populado
3. Inserir um `company_signals` com `signal_text` → verificar que `embedding` é populado em ~1min (se EMBEDDINGS_ENABLED)
4. Abrir Shadow → tab Saúde → ver card de fila com contadores corretos
5. `SELECT * FROM cron.job WHERE jobname='eb-event-cleanup-hourly'` retorna 1 linha

---

## O que **não** entra na Fase 7 (fica para 8+)

- Slack/email de `opportunity.promoted` (Fase 11 conforme comentário no código)
- Busca por similaridade semântica usando os embeddings (precisa UI separada, fica Fase 8)
- Reconciliação de signals duplicados (Fase 9)

Após aprovação, sigo direto com a implementação.
