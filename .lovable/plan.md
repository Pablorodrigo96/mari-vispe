# Fase 1/4 — Schema: Paridade Monday

## Achados da inspeção (ajustes vs. brief original)

Inspecionei o banco antes de planejar e encontrei 3 divergências do brief que precisam ser endereçadas pra migration não falhar:

1. **`mari_ops` já existe** (Fase 0 de observabilidade já rodou). As tabelas `health_check`, `smoke_tests`, `model_metrics` e a view `health_summary_24h` já estão criadas. → **Pulo o bloco 4** do brief (idempotente já está garantido pela infra existente). Apenas valido que existem.

2. **`public.is_admin()` NÃO existe**. O projeto usa `public.has_role(auth.uid(), 'admin'::app_role)`. → **Substituo todas as chamadas `is_admin()`** das policies por `has_role(auth.uid(), 'admin'::app_role)` (padrão consistente com todas as outras tabelas do projeto — ver `eb_pipeline_stages`, `franchisee_regions`, etc.).

3. **`equity_brain.mandates` já tem** `co_advisor_ids`, `origin_advisor_id`, `responsavel_id`. ✅ Compatível com a policy de subtasks proposta.

Nenhum dos 5 campos novos em mandates (`padrinho_id`, `cross_sell_flags`, `monday_item_id`, `imported_from`, `imported_at`) existe — todos serão adicionados.

---

## Migration: `20260501_monday_parity.sql`

### Bloco 1 — Campos novos em `equity_brain.mandates`
- `padrinho_id uuid` → FK para `auth.users(id)` ON DELETE SET NULL (executivo padrinho do Buyside Monday)
- `cross_sell_flags text[]` default `'{}'` (valuation, captacao, sucessao…)
- `monday_item_id text UNIQUE` (re-imports incrementais idempotentes)
- `imported_from text` (origem do import: "monday_buyside", "monday_sellside"…)
- `imported_at timestamptz`
- 3 índices parciais: `padrinho_id`, `monday_item_id`, `(imported_from, imported_at)`
- COMMENT em cada coluna nova

### Bloco 2 — Tabela `equity_brain.mandate_subtasks`
Subelementos do Monday. Colunas exatamente como no brief: `id`, `mandate_id` (FK CASCADE), `name`, `etapa`, `responsavel_id` (FK SET NULL), `status` (CHECK: pendente|em_andamento|concluido|cancelado|bloqueado), `data_entrega`, `arquivos_url text[]`, `anotacoes`, `monday_subitem_id`, `ordem`, `created_by`, `created_at`, `updated_at`.

3 índices: `mandate_id`, `responsavel_id`, `monday_subitem_id` (parcial).

**RLS** (ajustado pra usar `has_role` em vez de `is_admin`):
- `SELECT`: usuário tem acesso ao mandato (responsavel/padrinho/origin_advisor/co_advisor) **OU** admin
- `INSERT`: responsavel ou padrinho do mandato OU admin
- `UPDATE`: o próprio responsável da subtask OU dono do mandato OU admin
- `DELETE`: somente admin

Trigger `tg_subtasks_updated_at` mantendo `updated_at`.

### Bloco 3 — Tabela `equity_brain.advisors_pending_mapping`
Buffer de nomes do Monday que ainda não foram resolvidos pra `auth.users`. Colunas como no brief: `monday_name UNIQUE`, `occurrences`, `resolved_user_id`, `resolved_at`, `resolved_by`, `first_seen_at`, `last_seen_at`.

RLS: única policy `ALL` para admin (`has_role`).

### Bloco 4 — `mari_ops` (PULADO)
Já existe. Apenas adiciono no fim da migration uma verificação `DO $$ ... RAISE NOTICE` confirmando presença (não-bloqueante).

---

## Rollback: `20260501_monday_parity_rollback.sql`
Arquivo separado (apenas referência — não rodado automaticamente). Drop das 2 tabelas novas e das 5 colunas novas em mandates. **Não dropa `mari_ops`** (já existia antes da Fase 1).

```sql
DROP TABLE IF EXISTS equity_brain.mandate_subtasks CASCADE;
DROP TABLE IF EXISTS equity_brain.advisors_pending_mapping CASCADE;
ALTER TABLE equity_brain.mandates 
  DROP COLUMN IF EXISTS padrinho_id,
  DROP COLUMN IF EXISTS cross_sell_flags,
  DROP COLUMN IF EXISTS monday_item_id,
  DROP COLUMN IF EXISTS imported_from,
  DROP COLUMN IF EXISTS imported_at;
```

---

## Validação dos critérios de aceite

| Critério | Como valido |
|---|---|
| Migration aplica sem erro | Ferramenta de migration retorna sucesso |
| Rollback testado | Rodar SQL do rollback manual em staging via `read_query` (DDL só roda em migration, então valido a sintaxe + idempotência dos `IF EXISTS`) |
| `mandate_subtasks` criada | `SELECT FROM information_schema.tables` |
| `advisors_pending_mapping` criada | idem |
| `mari_ops.health_check` existe | já validado — existe |
| `health_summary_24h` retorna | já validado — existe |
| RLS subtasks isolada | Confirmar 4 policies criadas via `pg_policies` |
| `monday_item_id` UNIQUE | Confirmar constraint via `information_schema.table_constraints` |
| Trigger `updated_at` ativo | Confirmar via `pg_trigger` |

---

## O que NÃO vou fazer (respeitando regras globais)
- ❌ Não toco em edge functions existentes
- ❌ Não invento campos extras
- ❌ Não modifico mandates além das 5 colunas listadas
- ❌ Não recrio `mari_ops` (já existe)
- ❌ Não avanço pra Fase 2 — paro e aguardo seu OK

---

## Detalhes técnicos finais
- **1 arquivo** de migration: `supabase/migrations/<timestamp>_monday_parity.sql`
- **1 arquivo** de referência: `supabase/migrations/_rollback/20260501_monday_parity_rollback.sql` (apenas documentação — não é migration ativa)
- Todas as policies usam `has_role(auth.uid(), 'admin'::app_role)` no lugar de `is_admin()`
- Sem mudanças em código TS/React nesta fase

Aprova rodar a migration?
