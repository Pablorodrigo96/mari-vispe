

## Plano: Responsividade Mobile do Blind Teaser + Contador de Visualizações nos Meus Anúncios

### Parte 1: Responsividade Mobile do Blind Teaser

Problemas identificados no mobile (390px):
- Hero ocupa 80vh — muito espaço vazio no mobile
- Arcos SVG decorativos (600px de largura) ficam desproporcionais em telas pequenas
- Ticker badge com texto muito grande (text-3xl em mobile)
- Seção Introdução: grid 5 colunas colapsa mas mapa do Brasil fica grande demais
- KPI cards: padding excessivo, texto poderia ser mais compacto
- Seção Detalhes: cards com padding e fonte grandes demais
- Seção Contato: espaçamento interno excessivo (py-24, p-10)
- Chart labels cortados no mobile (R$ 82.000,00 fica apertado)

#### Mudanças por arquivo:

**`src/components/teaser/TeaserHero.tsx`**
- Reduzir `min-h-[80vh]` para `min-h-[60vh] sm:min-h-[80vh]`
- Reduzir largura dos arcos SVG no mobile: `w-[300px] sm:w-[600px]`
- Ajustar ticker badge: `text-2xl sm:text-3xl md:text-5xl`
- Reduzir padding do ticker badge
- Esconder branding PME.B3 no canto inferior em mobile (muito pequeno para importar)

**`src/components/teaser/TeaserIntro.tsx`**
- Reduzir `py-24` para `py-12 sm:py-24`
- Limitar tamanho do mapa no mobile com `max-w-[220px] sm:max-w-[320px]`

**`src/components/teaser/TeaserFinancials.tsx`**
- Reduzir `py-24` para `py-12 sm:py-24`
- Reduzir `mb-16` do título para `mb-8 sm:mb-16`
- KPI cards: reduzir padding interno `px-4 py-3 sm:px-5 sm:py-5`
- Chart: reduzir altura `h-[220px] sm:h-[280px]`
- Chart labels: usar formato abreviado no mobile (R$ 82K)

**`src/components/teaser/TeaserDetails.tsx`**
- Reduzir `py-24` para `py-12 sm:py-24`
- Valores: `text-xl sm:text-3xl`
- Padding mais compacto nos cards

**`src/components/teaser/TeaserContact.tsx`**
- Reduzir `py-24` para `py-12 sm:py-24`
- Card: `p-6 sm:p-10`
- Botão Registrar: `py-4 sm:py-6`, `px-8 sm:px-12`

---

### Parte 2: Contador de Visualizações do Blind Teaser

#### Abordagem
Criar uma tabela `teaser_views` para registrar cada acesso ao Blind Teaser. No `BlindTeaser.tsx`, ao carregar o teaser, inserir um registro. Na página `MyListings.tsx`, consultar contagem de views totais e views únicas (por IP ou user_id) para cada listing.

#### Migração SQL
- Criar tabela `teaser_views` com colunas:
  - `id` (uuid, PK)
  - `listing_id` (uuid, NOT NULL)
  - `viewer_id` (uuid, nullable — user_id se logado)
  - `viewer_ip` (text, nullable — fingerprint básico)
  - `created_at` (timestamptz, default now())
- RLS: permitir INSERT para qualquer um (anon + authenticated), SELECT apenas para donos do listing
- Criar índice em `listing_id`

#### `src/pages/BlindTeaser.tsx`
- Após carregar o listing, inserir registro em `teaser_views` com `listing_id` e `viewer_id` (user.id se logado)

#### `src/pages/MyListings.tsx`
- Após carregar os listings, buscar contagem de views totais e views únicas (por `viewer_id`) para cada listing
- Exibir no card de cada listing: ícone de olho + "X visualizações (Y únicos)"
- Adicionar card de stats no topo: "Total de Visualizações" ao lado dos existentes

### Seção Técnica

| Arquivo | Ação |
|---|---|
| Migração SQL | Criar tabela `teaser_views` com RLS |
| `TeaserHero.tsx` | Responsividade: reduzir hero, arcos, ticker |
| `TeaserIntro.tsx` | Responsividade: padding, mapa menor |
| `TeaserFinancials.tsx` | Responsividade: padding, chart, KPIs |
| `TeaserDetails.tsx` | Responsividade: padding, fontes |
| `TeaserContact.tsx` | Responsividade: padding, botões |
| `BlindTeaser.tsx` | Registrar view na tabela |
| `MyListings.tsx` | Buscar e exibir contagem de views |

