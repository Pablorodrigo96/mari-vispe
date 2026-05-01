## Fase 3 — WhatsApp Webhook Receiver

Objetivo: quando a Meta entregar mensagens (inbound) para o número do advisor, MARI captura, persiste, vincula ao contato/mandato e dispara classificação de sentimento — tudo sem intervenção manual.

### Ajustes vs. brief original (schema real)

O brief assumia algumas colunas que não batem com o schema atual. Ajustes:

- `equity_brain.contacts` usa **`telefone_e164`** (não `phone`) e tem chave polimórfica `entity_type`/`entity_id` (não `mandate_id` direto). Vínculo com mandato vai via `entity_type='mandate' AND entity_id=<mandate_id>`.
- `equity_brain.deal_events` é centrado em `match_id`/`cnpj`/`buyer_id` — **não** tem `mandate_id`/`description`/`created_by`. Em vez de inserir lá direto, o espelho de cada mensagem vai em **`equity_brain.crm_activities`** (`kind='whatsapp'`, `direction='inbound|outbound'`, `body`, `metadata`), que já é a tabela canônica de timeline do CRM.
- `is_admin()` não existe; usamos `has_role(auth.uid(),'admin'::app_role)`.
- `advisor_whatsapp_config` já tem `verify_token`, `phone_number_id`, `total_messages_captured`, `last_message_received_at` — reaproveitamos.

### O que será criado

**1. Tabela `public.whatsapp_messages`** (migration)

Colunas principais:
- `advisor_id` (FK auth.users), `contact_id` (FK eb.contacts, nullable), `mandate_id` (uuid, nullable — resolvido a partir do contato)
- `direction` (`inbound`/`outbound`)
- `phone_from`, `phone_to` (E.164)
- `message_type` (`text`/`image`/`audio`/`video`/`document`/`sticker`)
- `content_text`, `media_url`, `media_mime_type`, `media_caption`
- `meta_message_id` UNIQUE (idempotência), `meta_message_timestamp`
- `status` (`received`/`processing`/`processed`/`error`), `sentiment` (`positive`/`neutral`/`negative`/`urgent`), `intent`, `processing_error`
- `received_at`, `processed_at`, `raw_payload jsonb`

Índices: `advisor_id`, `contact_id`, `mandate_id`, `received_at desc`, `meta_message_id` (unique), `status` parcial onde `status='received'`.

**RLS**:
- `SELECT` para o próprio advisor (`advisor_id = auth.uid()`) ou admins.
- `INSERT/UPDATE` apenas via service_role (edge functions). Sem políticas de escrita p/ usuários.

**2. Triggers**

- `tg_whatsapp_msg_touch_mandate` (AFTER INSERT): se `mandate_id IS NOT NULL`, faz `UPDATE equity_brain.mandates SET last_activity_at = NEW.received_at`.
- `tg_whatsapp_msg_mirror_activity` (AFTER INSERT): insere em `equity_brain.crm_activities` (`kind='whatsapp'`, `direction`, `entity_type='mandate'|'contact'`, `entity_id`, `contact_id`, `body=content_text`, `metadata={meta_message_id, message_type, media_url}`, `created_by=advisor_id`). Isso faz a mensagem aparecer na **timeline do mandato 360** automaticamente (e cobre o caso outbound também, evitando duplicar log que `openWhatsAppForContact` já fazia).

**3. Edge function `whatsapp-webhook` (rewrite)**

Mantém as URLs `?advisor_id=…` (já configuráveis por advisor). Comportamento:

- **GET**: igual hoje — valida `hub.verify_token` contra `advisor_whatsapp_config.verify_token` e devolve `hub.challenge`.
- **POST**:
  1. Lê body cru (`req.text()`).
  2. Se houver secret `META_APP_SECRET`, valida `X-Hub-Signature-256` (HMAC-SHA256 + `crypto.subtle.timingSafeEqual` equivalente). Em modo MOCK (sem secret), pula validação e loga aviso.
  3. Resolve advisor: prioridade (a) `?advisor_id=` no URL, (b) lookup por `phone_number_id` em `advisor_whatsapp_config`. Se não achar: loga e devolve 200.
  4. Para cada `entry[].changes[].value`:
     - Itera `messages[]`: extrai `from`, `id`, `timestamp`, `type`, `text.body` ou `image|audio|video|document.{id, mime_type, caption}`.
     - Busca contato: `select id, entity_type, entity_id from equity_brain.contacts where regexp_replace(telefone_e164,'\D','','g') = <digits do from>` limit 1. Se vier com `entity_type='mandate'`, pega `entity_id` como `mandate_id`.
     - `INSERT … ON CONFLICT (meta_message_id) DO NOTHING` em `whatsapp_messages` (`direction='inbound'`).
     - Acumula um único enqueue em `mari_ops` (apenas se a tabela de fila existir; usar `event_type='whatsapp_message_received'` com `payload`). Se a fila não existir, pular silenciosamente — o cron classifica em batch de qualquer jeito.
     - Atualiza `advisor_whatsapp_config.last_message_received_at` e incrementa `total_messages_captured`.
     - Itera `statuses[]` (sent/delivered/read): `UPDATE whatsapp_messages SET status=… WHERE meta_message_id = id` (não cria se não existir).
  5. **Sempre** retorna `200 OK` em ≤2s. Erros internos vão para `console.error` e logs do `withObservability`.

