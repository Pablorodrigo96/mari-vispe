# Fase 2/4 — Importador Monday (plano de execução)

## Achados da inspeção (ajustes obrigatórios vs. brief)

Inspecionei o banco antes de planejar. Mantenho 100% do brief, com 4 ajustes técnicos para não quebrar nada:

1. **Schema `equity_brain.companies`** confirma `cnpj`(varchar PK), `razao_social`, `nome_fantasia`, `uf`, `raw_data jsonb`, `qualification_status` (enum: aceita `'unqualified'`), `needs_cnpj_enrichment bool`, `source varchar`. ✅ Compatível com `findOrCreateCompany`.
2. **`buyers.nome`** é a coluna correta (não `nome_completo`). ✅
3. **Enum `mandate_status`** NÃO tem `'ativo'` nem `'concluido'` — só `vigente|vencido|vendemos|em_negociacao|vendeu_sozinho|cancelado`. Brief já está alinhado (usa `vigente`/`vendemos`/`cancelado`).
4. **Função `is_admin()` não existe** — uso `has_role(uid, 'admin'::app_role)` no edge function (igual à Fase 1).

A marca para resolver advisor depois fica como tag em `observacoes` no formato `[mari:monday_responsavel=Nome Completo]` e `[mari:monday_padrinho=Nome]` (em vez de `raw_data` que `mandates` não tem). A função SQL faz match dessa tag.

---

## Migration (curta) — `20260501_monday_import_helpers.sql`

Duas funções SQL:

- **`public.find_user_by_meta_name(text) → uuid`** (SECURITY DEFINER, search_path fixo) — busca em `auth.users.raw_user_meta_data->>full_name|name`. Grant somente `service_role`.
- **`public.eb_resolve_advisor_mapping(monday_name text, user_id uuid) → jsonb`** — admin-only (checa `has_role`), backfilla mandatos que têm tag `[mari:monday_responsavel=<nome>]` ou `[mari:monday_padrinho=<nome>]` em `observacoes`, e marca `advisors_pending_mapping` como resolvido. Grant `authenticated` (faz check interno).

---

## Edge function `eb-import-monday`

**`supabase/functions/eb-import-monday/index.ts`**

- Wrapper `withObservability({ name: "eb-import-monday" })` ✅ registra em `mari_ops.health_check`.
- CORS + auth manual (verifica admin via `has_role` RPC) — função fica com JWT obrigatório implícito.
- Multipart: `file` (xlsx), `type` (sellside|buyside), `mode` (preview|commit), `import_id`.
- Parse com `npm:xlsx@0.18.5` via esm.sh, lê Sheet 1, headers na linha 3, dados a partir da linha 4. Auto-detect via A1.
- **Helpers** (caches por execução): `findAdvisor` (4 passos: profiles exato → meta RPC → fuzzy first+last → registra pendente), `findBuyer` (ilike em `equity_brain.buyers.nome`), `findOrCreateCompany` (3 lookups + stub `PENDING-<sha8>` com `qualification_status='unqualified'`, `needs_cnpj_enrichment=true`, `source='import_monday'`).
- **Parsers**: `parseMoney` (BR `R$ 1.234,56` e US), `parsePct` (`5%` → 5.0; aceita 0.05 → 5), `parseDate` (Excel serial via `XLSX.SSF`, `dd/mm/yyyy`, ISO), `parseUrl` (extrai do hyperlink).
- **Mapeamento Sellside** — 18 colunas (Name, 2x Comprador, Fase, Drive, Status, Datas, Valor, R$ Vispe, %, Executivo, MATCH, Contrato, Estado, Região, Item ID). Refinos: contrato+Concluído→closed/vendemos; contrato+SPA→spa; drive+NBO→nbo. `temperature='cold'` se Fase="Aguardando retorno". Fixos: `deal_type=sellside`, `deal_kind=mandato_assinado`, `imported_from=monday_sellside`, `source=import_monday`.
- **Mapeamento Buyside** — 25 colunas. Mapeia `padrinho_id` (campo NOVO da Fase 1). `cross_sell_flags` = split por `,` ou `;`. `Cliente`→company. `Operação(col 9)`→deal_type (Buyside/Cisão/Fusão/SPA→buyside+spa/Due Diligence→buyside+due_diligence). PT→uf=EX, regiao=Internacional. Fixos: `deal_kind=buyer_mandate`, `imported_from=monday_buyside`.
- **Subitems**: linhas após "Subitems" e sem Item ID viram `mandate_subtasks` vinculadas ao mandato pai mais recente. Status mapeado (concluido/cancelado/bloqueado/em_andamento/pendente).
- **Upsert idempotente**: se `monday_item_id` existe → UPDATE só campos não-null (preserva edições). Senão INSERT.
- **Output preview**: 20 linhas + warnings + advisors_unmapped + companies_to_create.
- **Output commit**: `{ mandates_created, mandates_updated, companies_created, subtasks_created }`.

