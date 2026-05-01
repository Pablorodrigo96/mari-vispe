## Diagnóstico

Varredura completa nas tabelas-chave detectou o seguinte volume de duplicatas:

| Entidade | Critério | Linhas extras |
|---|---|---|
| `equity_brain.companies` (CNPJ) | exato | 0 ✅ |
| `equity_brain.listings` (CNPJ) | exato | 0 ✅ |
| `equity_brain.buyers` (CNPJ) | exato | 0 ✅ |
| **`equity_brain.mandates`** (mesmo `company_cnpj`, mesmo `deal_type`/`deal_kind`) | ativos: **134** · todos: **209** |
| `equity_brain.buyers` (mesmo nome normalizado) | 5 |
| `equity_brain.contacts` (mesmo email dentro da mesma entidade) | 38 |
| `equity_brain.contacts` (mesmo telefone dentro da mesma entidade) | 354 |
| `public.buyer_profiles` (mesmo user + nome) | 4 |

Amostragem confirma que são **ruído real de import** (mandates com mesmo CNPJ, mesma fase, mesmo valor, criados com 2 minutos de diferença em 30/04 e re-importados em 01/05). Não são sellside vs buyside legítimos.

Não existem foreign keys físicas, mas há referências lógicas em: `deals.mandate_id`, `mandate_subtasks`, `mandate_summaries`, `pipeline_transitions`, `whatsapp_*`, `crm_activities.contact_id`, `matches.buyer_id`, `deal_events.buyer_id`, `buyer_profiles.source_eb_buyer_id` etc. **Qualquer dedupe precisa repontar essas referências antes de apagar**, senão quebra o histórico.

## Estratégia (segura e auditável)

### Princípios
1. **Eleger o "sobrevivente"** (canonical) por: mais antigo OU com mais dados preenchidos OU com `responsavel_id` definido.
2. **Repontar** todas as FKs lógicas do duplicado → canonical antes de apagar.
3. **Soft delete + auditoria** em vez de DELETE direto, para permitir reversão por 30 dias.

### Implementação

#### 1. Migration — infraestrutura de dedupe
- Criar tabela `equity_brain.dedupe_audit` com colunas: `id`, `entity_type`, `kept_id`, `removed_id`, `merged_at`, `merged_by`, `reason`, `payload jsonb` (snapshot completo da linha removida).
- Criar função `equity_brain.merge_mandates(p_keep uuid, p_drop uuid)` (SECURITY DEFINER, restrita a admin) que:
  1. Loga a linha `p_drop` em `dedupe_audit`.
  2. Atualiza `deals.mandate_id`, `mandate_subtasks.mandate_id`, `mandate_summaries.mandate_id`, `pipeline_transitions.mandate_id`, `whatsapp_action_log.mandate_id`, `whatsapp_messages.mandate_id`, `eb_pipeline_transitions.mandate_id` de `p_drop` → `p_keep`.
  3. Faz "fill-up" em `p_keep`: para cada coluna NULL em `p_keep` mas preenchida em `p_drop`, copia o valor (não sobrescreve dados existentes).
  4. DELETE da linha `p_drop`.
- Criar funções equivalentes: `merge_buyers(p_keep, p_drop)`, `merge_contacts(p_keep, p_drop)`, `merge_buyer_profiles(p_keep, p_drop)`.

#### 2. Migration — execução em lote
SQL idempotente que, para cada grupo duplicado, escolhe o canonical por:
```text
ORDER BY (responsavel_id IS NOT NULL) DESC,
         (valor_operacao IS NOT NULL) DESC,
         (jsonb_count_non_nulls(row_to_jsonb(m))) DESC,
         created_at ASC
LIMIT 1
```
e chama `merge_*` para cada `p_drop` do grupo. Regras por entidade:

- **Mandates**: agrupar por `(company_cnpj, COALESCE(deal_type::text,''), COALESCE(deal_kind::text,''))`. **Excluir do grupo** os já cancelados (deixar como histórico). Esperado: ~134 linhas extras removidas.
- **Buyers**: agrupar por `lower(trim(nome))` quando CNPJ NULL nos dois. Esperado: 5 linhas.
- **Contacts**: agrupar por `(entity_type, entity_id, lower(email))` e por `(entity_type, entity_id, telefone normalizado)`. Esperado: ~390 linhas (muitas se sobrepõem).
- **buyer_profiles**: agrupar por `(user_id, lower(buyer_name))`. Esperado: 4 linhas.

#### 3. Trigger anti-recidiva
Criar UNIQUE INDEX parcial para impedir recriação:
- `mandates`: `UNIQUE (company_cnpj, deal_type, deal_kind) WHERE status NOT IN ('cancelado','concluido') AND company_cnpj IS NOT NULL`
- `contacts`: `UNIQUE (entity_type, entity_id, lower(email)) WHERE email IS NOT NULL`
- `contacts`: `UNIQUE (entity_type, entity_id, telefone_normalizado) WHERE telefone_e164 IS NOT NULL` — usando coluna gerada `telefone_normalizado`.
- `buyer_profiles`: `UNIQUE (user_id, lower(buyer_name))`.

#### 4. UI — painel "Limpeza de Duplicatas"
Nova rota `/equity-brain/admin/dedupe` (admin only):
- Cards por entidade mostrando "X grupos / Y duplicatas detectadas" em tempo real (RPC `get_dedupe_stats`).
- Botão "Executar limpeza segura" → roda RPC `run_safe_dedupe()` (chama os `merge_*` em lote dentro de uma transação).
- Tabela de histórico com últimos `dedupe_audit` (kept_id, removed_id, quem fez, quando, link "Restaurar" que recria a linha do payload).
- Item no `EBSidebar` accordion Admin: "Limpeza de duplicatas" (ícone `Copy`).

### Confirmação antes de apagar

A migration #2 (execução em lote) **não roda automaticamente**. Após criar a infra, abro o painel e você clica "Executar limpeza segura" para os 4 escopos, individualmente. Cada execução fica auditada em `dedupe_audit` e pode ser revertida.

## Arquivos a criar/editar

- **Migration 1**: cria `dedupe_audit` + funções `merge_mandates/buyers/contacts/buyer_profiles` + `get_dedupe_stats()` + `run_safe_dedupe(p_entity text)`.
- **Migration 2**: índices únicos parciais para prevenção.
- `src/pages/equity-brain/DedupeAdminPage.tsx` (nova).
- `src/App.tsx` — adicionar rota `admin/dedupe`.
- `src/components/equity-brain/EBSidebar.tsx` — adicionar item no accordion Admin.

## Fora do escopo

- Não vou tocar em `valuation_history` (registros financeiros legais não devem ser deduplicados).
- Não vou tocar em `crm_activities`, `whatsapp_messages`, `deals` diretamente — só repontar FKs.
- Não vou apagar mandates **cancelados** (mesmo que duplicados de um vigente) — viram histórico.
- Não vou alterar duplicidades de `companies` ou `listings` por enquanto (zero detectadas).
