

## Plano: Corrigir 3 Vulnerabilidades de Segurança (Scan Abril 2026)

O scan encontrou **3 erros** e **2 avisos** ativos. Os 2 avisos (capital_providers admin-only e integrations_config admin-only) são informacionais e serão marcados como reconhecidos. Os 3 erros precisam de correção via migração SQL.

---

### 1. CNPJ e endereço expostos na tabela `listings` (ERROR)

**Problema:** A policy "Public can view active listings" permite consultar diretamente a tabela `listings`, retornando `cnpj`, `cep`, `street` — mesmo que o `public_listings` view omita esses campos. Qualquer cliente pode consultar a tabela base.

**Solução:** Remover a policy "Public can view active listings" da tabela base. O acesso público já funciona via `public_listings` view. Toda a aplicação já usa a view para consultas públicas.

---

### 2. Subscriptions — auto-inserção permite plano grátis (ERROR)

**Problema:** A policy "Users can insert their own subscription" permite que um usuário insira uma row com `plan: 'master'`, `dcf_limit: 999` etc. sem pagamento.

**Solução:** Remover a policy de INSERT para usuários. Subscriptions devem ser criadas apenas pelo service_role (edge functions e triggers). O edge function `verify-payment` e o admin `AdminUsers.tsx` já usam service_role. Nenhum código client-side faz INSERT nesta tabela.

Também remover a policy "Users can update their own subscription" — as atualizações (incrementar `dcf_used`/`multiples_used`) devem passar por edge function. **Atenção:** O frontend em `useValuationAccess.ts` e `useSubscription.ts` atualiza diretamente a tabela. Precisaremos criar uma edge function `use-valuation-credit` para substituir esses updates client-side.

---

### 3. Valuation Purchases — auto-update permite fraude (ERROR)

**Problema:** A policy "Users can update own purchases" permite que um usuário mude `status` de `pending` para `paid` sem pagamento real.

**Solução:** Remover a policy de UPDATE para usuários. O `verify-payment` edge function já usa service_role para inserir purchases com status correto. O frontend em `useValuationAccess.ts` faz `.update({ used_at })` — precisaremos mover isso para a edge function `use-valuation-credit`.

---

### Arquivos Alterados

| Arquivo | Mudança |
|---|---|
| Migração SQL | Remover policies inseguras de listings, subscriptions e valuation_purchases |
| Edge function `use-valuation-credit/index.ts` | Nova edge function para consumir créditos (atualizar subscription counters e marcar purchases como used) |
| `src/hooks/useValuationAccess.ts` | Substituir updates diretos por chamadas à edge function |
| `src/hooks/useSubscription.ts` | Substituir updates diretos por chamadas à edge function |

### Avisos (ignorar com justificativa)

- **capital_providers**: Apenas admin tem acesso — correto.
- **integrations_config**: Apenas admin — correto. Sem funções SECURITY DEFINER que exponham.
- **user_roles_self_insert_missing_check**: Informacional — o trigger `handle_new_user` é SECURITY DEFINER e filtra admin, sem outro path de insert.

