

## Plano: Corrigir compartilhamento via WhatsApp em Meus Anuncios

### Problema

O codigo atual usa `window.open(url, '_blank')` que e bloqueado dentro do iframe de preview. O helper `openWhatsApp` em `src/lib/whatsapp.ts` ja trata esse caso (usa `_top` quando detecta iframe, e copia para clipboard como fallback), mas nao esta sendo utilizado.

### Mudanca

#### Modificar `src/pages/MyListings.tsx`

- Importar `openWhatsApp` ao inves de `getWhatsAppLink`
- No item "Compartilhar via WhatsApp", substituir `window.open(getWhatsAppLink(msg), '_blank', ...)` por uma chamada a `openWhatsApp(msg)` com tratamento do retorno:
  - Se retornar `true`: WhatsApp abriu com sucesso
  - Se retornar `false`: link foi copiado para a area de transferencia — exibir toast informando

### Secao Tecnica

| Arquivo | Acao |
|---|---|
| `src/pages/MyListings.tsx` | Trocar `getWhatsAppLink` por `openWhatsApp` e adicionar toast de fallback |

