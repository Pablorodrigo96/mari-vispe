
## Fase 1 — Fixes básicos do WhatsApp (3 mudanças)

### Fix 2 — Migration: estender CHECK em `equity_brain.deal_events.event_type`

**Arquivo novo:** `supabase/migrations/20260501133500_extend_deal_events_event_type_check.sql`

```sql
ALTER TABLE equity_brain.deal_events
  DROP CONSTRAINT IF EXISTS deal_events_event_type_check;

ALTER TABLE equity_brain.deal_events
  ADD CONSTRAINT deal_events_event_type_check
  CHECK (event_type IN (
    -- legacy mantidos
    'rejected','contacted','reply_received','nda_signed',
    'loi_received','term_sheet','closed','dropped',
    -- novos canais de comunicação
    'whatsapp_outbound','whatsapp_inbound',
    'call_outbound','call_inbound',
    'email','note','meeting_held'
  ));
```

Resultado: o `RPC eb_mark_whatsapp_action` para de quebrar com `deal_events_event_type_check` ao clicar **Mandei**.

---

### Fix 1A — Reescrever `generate-whatsapp-draft` com contexto real

**Arquivo:** `supabase/functions/generate-whatsapp-draft/index.ts` (substituição completa)

Mudanças vs versão atual:

1. **Carrega histórico de 4 fontes** antes de chamar Gemini:
   - `equity_brain.contacts` (nome, cargo, e a empresa via `entity_type='company'`+`entity_id`)
   - `equity_brain.companies` (razão social, setor via cnae_descricao, UF/município)
   - `equity_brain.mandates` (status, pipeline_stage, deal_type, valor, dias desde assinatura, último outreach). Se `mandate_id` não vier mas o contato estiver ligado a uma empresa com mandato vigente/em_negociação, **infere automaticamente**.
   - `equity_brain.crm_activities` últimas 5 (data, kind, direction, body) — preferindo as ligadas ao mandato; fallback para o contato.
   - `whatsapp_action_log` última mensagem efetivamente enviada (texto integral + data).

2. **Decide o intent automaticamente** (sem o caller passar `draftType`):
   - Se mandato com status `vigente` ou `em_negociacao` → **`followup`**
   - Caso contrário → **`initial`**
   - O caller pode opcionalmente sobrescrever via novo campo `force_intent` (`valuation_send` | `meeting_request` | `match_announcement`) — mantém compat com o `draft_type` antigo nesses 3 casos.

3. **System prompts diferentes**:
   - **`followup`**: instrução explícita "VOCÊ JÁ TEM RELAÇÃO ATIVA. NÃO se apresente. NÃO diga 'identificamos uma oportunidade' nem 'tenho um buyer'. Faça referência específica a algo concreto do histórico (status, último ponto, documento)."
   - **`initial`**: apresentação curta com gancho de empresa/setor.

4. **Resposta** ganha `mode: 'followup'|'initial'` e `resolved_mandate_id` para o front mostrar badge.

---

### Fix 1B — Simplificar `WhatsAppActionButton`

**Arquivo:** `src/components/whatsapp/WhatsAppActionButton.tsx`

- Remover o uso/passagem de `draft_type` no `invoke('generate-whatsapp-draft', ...)` (a edge function decide).
- Manter prop `draftType` por compat, mas só repassar quando for um intent forçado (`valuation_send`/`meeting_request`/`match_announcement`) via novo campo `force_intent`.
- Mostrar badge sutil no modal review: **"Continuação"** ou **"Primeiro contato"** vindo do `data.mode`.
- Nenhuma mudança UX no botão em si.

---

### Critérios de aceite

- [ ] Migration aplica sem erro.
- [ ] `INSERT INTO equity_brain.deal_events(event_type) VALUES ('whatsapp_outbound')` passa.
- [ ] Clicar **Mandei** no fluxo completo não dá mais erro `deal_events_event_type_check`.
- [ ] Clicar "Falar com X" num contato com mandato vigente: rascunho menciona setor/status/valor/última atividade e NÃO se apresenta.
- [ ] Clicar em contato sem mandato: rascunho é apresentação curta com gancho de empresa.
- [ ] Badge "Continuação" / "Primeiro contato" aparece no modal review.

### Detalhes técnicos

- `withObservability` mantido.
- Resolução de empresa do contato: assume `contacts.entity_type='company'` apontando para `companies.id` (ou via cnpj quando aplicável).
- Para evitar leak de PII, a edge usa SERVICE_ROLE só para leitura, e o texto enviado ao Gemini contém apenas dados já visíveis ao advisor (via RLS) — o usuário só dispara para contatos que ele já vê.
- Sem mudanças em `eb_open_whatsapp_action`/`eb_mark_whatsapp_action`.
- Sem mudanças em outros componentes.
