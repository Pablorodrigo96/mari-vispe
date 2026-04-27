
# Fase 7 — Event-Driven + Feedback Loop do BDR

Implementa **literalmente** o plano enviado, com **5 ajustes** ao schema real validado nas Fases anteriores.

---

## ⚠️ Ajustes obrigatórios vs. plano original (validados via `read_query`)

1. **`equity_brain.company_signals` não tem `severity` nem `value`** — usa `signal_value`, `weight`, `confidence`. O trigger emite `weight` e `confidence` no payload (em vez de `severity`/`value`), e o `INSERT` da feedback-from-call popula `signal_value=null`, `weight=0.7`, `confidence=0.7`, `signal_text` = trecho da call.
2. **`equity_brain.company_signals` não tem `created_by`** — `triggered_by` do evento usa `'system'` (com fallback `'bdr:<id>'` quando vier via `feedback-from-call`, gravado como `source_ref` no signal). Sem alterar a tabela.
3. **`equity_brain.buyer_theses` não tem `cnaes_target`/`ufs_target`** — tem `thesis_key`, `prioridade`, `custom_pitch`. Trigger emite `{thesis_key, prioridade, active}` no payload. Sem alterar a tabela.
4. **`bdr_user_id UUID`, `triggered_by TEXT` — sem FK p/ `auth.users`** (consistência com `matches.assigned_bdr`, `ai_runs.triggered_by`, `opportunities_ready.assigned_bdr` das Fases 4/5/6).
5. **`calculate-scores`, `match-company`, `match-buyer` já aceitam `{cnpj}`/`{cnpjs}`/`{buyer_id}` no POST body** (verifiquei o código). **Não preciso adicionar `?cnpj=` query param** — `process-event` chama com body. Zero edits nessas 3 edges.

---

## 7.1 — Migration: `events` + `call_feedback` + triggers + view

**Arquivo:** `supabase/migrations/<ts>_equity_brain_events_feedback.sql` (~190 linhas)

### Tabelas

```sql
CREATE TABLE equity_brain.events (
  id               BIGSERIAL PRIMARY KEY,
  event_type       TEXT NOT NULL,
  entity_type      TEXT NOT NULL,
  entity_id        TEXT NOT NULL,
  payload          JSONB NOT NULL DEFAULT '{}'::jsonb,
  triggered_by     TEXT,
  retry_count      INT NOT NULL DEFAULT 0,    -- ajuste: contador para retry máx 3
  processed_at     TIMESTAMPTZ,
  processed_status TEXT,
  error_message    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_events_unprocessed ON equity_brain.events (created_at) WHERE processed_at IS NULL;
CREATE INDEX idx_events_entity      ON equity_brain.events (entity_type, entity_id, created_at DESC);
CREATE INDEX idx_events_type        ON equity_brain.events (event_type, created_at DESC);
```

```sql
CREATE TABLE equity_brain.call_feedback (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj                 VARCHAR(14) NOT NULL,         -- mesmo tipo das outras tabelas
  bdr_user_id          UUID,                          -- sem FK auth.users
  call_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_seconds     INTEGER,
  outcome              TEXT NOT NULL,                 -- no_answer|wrong_contact|not_interested|interested_later|qualified|meeting_scheduled|mandate_signed|lost
  interest_level       INTEGER CHECK (interest_level BETWEEN 1 AND 5),
  timing_estimado      TEXT,                          -- agora|6m|12m+|nao
  dor_principal        TEXT,                          -- sucessao|crescimento|financeiro|gestao|societario|outra
  faturamento_revelado NUMERIC(18,2),
  ebitda_revelado      NUMERIC(18,2),
  num_socios_real      INTEGER,
  raw_notes            TEXT,
  ai_extracted         JSONB,
  signals_added        TEXT[],
  followup_at          TIMESTAMPTZ,
  followup_action      TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_call_feedback_cnpj    ON equity_brain.call_feedback (cnpj, call_at DESC);
CREATE INDEX idx_call_feedback_bdr     ON equity_brain.call_feedback (bdr_user_id, call_at DESC);
CREATE INDEX idx_call_feedback_outcome ON equity_brain.call_feedback (outcome, call_at DESC);
```

