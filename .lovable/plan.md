

## Substituir Emojis por Fotografias Profissionais nas Categorias

### Problema
As categorias de negocio usam emojis (💻, 🛒, 🏭, etc.) que parecem informais e remetem a WhatsApp, prejudicando a imagem profissional da plataforma.

### Solucao
Substituir os emojis por imagens fotograficas profissionais (URLs de bancos de imagem gratuitos como Unsplash) e atualizar todos os componentes que exibem essas categorias.

### Alteracoes

**1. `src/data/mockData.ts` - Dados das categorias**
- Trocar o campo `icon` (string emoji) por `image` (URL de foto profissional)
- Manter o campo `icon` como fallback ou remover
- Cada categoria recebera uma foto representativa:
  - Tecnologia e SaaS: foto de escritorio tech moderno
  - Comercio e Varejo: foto de loja/vitrine elegante
  - Industria: foto de fabrica/linha de producao
  - Servicos: foto de reuniao corporativa
  - Alimentacao: foto de restaurante profissional
  - Saude e Bem-estar: foto de clinica/consultorio
  - Educacao: foto de ambiente educacional
  - Logistica: foto de centro de distribuicao

**2. `src/pages/Index.tsx` - Grid de categorias na home**
- Substituir `<span className="text-4xl">{cat.icon}</span>` por `<img>` com a foto da categoria
- Aplicar `rounded-lg`, `object-cover`, tamanho fixo (ex: `w-16 h-16` ou `w-full h-24`)

**3. `src/components/marketplace/FilterSidebar.tsx` - Filtros do marketplace**
- Substituir `<span>{cat.icon}</span>` por `<img>` pequena (ex: `w-5 h-5 rounded`)

**4. `src/components/map/MapFilterSidebar.tsx` - Filtros do mapa**
- Mesmo padrao do FilterSidebar

**5. `src/components/home/SearchBar.tsx` - Dropdown de categorias**
- Substituir emoji no `<SelectItem>` por imagem pequena inline

**6. `src/components/sell/wizard/StepBasicFinancial.tsx` - Wizard de venda**
- Substituir emoji no `<SelectItem>` por imagem pequena

**7. `src/pages/ListingDetail.tsx` - Badge de categoria**
- Substituir emoji na funcao `getCategoryLabel` por imagem inline

### Detalhes Tecnicos

- As imagens serao sourced de Unsplash (URLs publicas e gratuitas) com tamanho otimizado (ex: `?w=200&h=200&fit=crop`)
- O tipo da interface `categories` mudara de `icon: string` (emoji) para `image: string` (URL)
- Nos componentes menores (filtros, selects), as imagens terao `w-5 h-5 rounded object-cover`
- Na home page, as imagens terao tamanho maior (`w-full h-24 rounded-lg object-cover`)
- Fallback com `bg-muted` caso a imagem nao carregue

### Arquivos modificados
1. `src/data/mockData.ts`
2. `src/pages/Index.tsx`
3. `src/components/marketplace/FilterSidebar.tsx`
4. `src/components/map/MapFilterSidebar.tsx`
5. `src/components/home/SearchBar.tsx`
6. `src/components/sell/wizard/StepBasicFinancial.tsx`
7. `src/pages/ListingDetail.tsx`

