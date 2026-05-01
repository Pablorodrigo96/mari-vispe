## Problema

A página **Compradores** (`/equity-brain/buyers`, usada também pelo wrapper `/equity-brain/compradores`) mostra "0 cadastrados / Nenhum buyer cadastrado neste vertical", mesmo havendo **396 buyers** no banco.

**Causa raiz** (visível nos logs de rede):

```
GET /rest/v1/eb_buyers?select=*,theses:buyer_theses(count),matches:matches(count)
→ 400 PGRST200
"Could not find a relationship between 'eb_buyers' and 'buyer_theses'"
hint: "Perhaps you meant 'eb_buyer_theses' instead of 'buyer_theses'."
```

A query em `src/pages/equity-brain/BuyersPage.tsx:28` referencia tabelas com nomes errados:
- `buyer_theses` → deveria ser `eb_buyer_theses`
- `matches` → deveria ser `eb_matches`

Como a query falha, o `useQuery` retorna erro e a UI cai no fallback "Nenhum buyer".

## Correção

**Arquivo único:** `src/pages/equity-brain/BuyersPage.tsx` (linha 28)

Trocar:
```ts
.select(`*, theses:buyer_theses(count), matches:matches(count)`)
```
por:
```ts
.select(`*, theses:eb_buyer_theses(count), matches:eb_matches(count)`)
```

Caso o relacionamento embutido em `eb_matches` não exista no schema cache (alguns ambientes não têm FK explícita), uso fallback equivalente:
```ts
.select(`*, theses:eb_buyer_theses(count)`)
```
e contagem de matches via segunda query agregada por `buyer_id`. Verifico via `supabase--read_query` qual abordagem funciona antes de commitar.

## Validação

1. Recarregar `/equity-brain/buyers` → lista deve renderizar os 396 buyers.
2. Verificar que `/equity-brain/compradores` (wrapper novo) também funciona, já que reutiliza a mesma página.
3. Confirmar que filtros por vertical e busca continuam ok.
4. Console limpo (sem PGRST200).

Sem mudança de schema, sem migration, sem mexer em RLS — é só corrigir o nome das tabelas no `select` embutido.