### 3 Triggers (ajustados ao schema real)

- **`trg_emit_signal_event`** em `AFTER INSERT ON equity_brain.company_signals` → payload `{signal_key, weight, confidence, source}`. `triggered_by='system'` (sem `created_by`).
- **`trg_emit_call_event`** em `AFTER INSERT ON equity_brain.call_feedback` → payload `{feedback_id, outcome, interest_level, timing}`. `triggered_by='bdr:<uuid>'` ou `'bdr:unknown'`.
- **`trg_emit_buyer_thesis_event`** em `AFTER INSERT ON equity_brain.buyer_theses` → payload `{thesis_key, prioridade, active}`.

⚠️ **Sem trigger em `company_scores` ou `matches`** — evita loop infinito (regra do plano).

### RLS

```sql
ALTER TABLE equity_brain.events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE equity_brain.call_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY events_admin_read   ON equity_brain.events        FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY events_service_all  ON equity_brain.events        FOR ALL TO service_role USING(true) WITH CHECK(true);

CREATE POLICY callfb_bdr_read     ON equity_brain.call_feedback FOR SELECT TO authenticated
  USING (bdr_user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advisor'));
CREATE POLICY callfb_bdr_write    ON equity_brain.call_feedback FOR INSERT TO authenticated
  WITH CHECK (bdr_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY callfb_service_all  ON equity_brain.call_feedback FOR ALL TO service_role USING(true) WITH CHECK(true);
```

### View `v_bdr_history`

```sql
CREATE OR REPLACE VIEW equity_brain.v_bdr_history AS
SELECT
  cf.id, cf.cnpj, c.razao_social,
  cf.bdr_user_id, cf.call_at, cf.outcome, cf.interest_level,
  cf.timing_estimado, cf.dor_principal,
  cf.followup_at, cf.followup_action,
  cs.ma_score, cs.vispe_score, cs.sucessao_score   -- ajuste: nomes reais das colunas
FROM equity_brain.call_feedback cf
LEFT JOIN equity_brain.companies      c  USING (cnpj)
LEFT JOIN equity_brain.company_scores cs USING (cnpj);
```

---

## 7.2 — Edge Function `process-event` (consumidor idempotente)

**Arquivo:** `supabase/functions/process-event/index.ts` (~180 linhas)

- **Auth**: aceita `service_role` (chamada via cron) **OU** admin (chamada manual via curl). CORS completo.
- **Pull**: `SELECT id, event_type, entity_type, entity_id, payload, retry_count FROM equity_brain.events WHERE processed_at IS NULL ORDER BY created_at ASC LIMIT 100`.
- **Switch por `event_type`** (chama as edges via POST body — não precisa de `?cnpj=`):
  - `company.signal_added` | `call.completed` →
    `POST /calculate-scores` `{cnpjs:[entity_id], limit:1}` então
    `POST /match-company` `{cnpj: entity_id}`.
  - `buyer.thesis_added` →
    `POST /match-buyer` `{buyer_id: entity_id}`.
  - `opportunity.promoted` → `console.log` (Fase 11).
  - default → marca `processed_status='skipped'`.
- **Sucesso** → `UPDATE events SET processed_at=now(), processed_status='success'`.
- **Erro** → `UPDATE events SET retry_count=retry_count+1, error_message=...`. Se `retry_count >= 3`, marca `processed_at=now(), processed_status='error'` (drop). Senão deixa `processed_at=null` para próxima rodada pegar.
- **Idempotência**: as 3 edges-alvo (calculate-scores, match-company, match-buyer) já são idempotentes (UPSERT por cnpj/buyer + `is_current=false` em snapshots antigos). Rodar 2x na mesma linha não corrompe.
- **Resposta**: `{processed: N, success: X, errors: Y, skipped: Z, latency_ms}`.

