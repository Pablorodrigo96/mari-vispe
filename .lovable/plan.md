

## Plano: Botoes de compartilhamento do Blind Teaser em "Meus Anuncios"

### O que sera feito

Adicionar opcoes de compartilhamento do link do Blind Teaser (WhatsApp, email e copiar link) no dropdown de acoes de cada anuncio na pagina "Meus Anuncios".

### Mudancas

#### 1. Modificar `src/pages/MyListings.tsx`

**Adicionar `ticker` ao modelo e a query:**
- Incluir `ticker` na interface `Listing` e na query do Supabase (`select`)

**Adicionar icones:**
- Importar `Share2`, `Copy`, `Mail`, `MessageCircle` do lucide-react

**Adicionar itens no DropdownMenu de cada listing (apos "Visualizar"):**

Somente exibir se o listing tiver um `ticker`:

- **Ver Blind Teaser** — navega para `/teaser/:ticker`
- **Compartilhar via WhatsApp** — usa o helper `getWhatsAppLink` existente em `src/lib/whatsapp.ts` com mensagem personalizada contendo o link do teaser e abre em nova aba
- **Compartilhar por Email** — abre `mailto:` com subject e body contendo o link do teaser
- **Copiar Link do Teaser** — copia a URL completa do teaser para a area de transferencia e exibe toast de confirmacao

**Separador visual:**
- Adicionar um `DropdownMenuSeparator` entre as acoes de compartilhamento e as acoes de gerenciamento (editar, pausar, excluir)

**Construcao da URL do teaser:**
- Usar `window.location.origin + '/teaser/' + listing.ticker` para gerar a URL completa

### Secao Tecnica

**Arquivos modificados:**

| Arquivo | Acao |
|---|---|
| `src/pages/MyListings.tsx` | Adicionar ticker na query, icones e itens de compartilhamento no dropdown |

**Nenhuma mudanca de banco de dados necessaria** — o campo `ticker` ja existe na tabela `listings`.

