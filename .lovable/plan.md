## Fase 2 — Setup automático de WhatsApp por Advisor (modo MOCK)

Decisão: a Meta Cloud API real **não permite** o fluxo "registrar advisor → SMS automático → confirma". Cada número exige WABA aprovado e cadastro manual no Business Manager. Por isso, esta fase entrega **toda a infra (DB, telas admin, edge functions, fluxo de status) usando um adapter MOCK**. Quando os números/credenciais reais chegarem, troca-se apenas o adapter — schema, RLS e UI permanecem idênticos.

Números mock pré-cadastrados: Vitor `+5511999991111`, Pablo `+5511999992222`.

---

### 1. Schema (migration nova)

Tabelas em `public`:

- **`advisor_whatsapp_setup_pending`** — staging temporário do onboarding (advisor_id, phone, phone_number_id mock, status `awaiting_sms_confirmation|confirmed|failed`, `expires_at = now()+15min`, `error_message`, contador de tentativas).
- **`advisor_whatsapp_config`** — config permanente por advisor (advisor_id UNIQUE, phone, phone_number_id, `access_token_secret_id` UUID apontando pro Vault, `verify_token`, `webhook_url`, `status pending|active|suspended|error`, `connected_at`, `last_message_received_at`, `total_messages_captured`, `is_mock` bool default true).

RLS:
- Habilitar em ambas.
- `advisor_can_view_own_config` (SELECT WHERE `advisor_id = auth.uid()` OR `has_role(uid,'admin')`).
- `admin_full` (ALL via `has_role(uid,'admin')`) — admin gerencia tudo.
- `advisor_whatsapp_setup_pending`: somente admin lê/escreve (advisor não vê staging).

Token criptografado:
- Habilitar extension **`vault`** (Supabase Vault).
- Função `public.eb_store_advisor_token(advisor_id, token)` SECURITY DEFINER que faz `vault.create_secret(...)` e devolve UUID. Coluna `access_token_secret_id` guarda só esse UUID — token real fica no Vault.
- Função `public.eb_read_advisor_token(secret_id)` SECURITY DEFINER restrita a service_role, usada pelas edge functions.

---

### 2. Edge Functions (com adapter MOCK)

Estrutura compartilhada:
- Novo arquivo `supabase/functions/_shared/metaWhatsappAdapter.ts` exportando `MetaAdapter` interface com `registerPhoneNumber`, `verifyCode`, `issueAccessToken`, `subscribeWebhook`. Duas implementações: `MockMetaAdapter` (default, usa código fixo `123456` e gera IDs/tokens fake) e `RealMetaAdapter` (stub com TODO + envvars `META_*`). Seleção via env `META_MODE=mock|real` (default mock enquanto secret `META_PERMANENT_ACCESS_TOKEN` ausente).

Funções novas (todas com `withObservability`):

**`setup-advisor-whatsapp`** (POST `{advisor_id, phone_number}`)
1. Valida admin (via JWT).
2. Normaliza telefone, valida formato BR.
3. Chama `adapter.registerPhoneNumber(...)` → recebe `phone_number_id` mock.
4. Insere em `advisor_whatsapp_setup_pending` com status `awaiting_sms_confirmation`.
5. Retorna `{status:'awaiting_confirmation', mock_code:'123456', mock_hint:'Use 123456 enquanto Meta real não configurada'}`.

**`confirm-advisor-whatsapp`** (POST `{advisor_id, sms_code}`)
1. Busca pending. Valida não expirado, contador de tentativas.
2. Chama `adapter.verifyCode(phone_number_id, code)` (mock aceita só `123456`).
3. Chama `adapter.issueAccessToken(...)` → token fake.
4. Salva token via `eb_store_advisor_token` (Vault) → guarda `secret_id`.
5. Insere em `advisor_whatsapp_config` (`status='active'`, `is_mock=true`, `connected_at=now()`).
6. Apaga staging.
7. Retorna `{status:'active', advisor_id, phone, is_mock:true}`.

**`whatsapp-webhook`** (GET para verificação Meta + POST para mensagens) — **stub mock**
- GET: valida `hub.verify_token` contra `advisor_whatsapp_config.verify_token` via `?advisor_id=`.
- POST: por enquanto só registra payload em `mari_ops.health_check` e incrementa `total_messages_captured` + `last_message_received_at`. Captura real de mensagem entra na Fase 3.

---

### 3. UI Admin

**`src/pages/admin/AdvisorWhatsAppSetup.tsx`** (rota `/admin/advisors/:advisorId/whatsapp-setup`)

Estados visuais (mesmo componente, máquina de estados local):
- `idle` — input telefone + "Registrar e enviar SMS"
- `registering` — spinner
- `awaiting_sms` — aviso "MOCK: digite `123456`" + input código 6 dígitos + "Confirmar"
- `confirming` — spinner
- `active` — "✅ Operacional (modo mock)" + botões "Testar webhook" e "Reconectar" + badge `MOCK`
- `error` — mensagem + "Tentar novamente"

Comunicação via `supabase.functions.invoke('setup-advisor-whatsapp' | 'confirm-advisor-whatsapp')`.

**`AdminUsers.tsx`** (extensão, sem nova página)
- Filtrar usuários com role `advisor`/`admin` ganham coluna nova **WhatsApp**:
  - `🟢 Ativo (mock)` se há config status active
  - `🟡 Aguardando SMS` se há staging
  - `⚪ Configurar` caso contrário
- Clique na badge → navega para `/admin/advisors/:userId/whatsapp-setup`.
- Hook novo `useAdvisorWhatsAppStatus(userIds)` faz um único query batch.

Rota nova em `App.tsx` dentro do `AdminRoute`.

---

### 4. Critérios de aceite

- [ ] Migration aplica (tabelas + vault + funções).
- [ ] RLS impede que advisor X veja config do advisor Y.
- [ ] Admin abre `/admin/users` e vê coluna WhatsApp populada (3 estados).
- [ ] Admin clica advisor → setup → digita `+5511999991111` → SMS "enviado" (mock).
- [ ] Admin digita código `123456` → vê tela `✅ Operacional (mock)`.
- [ ] Linha em `advisor_whatsapp_config` existe com `is_mock=true` e token no Vault.
- [ ] Coluna no AdminUsers vira `🟢 Ativo (mock)`.
- [ ] Webhook GET responde challenge corretamente.
- [ ] Tentar código errado incrementa attempts e bloqueia em 3.

### 5. Pendências entregues junto (documentado, não codado)

`docs/WHATSAPP_META_SWITCH.md` lista exatamente o que muda quando Meta real chegar:
- Adicionar secrets `META_BUSINESS_ACCOUNT_ID`, `META_PERMANENT_ACCESS_TOKEN`, `META_APP_ID`, `META_APP_SECRET`.
- Setar `META_MODE=real`.
- Substituir `MockMetaAdapter` por `RealMetaAdapter` (já stub no código).
- Re-rodar setup pra cada advisor (números mock apagados ou marcados `is_mock=false` após relink).

---

### Notas técnicas

- Vault: `create extension if not exists vault with schema vault;` — disponível em Lovable Cloud.
- Webhook URL gerada: `https://eiprjgotjruiutztjavp.supabase.co/functions/v1/whatsapp-webhook?advisor_id={uuid}`.
- `whatsapp-webhook` precisa `verify_jwt = false` em `supabase/config.toml` (Meta não envia JWT). Outras 2 funções mantêm verify_jwt default.
- Não tocar em `generate-whatsapp-draft` nem no fluxo "Mandei" da Fase 1.
- Não criar números reais na Meta nesta fase — adapter mock simula tudo localmente.
