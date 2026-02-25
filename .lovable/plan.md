

## Plano: Remover branding Lovable dos meta tags OG e personalizar para PME.B3

### Problema
Quando o link do Blind Teaser é compartilhado no WhatsApp, aparece "Lovable" como autor e referência porque o `index.html` contém `meta name="author" content="Lovable"` e `meta name="twitter:site" content="@Lovable"`.

### Mudanças

#### 1. `index.html` — Atualizar meta tags
- Alterar `meta author` de "Lovable" para "PME.B3"
- Alterar `twitter:site` de "@Lovable" para "@pmeb3" (ou remover)
- Atualizar `og:description` e `twitter:description` para algo mais impactante: "Oportunidades exclusivas de compra e venda de empresas"
- Manter a imagem OG e favicon existentes (já são PME.B3)

#### 2. `src/pages/BlindTeaser.tsx` — Meta tags dinâmicos via `document.title`
- Atualizar `document.title` quando o listing carrega para `"Blind Teaser ${ticker} | PME.B3"`
- Atualizar meta description dinâmicamente via JS para a categoria/estado da empresa

### Limitação técnica
Como é uma SPA, crawlers do WhatsApp só leem o HTML estático do `index.html`. As meta tags dinâmicas via JS não serão capturadas pelo preview do WhatsApp, mas o título e descrição estáticos já mostrarão "PME.B3" corretamente em vez de "Lovable".

### Arquivos modificados

| Arquivo | Ação |
|---|---|
| `index.html` | Remover referências a Lovable, atualizar descrições |
| `src/pages/BlindTeaser.tsx` | Atualizar document.title dinamicamente |

