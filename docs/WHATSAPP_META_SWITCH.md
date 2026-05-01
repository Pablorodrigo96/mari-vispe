# WhatsApp / Meta Cloud API — Switch Mock → Real

Este projeto usa um **adapter pattern** para registrar e confirmar números de WhatsApp dos advisors. Hoje rodamos em modo **MOCK** porque a conta Meta do Vispe ainda não está provisionada.

## Onde fica o switch

Arquivo: `supabase/functions/_shared/metaWhatsappAdapter.ts`

A factory escolhe o adapter via env var:

```
META_MODE = "mock"  (default)
META_MODE = "real"  (produção)
```

## Estado atual (MOCK)

- Qualquer número é aceito no `setup-advisor-whatsapp`
- Código SMS fixo: **`123456`**
- Token "registrado" é fake e armazenado no Vault (`eb_store_advisor_token`)
- Coluna `advisor_whatsapp_config.is_mock = true`
- Badge `MOCK` aparece na coluna WhatsApp do `/admin/users`

Números mock atualmente em uso:
- Vitor (Advisor 1): `+5511999991111`
- Pablo (Advisor 2): `+5511999992222`

## Como mudar para REAL quando a Meta estiver pronta

### 1. Pré-requisitos no Meta Business Manager
A Meta **não permite** registrar/verificar números 100% via API. O fluxo obrigatório é:

1. Criar / acessar **WhatsApp Business Account (WABA)** no Business Manager.
2. Adicionar o número de telefone do advisor (Phone Numbers → Add).
3. Verificar via SMS/voz no painel da Meta (uma vez).
4. Gerar **System User Access Token** com permissões `whatsapp_business_messaging` e `whatsapp_business_management`.
5. Anotar `WABA_ID`, `PHONE_NUMBER_ID` (um por advisor) e `APP_SECRET` (para validar webhook).

### 2. Adicionar secrets no projeto

```
META_MODE=real
META_APP_SECRET=...
META_VERIFY_TOKEN=<string aleatória que você escolher>
META_GRAPH_TOKEN=<system user token>
```

Use **Lovable Cloud → Secrets** (nunca commitar).

### 3. Implementar o `RealMetaAdapter`

Em `metaWhatsappAdapter.ts` o stub `RealMetaAdapter` deve:

- `register(phone)` → na verdade só valida que o número já existe na WABA (lookup `GET /{waba_id}/phone_numbers`) e retorna o `phone_number_id`. **Não envia SMS** — Meta já cuidou disso.
- `confirmCode(code, ctx)` → no mundo real esse passo é só uma confirmação do operador admin de que o número está aprovado na Meta. Pode ser substituído por um botão "Marcar como verificado" sem código, ou aceitar um PIN de 6 dígitos do 2FA do número (`POST /{phone_number_id}/register` com `pin`).
- `sendMessage(...)` → `POST https://graph.facebook.com/v20.0/{phone_number_id}/messages` com Bearer token.

### 4. Configurar webhook na Meta

URL: `https://eiprjgotjruiutztjavp.functions.supabase.co/whatsapp-webhook`
Verify token: o mesmo `META_VERIFY_TOKEN` setado nos secrets.
Subscrever campos: `messages`, `message_status`.

A função `whatsapp-webhook` já está com `verify_jwt = false` em `supabase/config.toml` e responde ao GET de verificação.

### 5. Migração dos registros mock

Para cada advisor configurado em mock que vai migrar para real:

```sql
UPDATE public.advisor_whatsapp_config
SET is_mock = false,
    waba_id = '<novo>',
    phone_number_id = '<novo>',
    status = 'active'
WHERE advisor_id = '<uuid>';
```

E rotacione o token chamando `eb_store_advisor_token` (via edge function admin) com o novo token real.

### 6. Validar

1. `/admin/users` → coluna WhatsApp do advisor deve sumir o badge `MOCK`.
2. Enviar mensagem de teste pelo `WhatsAppActionButton` em `/equity-brain/crm/...` → mensagem chega de fato no número do contato.
3. Logs da função `whatsapp-webhook` devem registrar o `message_status = delivered`.

## Rollback

Se algo quebrar em produção, volte `META_MODE=mock` nos secrets — o adapter passa a aceitar qualquer número e o código `123456`. Nenhuma migration precisa ser revertida.
