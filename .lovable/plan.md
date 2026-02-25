

## Plano: Corrigir Vazamento de Texto em "Sobre o Negócio"

### Problema
O texto na seção "Sobre o Negócio" na página de detalhe do anúncio não quebra linha quando contém palavras muito longas (sem espaços), vazando para fora do card.

### Causa
O parágrafo usa `whitespace-pre-wrap`, que preserva quebras de linha mas não força quebra de palavras longas. Falta a classe `break-words` (CSS `overflow-wrap: break-word`) para forçar a quebra.

### Mudança

#### `src/pages/ListingDetail.tsx`
- Adicionar `break-words` ao `<p>` da descrição do negócio, mudando de `whitespace-pre-wrap` para `whitespace-pre-wrap break-words`

| Arquivo | Ação |
|---|---|
| `ListingDetail.tsx` | Adicionar classe `break-words` no parágrafo da descrição |