⚠️ **Sem alterações em `calculate-scores`, `match-company`, `match-buyer`** — usam o body que já existe.

---

## 7.3 — Cron job (1 min) para `process-event`

**NÃO entra em migration** (contém service_role key específica do ambiente — mesma regra das Fases 2/5 documentada em `docs/EQUITY_BRAIN_CRON.md`).

Em vez disso, **adiciono à seção do `docs/EQUITY_BRAIN_CRON.md`** o snippet pronto:

```sql
SELECT cron.schedule(
  'process-events-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://eiprjgotjruiutztjavp.functions.supabase.co/process-event',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);
```

Inclui também `cron.unschedule` e query de monitoramento de backlog:
```sql
SELECT count(*) FROM equity_brain.events WHERE processed_at IS NULL;  -- alerta se > 1000
```

---

## 7.4 — Edge Function `feedback-from-call`

**Arquivo:** `supabase/functions/feedback-from-call/index.ts` (~210 linhas)

- **Auth**: admin OR advisor (BDR é advisor) OR service_role. Validação Zod do body.
- **Body Zod**:
  ```ts
  { cnpj: string(14), bdr_user_id: uuid().optional(),
    outcome: enum, interest_level: int(1..5).optional(),
    timing_estimado, dor_principal, faturamento_revelado?, ebitda_revelado?,
    raw_notes: string.min(20), duration_seconds?: int,
    followup_at?, followup_action? }
  ```
- **Fluxo**:
  1. INSERT em `equity_brain.call_feedback` com `bdr_user_id = bdr_user_id || auth.uid`. Recupera `feedback_id`. **Trigger `trg_emit_call_event` cria event automaticamente.**
  2. Se `raw_notes.length >= 50` (mínimo do `claude-analyze-call`), chama internamente `POST /functions/v1/claude-analyze-call` com `{cnpj, call_notes: raw_notes, bdr_id}`. Se falhar, log e segue (não bloqueia o feedback).
  3. `UPDATE call_feedback SET ai_extracted = ai_response.parsed`.
  4. Para cada `signal_key` em `ai_response.parsed.sinais_novos` (validado contra `signal_catalog` — só keys existentes):
     ```sql
     INSERT INTO equity_brain.company_signals
       (cnpj, signal_key, signal_value, signal_text, weight, source, source_ref, confidence)
     VALUES (cnpj, key, NULL, '<trecho-resumo da call>', 0.7, 'call', feedback_id::text, 0.7)
     ON CONFLICT (cnpj, signal_key) DO UPDATE SET
       weight = GREATEST(company_signals.weight, EXCLUDED.weight),
       confidence = EXCLUDED.confidence,
       updated_at = now();
     ```
     **Trigger `trg_emit_signal_event` cria event para cada um.**
  5. `UPDATE call_feedback SET signals_added = ai_response.parsed.sinais_novos`.
  6. **Aceleração**: dispara `POST /functions/v1/process-event` (fire-and-forget, sem await) para não esperar o cron de 1 min.
  7. Resposta: `{ ok, feedback_id, ai_summary, signals_added, score_will_recompute: true }`.

- **Sem chamada Claude** se `raw_notes` curto: feedback é gravado, signals manuais não criados, mas o `call.completed` event ainda dispara recompute do score (interest_level alto pode ter ajustado outros sinais via outras vias).

---

## 7.5 — pgvector embeddings (Fase 6.5)

**Pulado conforme plano original** ("Recomendação: pule esta seção no MVP"). Reativar quando houver 100+ `call_feedback` acumulados.

---

## 📁 Diff resumido

