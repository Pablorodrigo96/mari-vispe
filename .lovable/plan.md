## Diagnóstico

O cadastro do anúncio falha no momento de inserir (não no plano). Erros recentes do Postgres:

```
duplicate key value violates unique constraint "listings_ticker_key"
```

`generateTicker()` em `NewListingWizard.tsx` calcula o próximo número via:
```ts
const { count } = await supabase.from('listings').select('*', { count: 'exact', head: true }).like('ticker', `${prefix}%`);
```
Mas a RLS de `listings` só deixa o usuário comum ver **os próprios** anúncios (`auth.uid() = user_id`) ou os com `status='active'`. Para um usuário novo (carlos.bampi@vispe.com.br) o count vem muito menor que o real, gera ex. `TECH02`, e o INSERT explode no índice único.

## Correção

Vamos garantir ticker único via retry server-side, sem mexer em RLS nem em schema.

### 1. `src/components/sell/wizard/NewListingWizard.tsx`

- Reescrever `generateTicker(category)` para devolver um candidato com sufixo aleatório (`PREFIX` + 4 dígitos `0000–9999`), evitando depender do count.
- Em `handleSelectPlan`, envolver o `insert` em um **loop de até 5 tentativas**: se o erro for `23505` (unique violation) em `listings_ticker_key`, regenerar o ticker e tentar de novo. Outros erros caem no catch normal.
- Manter a mensagem de erro detalhada que já existe.

### 2. (Opcional, rápido) Fallback de prefixo

Se a categoria não estiver no `prefixMap`, fazer slug ASCII de até 4 chars maiúsculos antes do número, evitando `Tecnologia & Telecom...` virar prefixo gigante.

## Arquivos afetados

**Editado:**
- `src/components/sell/wizard/NewListingWizard.tsx` (apenas `generateTicker` + `handleSelectPlan`)

## Notas técnicas

- 4 dígitos aleatórios = 10.000 espaços por prefixo; com 5 retries a chance de colisão é < 1 em 10⁹.
- Sem migration, sem mudança de RLS.
- Não toca nada relacionado ao seletor de plano (UI continua igual; o erro só estava aparecendo *depois* do clique no plano).
