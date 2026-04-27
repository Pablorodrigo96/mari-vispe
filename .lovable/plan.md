## Plano: Bootstrap do módulo Equity Brain

Estado atual verificado no banco:
- `pg_cron` 1.6.4 já está ativa
- `vector` e `pg_net` ainda NÃO estão instaladas
- Schema `equity_brain` ainda NÃO existe

Vou executar uma única migration consolidada com 2 blocos:

### Bloco 1 — Ativar extensões faltantes

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
```

`pg_cron` permanece com `IF NOT EXISTS` (no-op, já ativa). `vector` (pgvector) habilita embeddings para o motor de IA. `pg_net` habilita chamadas HTTP assíncronas a partir do Postgres (úteis para webhooks/edge functions agendadas).

### Bloco 2 — Criar schema isolado `equity_brain`

```sql
CREATE SCHEMA IF NOT EXISTS equity_brain;

GRANT USAGE ON SCHEMA equity_brain TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA equity_brain
  GRANT SELECT ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA equity_brain
  GRANT ALL ON TABLES TO service_role;
```

Schema separado garante que o motor Equity Brain evolua sem colidir com `public` (marketplace, valuations, capital, parcerias). RLS continuará sendo definido por tabela conforme o módulo for crescendo.

### Bloco 3 — Verificação pós-migration

Após aplicar, vou rodar:

```sql
SELECT extname, extversion FROM pg_extension
WHERE extname IN ('vector','pg_cron','pg_net');

SELECT schema_name FROM information_schema.schemata
WHERE schema_name = 'equity_brain';
```

E retorno os resultados completos para você confirmar.

### Observações

- Nenhuma tabela existente é alterada
- Nenhum dado é movido ou removido
- Nenhuma RLS atual é tocada
- Operação 100% aditiva e reversível (`DROP EXTENSION` / `DROP SCHEMA`)
- `pg_net` e `vector` são extensões oficialmente suportadas pelo Supabase
