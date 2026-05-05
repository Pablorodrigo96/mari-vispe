## Root cause confirmado
Edge functions Supabase rodam em rede que **não alcança host direto IPv6** `db.<ref>.supabase.co`. O erro `28P01 password authentication failed` é enganoso — na prática o socket nem completa handshake corretamente. A imagem do dashboard confirma: o caminho recomendado é o **Shared Pooler IPv4**.

## Correção

### 1) Alterar defaults em `supabase/functions/national-search/index.ts`
- `EXTERNAL_DB_HOST` default: `aws-1-us-east-1.pooler.supabase.com`
- `EXTERNAL_DB_USER` default: `postgres.oyarjshdqeaatlmlzvbx` (user com ref embutido — exigência do pooler)
- `EXTERNAL_DB_PORT` default: `5432`
- `EXTERNAL_DB_NAME` default: `postgres`

### 2) Aplicar mesmas mudanças em `cnpj-db-inspect` e `enrich-company-via-rfb`
Para os 3 edge functions baterem no pooler.

### 3) Reabrir campo `EXTERNAL_DB_PASSWORD`
Você cola **apenas a senha** (o que vai no `[YOUR-PASSWORD]` da string do dashboard).

### 4) Validar
- Chamar `national-search` com `{type:"search", query:"VIVO", state:"SP"}`.
- Confirmar response com `companies.length > 0` (não mais `degraded:true`).
- Se falhar de novo, o `diag` no JSON traz código/mensagem exatos do Postgres.

## Aprovação
Aprove para eu sair do plan mode, aplicar as mudanças e reabrir o campo da senha.