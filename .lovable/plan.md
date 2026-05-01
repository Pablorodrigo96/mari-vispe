## Problema

`/equity-brain/hoje` quebra com:
```
invalid input value for enum pipeline_stage: ""
```

A RPC `public.eb_today_cards` usa:
```sql
COALESCE(m.pipeline_stage, '') NOT IN ('closed','won','lost','cancelled','archived')
```

Dois bugs aí:
1. `''` não é valor válido do enum `equity_brain.pipeline_stage` — Postgres tenta castear e falha.
2. Os valores `won`, `lost`, `cancelled`, `archived` também não existem no enum. Os reais são: `match, nbo, due_diligence, spa, closing, closed`.

## Correção

Migration única reescrevendo `eb_today_cards` para tratar o filtro de estágio finalizado de forma type-safe:

```sql
AND (m.pipeline_stage IS NULL OR m.pipeline_stage::text NOT IN ('closed'))
```

Casto `pipeline_stage` para `text` antes do `NOT IN` (evita coerção do literal pro enum) e mantenho só `closed` que é o único terminal real do enum.

Aplico nas duas CTEs (`cooling` e `hot`). Resto da função (joins com `companies` para resolver `codename`, dismissals, etc.) fica igual ao último migration.

## Arquivo

- `supabase/migrations/<timestamp>_fix_pipeline_stage_enum_cast.sql` — `CREATE OR REPLACE FUNCTION public.eb_today_cards` com o filtro corrigido + `GRANT EXECUTE`.

Sem mudanças no frontend nem em edge functions.

## Validação pós-deploy

1. Recarregar `/equity-brain/hoje` — feed deve carregar (mesmo que vazio).
2. `SELECT * FROM public.eb_today_cards(7);` direto no SQL para confirmar que não estoura mais.
