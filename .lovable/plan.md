## Objetivo
Criar um campo dedicado **só para a senha** do banco RFB, separado da connection string completa. Você cola apenas a senha pura (ex: `vivekdb...`), sem precisar lidar com `postgresql://`, `@`, `?sslmode=require`, etc.

## Mudanças

### 1) Edge function `supabase/functions/national-search/index.ts`
Trocar a leitura de `EXTERNAL_DB_URL` por uma montagem a partir de variáveis separadas:

- `EXTERNAL_DB_PASSWORD` (novo secret, **só a senha**)
- `EXTERNAL_DB_HOST` (opcional, default `db.oyarjshdqeaatlmlzvbx.supabase.co`)
- `EXTERNAL_DB_USER` (opcional, default `postgres`)
- `EXTERNAL_DB_NAME` (opcional, default `postgres`)
- `EXTERNAL_DB_PORT` (opcional, default `5432`)

A função monta:
```
postgresql://${USER}:${encodeURIComponent(PASSWORD)}@${HOST}:${PORT}/${DB}?sslmode=require
```

`encodeURIComponent` resolve qualquer caractere especial automaticamente. Mantém o fallback antigo (`EXTERNAL_DB_URL`) por compatibilidade — se você só preencher `EXTERNAL_DB_PASSWORD`, ela tem prioridade.

### 2) Aplicar o mesmo padrão em `cnpj-db-inspect` e `enrich-company-via-rfb`
Para os três edge functions consumirem o mesmo secret e ficarem consistentes.

### 3) Pedir o secret `EXTERNAL_DB_PASSWORD`
Após implementar, abro o diálogo `add_secret` para você colar **apenas a senha** (nada mais — sem `postgres:`, sem `@host`, sem `?sslmode`).

### 4) Validar
Chamar `national-search` com `{type:"search", query:"VIVO", state:"SP"}` e confirmar que retorna empresas reais (não mais `degraded: true`).

## O que NÃO muda
- Schema do banco, lógica de mapeamento CNAE, cache, RLS, planos pagos.
- O fallback BrasilAPI por CNPJ direto continua funcionando.
- O secret antigo `EXTERNAL_DB_URL` segue suportado (não precisa apagar).

## Aprovação
Aprove este plano para eu implementar e abrir o campo `EXTERNAL_DB_PASSWORD` para você colar a senha.