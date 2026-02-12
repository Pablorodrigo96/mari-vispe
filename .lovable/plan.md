

## Filtros Laterais no Mapa

### Visao Geral

Adicionar um painel de filtros na lateral esquerda do mapa, permitindo filtrar as empresas exibidas por setor, estado, cidade e faixa de preco. O painel sera colapsavel no mobile (abrindo via Sheet/drawer) e fixo no desktop.

### Alteracoes

**1. Novo componente: `src/components/map/MapFilterSidebar.tsx`**

Painel de filtros especifico para o mapa, reutilizando os mesmos componentes UI (Accordion, Checkbox, Slider) ja usados no `FilterSidebar` do marketplace. Incluira:

- **Setor de Atuacao**: Checkboxes com as categorias existentes (do `mockData.ts`)
- **Estado**: Checkboxes com os estados existentes
- **Cidade**: Checkboxes dinamicos baseados nas cidades presentes nos listings carregados (filtradas pelo estado selecionado quando aplicavel)
- **Faixa de Preco**: Slider de intervalo (0 a R$ 10M)
- Botao "Limpar Filtros" e badge com contagem de filtros ativos
- Estilo escuro para combinar com o tema do mapa

Interface de estado dos filtros:
```typescript
interface MapFilterState {
  categories: string[];
  states: string[];
  cities: string[];
  priceRange: [number, number];
}
```

**2. Arquivo modificado: `src/pages/MapView.tsx`**

- Adicionar estado `filters` com `useState<MapFilterState>`
- Extrair lista de cidades unicas dos listings (filtradas por estado quando aplicavel)
- Aplicar filtros aos listings antes de passar para o `BusinessMap`
- Filtrar no lado do cliente (os dados ja estao carregados) para resposta instantanea
- No desktop: layout flex com sidebar fixa (w-72) + mapa ocupando o restante
- No mobile: botao flutuante "Filtros" que abre um Sheet/drawer lateral

**3. Layout resultante**

```text
Desktop:
+------------------+--------------------------------+
| Header                                            |
+------------------+--------------------------------+
| Filtros (w-72)   | Mapa (flex-1)                  |
| - Setor          |                                |
| - Estado         |                                |
| - Cidade         |                                |
| - Preco          |                                |
+------------------+----------[Barra de Stats]------+

Mobile:
+----------------------------------------+
| Header                                 |
+----------------------------------------+
| Mapa (tela cheia)                      |
|                                        |
|  [Botao Filtros flutuante]             |
|                                        |
+----------[Barra de Stats]-------------+
```

### Detalhes Tecnicos

- A filtragem sera feita no cliente (array `.filter()`) para evitar re-fetches ao banco
- A lista de cidades sera extraida dinamicamente dos listings carregados usando `new Set()`
- Quando o usuario seleciona um estado no filtro, a lista de cidades mostrara apenas cidades daquele(s) estado(s)
- O componente `BusinessMap` nao precisa de alteracoes - ele ja recebe `listings` como prop e renderiza marcadores com base neles
- No mobile, o botao flutuante usara o componente `Sheet` do shadcn/ui para abrir o painel de filtros
- A barra de stats no rodape do mapa refletira automaticamente os listings filtrados (pois os totais sao calculados dentro do `BusinessMap`)

