

## Plano: Usar Imagem Fallback na Página de Detalhe do Anúncio

### Problema
No marketplace, o `ListingCard` usa `getCategoryFallbackImage()` para exibir uma foto de referência quando o anúncio não tem fotos. Porém, na página de detalhe (`/anuncio/:id`), quando não há fotos, aparece uma tela vazia gigante com "Sem fotos disponíveis", desperdiçando todo o espaço above-the-fold e prejudicando a conversão.

### Mudanças

#### `src/pages/ListingDetail.tsx`
- Importar `getCategoryFallbackImage` de `@/lib/categoryImages`
- Na galeria de imagens, quando `listing.images` está vazio, usar a imagem fallback da categoria em vez de mostrar o placeholder vazio
- A imagem principal exibe o fallback; os thumbnails laterais ficam ocultos (não faz sentido mostrar 3 placeholders vazios)
- Resultado: o usuário vê uma foto contextual ao entrar no anúncio, consistente com o que viu no marketplace

### Seção Técnica

| Arquivo | Ação |
|---|---|
| `ListingDetail.tsx` | Usar `getCategoryFallbackImage(listing.category, listing.id)` como fallback na galeria quando não há imagens |