```
+ supabase/migrations/<ts>_equity_brain_events_feedback.sql   (~190 linhas)
+ supabase/functions/process-event/index.ts                   (~180 linhas)
+ supabase/functions/feedback-from-call/index.ts              (~210 linhas)
~ docs/EQUITY_BRAIN_CRON.md                                   (+30 linhas — seção Fase 7)
~ .lovable/plan.md
```

**Sem alterações em:**
- `equity_brain.company_signals`, `buyer_theses`, `companies`, `company_scores`, `matches`, `opportunities_ready` (estrutura).
- Edges das Fases 2/4/5/6 (`calculate-scores`, `match-company`, `match-buyer`, `refresh-opportunities`, `claude-*`).
- Schema `public`, código React, `types.ts`.

---

## ✅ Verificação após apply

```bash
# 1) Inserir signal manualmente → trigger cria event
INSERT INTO equity_brain.company_signals (cnpj, signal_key, weight, source, confidence)
VALUES ('XXXXXXXXXXXXXX', 'sucessao_explicita', 0.9, 'manual', 1.0);

SELECT id, event_type, entity_id, processed_at FROM equity_brain.events
ORDER BY id DESC LIMIT 5;
-- esperado: 1 row event_type='company.signal_added', processed_at=NULL

# 2) Disparar process-event manualmente (admin JWT)
curl -X POST $URL/functions/v1/process-event \
  -H "Authorization: Bearer <ADMIN_JWT>" -H "Content-Type: application/json" -d '{}'
# esperado: { processed: N, success: N, errors: 0 }

# 3) Verificar score recomputado
SELECT cnpj, ma_score, computed_at FROM equity_brain.company_scores
WHERE cnpj='XXXXXXXXXXXXXX' AND is_current=true;
-- esperado: computed_at recente (últimos segundos)

# 4) Feedback from call (advisor/admin)
curl -X POST $URL/functions/v1/feedback-from-call \
  -H "Authorization: Bearer <ADVISOR_JWT>" -H "Content-Type: application/json" \
  -d '{"cnpj":"XXXXXXXXXXXXXX","outcome":"qualified","interest_level":4,
       "timing_estimado":"6m","dor_principal":"sucessao",
       "raw_notes":"Sócio fundador (62 anos) confirmou que pretende sair do operacional em 12 meses, filhos não querem assumir, faturamento ~R$ 8M/ano, EBITDA 18%. Aberto a conversar com fundo."}'
# esperado: { ok:true, feedback_id, ai_summary, signals_added: ['sucessao_explicita',...] }

# 5) Backlog
SELECT processed_status, count(*) FROM equity_brain.events GROUP BY 1;

# 6) Histórico do BDR
SELECT * FROM equity_brain.v_bdr_history WHERE bdr_user_id='<UUID>' LIMIT 20;
```

---

## 🚫 Fora de escopo

- UI no admin para visualizar `events`/`call_feedback`/backlog (Fase 8).
- Slack/email notification em `opportunity.promoted` (Fase 11).
- pgvector embeddings (adiar até 100+ feedbacks).
- Ativar o cron de 1 min — fica documentado em `docs/EQUITY_BRAIN_CRON.md`, ativação manual.
- Batch noturno agrupando feedbacks (otimização futura se BDR registrar > 100/dia).

---

## 📌 Notas operacionais

- **Custo Claude por feedback**: ~$0.05 (analyze-call já calibrado na Fase 6). 50/dia = $75/mês.
- **Latência total feedback→score atualizado**: ~6–10s (1s INSERT + 4-6s Claude + 1s recompute + 1s match). Aceitável p/ BDR ver atualizado antes do followup.
- **Se Claude falhar**: feedback é salvo, `ai_extracted=null`, `signals_added=[]`, mas `call.completed` event ainda recomputa score. Não bloqueia.
- **Loop guard**: triggers só em fontes-de-verdade (`company_signals`, `call_feedback`, `buyer_theses`). Nunca em derivados (`company_scores`, `matches`, `opportunities_ready`).
