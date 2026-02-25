

## Plano: Adicionar Contador de Visualizações Visível na Página do Blind Teaser

### Problema
Atualmente, as visualizações são registradas na tabela `teaser_views` e exibidas apenas na página "Meus Anúncios". O usuário quer que cada página do Blind Teaser (`/teaser/:ticker`) também mostre um contador de quantas vezes aquele teaser específico foi visualizado.

### Mudanças

#### `src/pages/BlindTeaser.tsx`
- Após carregar o listing, buscar a contagem de views totais e únicos da tabela `teaser_views` para aquele `listing_id`
- Passar os valores `totalViews` e `uniqueViews` para o componente `TeaserHero`

#### `src/components/teaser/TeaserHero.tsx`
- Receber props `totalViews` e `uniqueViews`
- Exibir um badge discreto abaixo do ticker com ícone de olho: "X visualizações • Y únicos"
- Estilo consistente com o visual financeiro do teaser (texto branco/dourado, semi-transparente)

### Nota sobre RLS
A tabela `teaser_views` tem RLS que permite SELECT apenas para donos do listing e admins. Para exibir o contador publicamente, será necessário criar uma database function `get_teaser_view_count(listing_id)` com `SECURITY DEFINER` que retorna apenas a contagem (sem expor dados individuais).

### Seção Técnica

| Arquivo | Ação |
|---|---|
| Migração SQL | Criar function `get_teaser_view_count` com SECURITY DEFINER |
| `BlindTeaser.tsx` | Buscar contagem via RPC e passar para TeaserHero |
| `TeaserHero.tsx` | Exibir badge com total e únicos |

