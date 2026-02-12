
## Corrigir Imagem Quebrada da Categoria Educação

### Problema
A URL da imagem de Educação em `src/data/mockData.ts` (linha 41) está apontando para um ID de foto do Unsplash que não está mais disponível ou é inválido, causando um erro ao carregar a imagem na categoria.

### Solução
Substituir a URL quebrada por uma nova URL válida do Unsplash com uma fotografia profissional de educação/ambiente escolar.

### Alteração
- **Arquivo**: `src/data/mockData.ts`
- **Linha**: 41
- **Alteração**: 
  - **Atual**: `{ id: 'education', label: 'Educação', image: 'https://images.unsplash.com/photo-1523050854058-8df90110c8f1?w=400&h=300&fit=crop' }`
  - **Novo**: `{ id: 'education', label: 'Educação', image: 'https://images.unsplash.com/photo-1427504494785-cdaa41e57ae0?w=400&h=300&fit=crop' }`

A nova URL utiliza a foto `photo-1427504494785-cdaa41e57ae0` que é uma imagem profissional de educação/livros/estudo do Unsplash que está ativa e disponível.

### Impacto
- A imagem de educação agora será exibida corretamente em:
  - Grid de categorias da home page
  - Filtros do marketplace
  - Filtros do mapa
  - Dropdown de seleção de categoria no wizard de venda
  - Badge de categoria nas listagens de detalhes

- Nenhuma mudança de lógica, apenas correção da URL

