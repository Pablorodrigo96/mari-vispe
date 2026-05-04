# Redesign da Tela de Anúncio (`/anuncio/:id`)

Atualmente `src/pages/ListingDetail.tsx` é funcional mas visualmente plano: header simples, galeria 3+1 sem destaque, métricas em 4 quadrados cinzas iguais, CTA discreto. Vamos reposicioná-lo como uma página premium estilo "ficha de oportunidade" — mantendo paleta mari (Carbon/Volt/Bone) e padrões já em uso na plataforma.

## Mudanças no `ListingDetail.tsx`

### 1. Hero imersivo full-bleed
Substituir o cabeçalho atual + galeria 3+1 por um **hero unificado**:
- Imagem principal full-width (h ~ 72vh max-h 640px) com gradiente Carbon→transparente sobreposto na metade inferior.
- Sobre o gradiente, no canto inferior esquerdo: badges (categoria, Master, Verificado, "Novo" se <7 dias), título grande (text-4xl md:text-5xl), localização + ano de fundação em linha discreta.
- Canto superior direito (sobre a imagem): botão "Voltar" translúcido + ações Heart/Share como pills glassmorphism (`bg-white/10 backdrop-blur`).
- Strip de thumbnails horizontais sobreposto na borda inferior do hero (rolagem horizontal em mobile), com indicador de qtd de fotos.
- Suporte a vídeo: se houver `video_url`, botão "Play" sobre a imagem abre lightbox com o player atual.

### 2. Barra "sticky" de KPI + CTA
Logo abaixo do hero, faixa horizontal sticky (top-16) com glass effect contendo:
- Valor pedido em destaque (Volt) à esquerda.
- Mini KPIs inline: Faturamento, Lucro, Margem (com badge colorido).
- Botão primário "Tenho interesse" + secundário WhatsApp à direita.
Some no scroll inicial, fixa quando passa do hero — guia o usuário para conversão em qualquer momento.

### 3. Seção "Métricas Financeiras" reformulada
Trocar os 4 cards cinzas por:
- Grid 4 colunas com cards diferenciados: cada um com ícone colorido em círculo, label menor, valor grande, sub-linha de contexto (ex: "≈ 4.2x EBITDA" embaixo do valor pedido, "+12% vs setor" na margem se possível derivar).
- Card "Valor pedido" maior (col-span-2 em desktop) com gradiente Volt sutil e CTA inline.

### 4. "Sobre o Negócio" com tipografia editorial
- Drop cap na primeira letra, prose com `max-w-prose`, leading-relaxed.
- Bloco lateral pequeno "Destaques" com bullets extraídos de `additional_info` (se existir), separados por divider Mari.

### 5. "Ponto Comercial" e "Localização" lado a lado
Grid 2 colunas (desktop) em vez de empilhados; mapa real com Leaflet vanilla (seguindo padrão do projeto) em vez do placeholder atual com ícone — usa `brazilCoordinates` ou geocoding já existente.

### 6. Sidebar de contato premium
- Card com borda accent sutil, header com avatar/inicial + "Anunciante verificado".
- Trust strip no topo: "Resposta em 24h · Dados protegidos · Sem compromisso".
- Form com inputs com ícones inline (já tem em alguns), spacing maior.
- Dois CTAs empilhados: "Enviar mensagem" (Volt) + "WhatsApp" (outline transparent), bem mais proeminentes.
- Footer do card: contador "X pessoas demonstraram interesse esta semana" (placeholder fixo se não houver dado), link "Reportar anúncio".

### 7. Seção nova: "Negócios similares"
Adicionar no final, antes do Footer, faixa com 3-4 `ListingCard` de mesma categoria/região (query simples em `public_listings` com `.eq('category', ...).neq('id', id).limit(4)`) — aumenta engajamento e tempo na plataforma.

### 8. Skeleton melhorado
Atualizar o loading state para refletir o novo hero (skeleton full-width grande + sticky bar + 2 colunas).

## Padrões respeitados
- Paleta mari (Carbon `#0A0A0A`, Volt `#D9F564`, Bone `#FAFAF7`), glassmorphism via `bg-white/5 backdrop-blur`.
- `break-words` em todo texto longo (regra do projeto).
- `bg-transparent` em botões `variant="outline"` no dark mode.
- Mapa via vanilla Leaflet (useRef/useEffect), não react-leaflet.
- Sem novas dependências.

## Arquivos
- **Editado**: `src/pages/ListingDetail.tsx` (refatoração completa do JSX + skeleton; lógica de fetch/contato/track preservada).
- **Novo (opcional)**: `src/components/listing/ListingHero.tsx`, `src/components/listing/ListingStickyBar.tsx`, `src/components/listing/SimilarListings.tsx` para manter o arquivo legível (~3 componentes pequenos).

## Fora de escopo
- Edição do anúncio (já existe em `EditListing`).
- Mudanças no schema do banco.
- Alterações no fluxo de mensagens (`send-message` edge function).
