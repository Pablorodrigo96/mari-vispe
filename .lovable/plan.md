## Contexto

A tabela `public.whatsapp_messages` já tem RLS que restringe SELECT a `advisor_id = auth.uid()` ou admin. O único consumer do canal Realtime é `src/pages/admin/AdminWhatsAppMonitor.tsx` (rota admin), usando `postgres_changes` — e o Postgres Changes do Realtime respeita o RLS da tabela, então payloads não vazam.

Mesmo assim, o scanner aponta (corretamente) que **qualquer authenticated consegue abrir o canal** `whatsapp_messages_admin` ou usar `topic:whatsapp_messages:*`. A inscrição em si não retorna dados sensíveis hoje, mas é defense-in-depth fraco. A correção recomendada é usar **Realtime Authorization** (RLS na tabela `realtime.messages`) para restringir o *subscribe*.

## Plano

### 1. Migration — RLS no `realtime.messages`

Habilitar RLS na tabela `realtime.messages` (se ainda não estiver) e adicionar policy que só deixa admin ou advisor com WhatsApp conectado se inscrever em tópicos que começam com `whatsapp_messages`.

```sql
ALTER PUBLICATION supabase_realtime SET (publish = 'insert,update,delete');
-- garante que realtime.messages está com RLS
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wa_realtime_subscribe_admin_or_advisor"
ON realtime.messages FOR SELECT
TO authenticated
USING (
  (realtime.topic() LIKE 'whatsapp_messages%') 
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.advisor_whatsapp_config
      WHERE advisor_id = auth.uid()
    )
  )
);
```

Observação: políticas em `realtime.messages` afetam apenas tópicos que usam o *private channel* do Realtime (`{ private: true }`). Tópicos públicos continuam abertos. Por isso o passo 2 é obrigatório.

### 2. Frontend — usar canal privado

Em `src/pages/admin/AdminWhatsAppMonitor.tsx` (linha 256), trocar:

```ts
supabase.channel("whatsapp_messages_admin")
```

por:

```ts
supabase.channel("whatsapp_messages_admin", { config: { private: true } })
```

Sem outras mudanças — `postgres_changes` continua funcionando igual; o que muda é que o subscribe agora exige passar pela policy de `realtime.messages`.

### 3. Validação

- Logar como admin → AdminWhatsAppMonitor deve continuar recebendo updates em tempo real.
- Logar como buyer/seller comum e tentar `supabase.channel('whatsapp_messages_x', { config: { private: true } }).subscribe()` no console → deve retornar `CHANNEL_ERROR`.
- Rodar linter Supabase para confirmar que o finding `whatsapp_messages_realtime_no_channel_policy` foi resolvido.

### 4. Memória de segurança

Atualizar `@security-memory` registrando que canais Realtime do `whatsapp_messages` agora usam private channel + policy em `realtime.messages`, e remover/atualizar a justificativa antiga do finding ignorado.

## Arquivos afetados

- Nova migration SQL (RLS em `realtime.messages`).
- `src/pages/admin/AdminWhatsAppMonitor.tsx` (1 linha — adicionar `{ config: { private: true } }`).
- Atualização da security memory.
