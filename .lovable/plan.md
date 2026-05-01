## Problema

Ao rodar a limpeza em `/equity-brain/admin/dedupe`, o erro foi:

```
duplicate key value violates unique constraint "mandates_monday_item_id_key"
```

### Causa raiz

A função `equity_brain._merge_fillup` (helper usado por `merge_mandates`, `merge_buyers`, etc.) faz:

```sql
UPDATE mandates t
SET col = COALESCE(k.col, d.col)   -- para TODAS as colunas
WHERE t.id = p_keep
```

Isso percorre **todas** as colunas, inclusive `monday_item_id`, que tem `UNIQUE`. Quando o canonical (`keep`) tem `monday_item_id = NULL` e o duplicado (`drop`) tem um valor preenchido, o UPDATE tenta gravar esse valor no canonical **antes** de deletar o drop — e a constraint dispara, abortando o merge inteiro.

O mesmo padrão afeta outras tabelas com colunas `UNIQUE` que o `_merge_fillup` também copia:

- `equity_brain.mandates.monday_item_id` (UNIQUE) ← causou o erro
- `equity_brain.advisors_pending_mapping.monday_name` (UNIQUE)
- `equity_brain.company_news.dedupe_hash` (UNIQUE)
- `equity_brain.deals.match_id` (UNIQUE)
- `equity_brain.score_engine_versions.version` (UNIQUE)
- `public.profiles.user_id` (UNIQUE)
- `public.buyer_profiles.source_eb_buyer_id` (UNIQUE)

## Solução

Tornar o `_merge_fillup` **safe-by-default**: ignorar automaticamente colunas que façam parte de qualquer constraint `UNIQUE` (single ou composta) e da PRIMARY KEY. Esses campos não devem ser "preenchidos" pelo duplicado, porque por definição já são identificadores que pertencem a um único registro.

### Migração SQL

Substituir `equity_brain._merge_fillup` por uma versão que:

1. Constrói a lista de colunas a partir de `information_schema.columns`.
2. Subtrai as colunas que aparecem em qualquer constraint `PRIMARY KEY` ou `UNIQUE` (consultando `pg_constraint` + `pg_attribute`).
3. Subtrai também `id`, `created_at`, `updated_at`.
4. Se sobrar alguma coluna, executa o COALESCE como hoje. Senão, faz `RETURN`.

Pseudocódigo da query auxiliar:

```sql
-- colunas "bloqueadas": pk + qualquer unique
SELECT a.attname
FROM pg_constraint c
JOIN pg_attribute a
  ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
WHERE c.conrelid = (p_schema||'.'||p_table)::regclass
  AND c.contype IN ('p','u');
```

A coluna `monday_item_id` cairá nessa lista e será ignorada — o canonical mantém seu próprio valor (ou `NULL`), e o `monday_item_id` do drop vai junto com a linha deletada. Sem violação.

### Reforço no `merge_mandates`

Adicionar um passo extra antes do `_merge_fillup`, **dentro da própria transação**, para garantir consistência mesmo se algum duplicado tiver dado interessante:

```sql
-- se canonical não tem monday_item_id e drop tem, "rouba" antes de deletar
UPDATE equity_brain.mandates
SET monday_item_id = (SELECT monday_item_id FROM equity_brain.mandates WHERE id = p_drop)
WHERE id = p_keep
  AND monday_item_id IS NULL
  AND EXISTS (SELECT 1 FROM equity_brain.mandates WHERE id = p_drop AND monday_item_id IS NOT NULL);

-- limpa o duplicado para liberar a unique
UPDATE equity_brain.mandates SET monday_item_id = NULL WHERE id = p_drop;
```

Esse padrão (steal-then-null) preserva o link com Monday quando útil e nunca colide com a unique. Aplicar o mesmo para `profiles.user_id` é desnecessário (PK lógica) e o helper já vai ignorar.

### Tratamento do erro na UI

Em `DedupeAdminPage.tsx`, envolver a chamada do RPC com try/catch que mostre `error.message` num toast detalhado e continue o batch (não abortar todos os 134 mandates por causa de 1 falha). Hoje um único erro derruba o lote.

## Arquivos

- `supabase/migrations/<novo>_dedupe_fix_unique.sql` — substitui `_merge_fillup` + ajusta `merge_mandates` com o passo steal-then-null.
- `src/pages/equity-brain/DedupeAdminPage.tsx` — torna o batch resiliente: captura erro por par, exibe linha problemática no log e segue para o próximo.

## Validação pós-deploy

1. Rodar novamente "Limpar mandatos duplicados" — deve concluir sem erro.
2. Conferir em `dedupe_audit` que `refs_updated` lista as tabelas repointadas.
3. Verificar contagem: `SELECT COUNT(*) FROM equity_brain.mandates` deve cair em ~134.
4. Confirmar que `monday_item_id` continua único e não-nulo nos sobreviventes que tinham link com Monday.
