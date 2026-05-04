## Problema

1. **Permissões muito amplas**: vendedor (role `seller`) está vendo Cockpit Interno, Equity Brain, Dashboards (Executivo/Mandato/Match/NBO), grupo "Mandatos (tabela)" e "Parcerias" no sidebar. Esses só deveriam aparecer para `admin`/`advisor`.
2. **Menu mal organizado pra vendedor**: o grupo "Comprar" aparece solto no topo. Para um vendedor, o atalho "Compradores compatíveis" (que é interesse legítimo dele) deveria viver dentro de "Vender", não num grupo separado que sugere que ele já é comprador.
3. **Cadastro de comprador**: ao clicar em "Cadastrar comprador" o vendedor deve ir pra `/cadastrar-comprador` (já existe) e, ao concluir, ganhar a role `buyer` — só então o grupo "Comprar" completo (matching + resultados) aparece.
4. **Valuation não salvou e consumiu crédito grátis**: em `ValuationWizard.tsx` (linhas 174–187) o `insert` em `valuation_history` não checa `error`. Se o insert falha (RLS, rede, validação), o catch genérico não dispara porque `supabase-js` retorna o erro no objeto, não em throw — e em seguida `consumeMultiplesAccess()` é chamado, queimando o crédito. Mesmo bug em `DCFWizard.tsx` (linhas 179–191).

## Escopo da mudança

### A. Sidebar por role (`src/components/layout/AppSidebar.tsx`)

Definir um vendedor "puro" como: tem `seller` e **não** tem `buyer`/`advisor`/`admin`/`franchisee`/`isPartnerAccountant`.

```text
Visão Geral        → todos
Marketplace        → todos
Vender             → seller (e quem mais tiver)
  ├─ Meus anúncios
  ├─ Anunciar empresa
  └─ Compradores compatíveis ← MOVIDO pra cá quando user é seller-puro
Comprar            → só se isBuyer (matching + resultados);
                     se NÃO é buyer mas é seller, mostrar item único
                     "Cadastrar como comprador" (CTA fora do grupo Vender)
Valuation          → todos
Capital            → todos
Parcerias          → advisor | partnerAccountant | franchisee | admin   (já ok)
Mandatos (tabela)  → admin | advisor                                    (já ok)
Dashboards         → admin | advisor                                    (já ok)
Cockpit Interno    → admin | advisor                                    (já ok)
```

Lógica nova:
- `isSellerOnly = isSeller && !isBuyer && !isAdvisor && !isAdmin && !isFranchisee && !isPartnerAccountant`
- Se `isSellerOnly`: injeta `{ name: 'Compradores compatíveis', href: '/matching', icon: Target }` como 3º filho do grupo `sell`. Substitui o grupo `buy` por um único atalho "Cadastrar como comprador" (item solo, pode ser um sub-card no fim do grupo Vender ou item no rodapé).
- Os grupos `dashboards`, `mandatos_tabela`, `partners` e o bloco "Cockpit Interno" continuam protegidos por `isAdmin || isAdvisor` — eles já estão, mas a ordem do `if` em torno de `groups.push({...}, {...})` (linha 102–119) está sintaticamente errada: o segundo objeto está fora do array de push. Corrigir pra dois `push` separados.

### B. Route guards (`src/App.tsx`)

Hoje `/equity-brain/*`, `/dashboard/*` e `/admin/*` já usam `RequireRole`. Precisamos auditar:
- Confirmar que **todas** as rotas `/equity-brain/...` estão envolvidas em `RequireRole roles={["admin","advisor"]}`. Se alguma estiver solta, embrulhar.
- Confirmar `/parceiro`, `/potencial-carteira` exigem `advisor|admin|franchisee|partnerAccountant`. Adicionar `RequireRole` se faltar.
- `/matching`, `/matching/resultados`, `/cadastrar-comprador` ficam abertos pra qualquer logado (vendedor pode chegar via "Cadastrar como comprador").

### C. Cadastro de comprador estende perfil

`src/pages/RegisterBuyer.tsx` (já existe) — ao concluir o cadastro com sucesso, chamar uma edge function (ou `INSERT` direto) que:
1. Insere em `buyer_profiles` (já faz).
2. Adiciona role `buyer` em `public.user_roles` para `auth.uid()` (via edge function com service role, pra não depender de policy de insert na tabela). Idempotente (`ON CONFLICT DO NOTHING`).
3. Invalida `useQuery(['user-roles', user.id])` no client → sidebar reage e libera grupo "Comprar" completo.

Pré-preencher o form com `profiles.full_name`, `phone`, `city`, `state`, `cpf_cnpj` do user já logado (campos extras: budget, categories, descrição).

### D. Valuation: refund de crédito em falha

`src/components/valuation/ValuationWizard.tsx` (linhas ~158–197):

```ts
const { data: insertedValuation, error: insertError } = await supabase
  .from('valuation_history')
  .insert([{ ... }])
  .select('id')
  .single();

if (insertError || !insertedValuation) {
  console.error('Falha ao salvar valuation', insertError);
  toast.error('Não conseguimos salvar seu valuation. Seu crédito foi preservado, tente novamente.');
  return; // NÃO consome crédito
}

setLastValuationId(insertedValuation.id);
const consumed = await consumeMultiplesAccess();
if (!consumed) {
  // edge case: salvou mas não consumiu — log e segue (admin tolera)
  console.warn('Valuation salvo, mas crédito não consumido', insertedValuation.id);
}
```

Mesma correção em `src/components/valuation/DCFWizard.tsx`.

### E. Refund retroativo do usuário atual

O usuário relatou que perdeu o crédito grátis. Após deploy:
- Identificar o user via `auth.uid()` informado pelo usuário (precisarei do email; assumir que é o mesmo logado agora e ajustar via SQL/insert tool).
- `UPDATE subscriptions SET multiples_used = GREATEST(multiples_used - 1, 0) WHERE user_id = '<id>'` — feito via migration de data (insert tool).

### F. Memória

Atualizar `mem://index.md` Core com regra: "Sidebar é estritamente role-based; vendedor-puro NÃO vê EB/Cockpit/Dashboards. 'Compradores compatíveis' fica dentro de 'Vender' pra seller-only."

## Fora de escopo

- Refatorar todo o EquityBrainLayout (já tem guard próprio).
- Reescrever o cálculo de valuation.
- Mudar planos/preços.

## Arquivos tocados

- `src/components/layout/AppSidebar.tsx` (reorganização role-aware)
- `src/App.tsx` (verificar/ajustar `RequireRole` faltantes)
- `src/components/valuation/ValuationWizard.tsx` (error handling + refund)
- `src/components/valuation/DCFWizard.tsx` (error handling + refund)
- `src/pages/RegisterBuyer.tsx` (atribuir role buyer ao concluir)
- nova edge function `assign-buyer-role` (service role, idempotente)
- migration de data: refundar `multiples_used` do usuário afetado
- `mem://index.md` + nova memória `mem://constraints/sidebar-role-strict.md`
