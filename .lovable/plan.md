## Fix: "Carregar rankings" não carrega em Top Crescimento e Market Share

### Causa

A edge function `anatel-query` só implementa `action: "stats"` com totais. O front chama `params.kind: "top_growth"` e `"share_by_municipio"`, que cai em "unknown action" silencioso (a função retorna 500 mas o front mostra apenas o estado vazio).

Schema real da tabela `base_anatel`: `ano`, `mês` (com acento), `empresa`, `cnpj`, `estado`, `cidade`, `acessos` (todos `text`).

### Mudanças

**`supabase/functions/anatel-query/index.ts`** — expandir o `case "stats"` para suportar 3 valores de `kind`:

1. **`total`** (já existe) — count.

2. **`top_growth`** — Top 50 ISPs por crescimento de acessos:
   - Descobre 2 períodos (último e 12m atrás) via `SELECT DISTINCT ano, "mês" ORDER BY DESC`.
   - CTE `cur` (período atual) + `prev` (12m atrás), agrupando por `cnpj`, somando `acessos` (cast `text → bigint` via `regexp_replace`).
   - Calcula `delta_pct = (atual - prev) / prev * 100`.
   - Retorna `{ cnpj, empresa, acessos_atual, acessos_prev, delta_pct }`.

3. **`share_by_municipio`** — Líder + concorrentes por cidade:
   - Window function `ROW_NUMBER() OVER (PARTITION BY cidade, estado ORDER BY acessos DESC)` para pegar líder.
   - Retorna `{ cidade, estado, acessos, n_provedores, lider, lider_cnpj, share_lider }`.

Ambas usam `"mês"` (entre aspas, acento), `regexp_replace(acessos,'[^0-9-]','','g')::bigint` para converter texto numérico, e LIMIT parametrizado.

### Resultado

Ao clicar **Carregar rankings** na aba Top Crescimento e Market Share, as tabelas serão preenchidas com dados reais da `base_anatel`.