**Outbound**: o helper `openWhatsAppForContact` (mensagem enviada via WhatsApp Web) continua logando em `crm_activities`. Mensagens enviadas pelo próprio número Meta do advisor (quando ele responder no celular) entram pelo webhook como `messages[]` mesmo, e o código detecta direction='outbound' quando `from === config.phone_number`. Cobrimos os dois caminhos.

**4. Edge function `whatsapp-classify-batch`** (cron Fase 4, deploy agora)

- Busca `whatsapp_messages` com `status='received' AND direction='inbound' AND received_at > now() - interval '35 min'` (limite 200 por execução).
- Agrupa por `mandate_id` (ou `contact_id` quando sem mandato).
- Para cada grupo, monta prompt com até 20 últimas mensagens e chama **Lovable AI Gateway** (`google/gemini-2.5-flash`) via `LOVABLE_API_KEY` — é o padrão já usado no projeto, sem secret novo.
- Espera JSON `{sentiment, intent, confidence, summary}`. Atualiza cada mensagem do grupo (`status='processed'`, `sentiment`, `intent`, `processed_at`). Em erro → `status='error'`, `processing_error`.
- Retorna `{processed, errors, groups}`.

**5. Página `/admin/whatsapp-monitor`** (light, só admin)

Lista últimas 100 mensagens (advisor, contato, direction, sentiment, snippet, timestamp). Usa hook próprio com realtime via `supabase.channel('whatsapp_messages').on('postgres_changes',...)`. Botão "Reprocessar" chama `whatsapp-classify-batch`. Rota dentro de `AdminRoute`.

### Como testar (modo MOCK, sem Meta real)

1. Disparar `curl POST` no endpoint com payload Meta-like (`messages[].text.body`) → registro aparece em `whatsapp_messages` e em `crm_activities`.
2. `/admin/whatsapp-monitor` mostra a linha em realtime.
3. Rodar `whatsapp-classify-batch` manualmente → `sentiment` preenchido.
4. Quando a Meta real estiver pronta, basta apontar `https://<projeto>.functions.supabase.co/whatsapp-webhook?advisor_id=<uuid>` no Business Manager + setar `META_APP_SECRET` para ligar a validação de assinatura. Nenhum código muda.

### Detalhes técnicos / decisões

- **`meta_message_id` UNIQUE + ON CONFLICT DO NOTHING**: Meta retentar webhooks até 7×; idempotência é obrigatória.
- **Vínculo contato → mandato**: feito por consulta única no insert (não trigger), porque depende de normalização de telefone que é mais barata em TS.
- **Fila assíncrona**: vamos checar se `mari_ops.events_queue` (mencionada no brief) existe; se não, não criamos — o cron do classifier resolve. Manter o webhook simples reduz superfície de erro com payload da Meta.
- **CORS**: webhook não precisa (Meta server-to-server), mas mantemos `corsHeaders` por consistência.
- **`verify_jwt = false`** já está em `supabase/config.toml` para `whatsapp-webhook`. Para `whatsapp-classify-batch` mantemos default (verify), pois é chamada por admin/cron com JWT.
- **Cron**: a tarefa agendada (a cada 30min) fica para Fase 4 conforme combinado — o brief já indica isso. A função fica deployada e invocável manualmente.

### Entregáveis

- Migration: tabela `whatsapp_messages` + 2 triggers + RLS.
- Edge functions: `whatsapp-webhook` (rewrite), `whatsapp-classify-batch` (nova).
- Frontend: `/admin/whatsapp-monitor` + hook realtime.
- Doc: atualizar `docs/WHATSAPP_META_SWITCH.md` com a seção "Webhook payload e idempotência".

Sem secrets novos: `LOVABLE_API_KEY` já existe; `META_APP_SECRET` é opcional (só liga validação de assinatura quando setado).
