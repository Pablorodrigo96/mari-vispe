## Bug: Blind Teaser não aparece após criar anúncio

### Diagnóstico

Após `NewListingWizard.handleSelectPlan` criar a listing e navegar para `/teaser/{ticker}`, a página `BlindTeaser.tsx` consulta a view `public_listings` que **filtra apenas `status = 'active'`**:

```sql
SELECT ... FROM listings WHERE status = 'active'
```

Mas no fluxo atual:
- Plano **Basic** → `status = 'active'` ✅ aparece
- Plano **Master** → `status = 'pending_payment'` ❌ teaser fica "não encontrado" / em loading

Confirmado pelo último teste do usuário (linha do banco): `ticker INDU01, plan master, status pending_payment` — não aparece em `public_listings`.

O "erro" no primeiro teste provavelmente foi a mesma causa OU `pendingFinancialFile` nulo OK; o segundo teste é o Basic que renderizou parcialmente. De qualquer forma, a correção principal é o teaser conseguir carregar a listing recém-criada do dono mesmo quando ainda não está `active`.

### Correções

**1. `src/pages/BlindTeaser.tsx` — fallback para o owner**

Quando `public_listings` retorna vazio, fazer um segundo SELECT direto em `listings` filtrando pelo ticker. RLS já garante que apenas o dono (ou advisor/admin) consegue ler quando `status != 'active'`. Para o público externo, segue retornando "não encontrado", o que está correto (anúncio Master sem pagamento ainda não deve ser público).

```ts
let { data, error } = await supabase.from('public_listings')
  .select('*').eq('ticker', ticker).maybeSingle();

if (!data && !error) {
  const { data: ownerData } = await supabase.from('listings')
    .select('id,title,category,description,city,state,neighborhood,asking_price,annual_revenue,annual_profit,equity_score,foundation_year,images,plan,status,ticker,hide_price,sale_reason,additional_info,square_meters,rent_value,iptu_value,created_at,updated_at')
    .eq('ticker', ticker).maybeSingle();
  if (ownerData) data = ownerData as any;
}
```

**2. Banner de status pendente**

Quando `listing.status === 'pending_payment'`, mostrar um banner amarelo no topo do teaser:
> "🔒 Este teaser ainda está em pagamento pendente — só você consegue visualizar. Conclua o pagamento do plano Master para publicar."

Com botão "Concluir pagamento" → `/meus-anuncios` (ou a rota de checkout existente).

**3. `NewListingWizard.tsx` — log do erro real**

No `catch (error)` do `handleSelectPlan`, em vez do toast genérico, logar `error.message` e mostrar no toast: `toast.error('Erro: ' + (error.message || 'tente novamente'))`. Ajuda o usuário a entender o que aconteceu no primeiro teste.

### Arquivos editados
- `src/pages/BlindTeaser.tsx` (fallback owner + banner pending_payment)
- `src/components/sell/wizard/NewListingWizard.tsx` (mensagem de erro detalhada)