## Edge function `eb-resolve-advisor-mapping`

**`supabase/functions/eb-resolve-advisor-mapping/index.ts`** — POST `{ monday_name, user_id }`. Auth admin. Chama RPC `eb_resolve_advisor_mapping`. Wrapped com observability.

---

## UIs (3 páginas admin)

### `src/pages/admin/MondayImport.tsx` → rota `/admin/monday-import` (RequireRole admin)
- Estado-máquina: `idle → preview → committing → done`.
- Drag-drop XLSX (input file). Auto-select type via A1 do XLSX (lê client-side com mesma lib).
- Botão "Pré-visualizar" → POST `mode=preview` → mostra: total/válidas/ignoradas, tabela 10 linhas, lista advisors_unmapped, lista companies_to_create, warnings.
- Botão "Confirmar import" → POST `mode=commit` → progress + counters → tela sucesso com link `/admin/monday-parity` e `/admin/advisors-mapping`.

### `src/pages/admin/MondayParity.tsx` → rota `/admin/monday-parity` (RequireRole admin)
- Constante `MONDAY_REFERENCE` (do brief, exata).
- Queries: `count(*)`, agregações por `outcome`/`deal_type`, `sum(valor_operacao)`, `sum(faturamento_vispe)`, `count by responsavel_id` em `equity_brain.mandates` filtrando `imported_from in (monday_sellside, monday_buyside)`.
- Tabela 4 colunas (KPI | Monday | MARI | Δ%). Cores: ✓ verde se Δ=0; ⚠️ amarelo se |Δ|≤5%; 🟧 laranja se ≤15%; ❌ vermelho >15%.
- Click em linha de executivo → drawer com lista de mandatos divergentes (apenas IDs + razao_social).

### `src/pages/admin/AdvisorsMapping.tsx` → rota `/admin/advisors-mapping` (RequireRole admin)
- Lista `equity_brain.advisors_pending_mapping` onde `resolved_user_id IS NULL` ordenado por `occurrences DESC`.
- Cada linha: monday_name + ocorrências + `<select>` dos `profiles` (full_name) + botão "Aplicar".
- Submit: `supabase.functions.invoke('eb-resolve-advisor-mapping', { body: { monday_name, user_id } })`. Toast com `updated_responsavel + updated_padrinho` retornado.
- Refresh automático após cada mapping.

### Navegação
- Adicionar 3 entradas no `src/components/admin/AdminSidebar.tsx` em uma seção nova "Monday Migration": Importar / Paridade / Mapping advisors.
- Adicionar 3 rotas em `src/App.tsx` envolvidas em `<RequireRole role="admin">`.

---

## Critérios de aceite — como vou validar

| Critério | Validação |
|---|---|
| Preview retorna JSON válido | `supabase--curl_edge_functions` mock + verificar shape |
| Commit insere/atualiza | `supabase--read_query` em `mandates` antes/depois |
| Health check registra | `select * from mari_ops.health_check where function_name='eb-import-monday'` |
| Re-import não duplica | Subir mesmo arquivo 2x e contar mandates por monday_item_id |
| Estados nome→UF | "São Paulo"→"SP" (unit test inline + log no preview) |
| `monday_item_id` único | Constraint da Fase 1 garante; valido com query |
| Top-3 executivos batem | `/admin/monday-parity` mostra Δ=0 nos 3 |
| Soma valor_operacao Δ≤1% | Δ exibido na página de paridade |

Como **estamos em planejamento**, não consigo rodar os tests do XLSX real até você aprovar e o build mode liberar `code--exec`. Após approval, vou:
1. Aplicar a migration (helpers SQL).
2. Criar e deployar as 2 edge functions.
3. Criar as 3 páginas + rotas + sidebar.
4. Pedir pra você subir o XLSX em `/admin/monday-import` (preview) e me mostrar o JSON pra eu ajustar mapeamentos antes do commit final.

---

## O que NÃO vou fazer
- ❌ Não toco em edge functions existentes
- ❌ Não invento campos extras nem enums
- ❌ Não chamo SQL raw client-side — toda escrita passa por edge function ou RPC
- ❌ Não avanço pra Fase 3 — paro depois do critério "Top-3 executivos batem com Monday"

Aprova?
