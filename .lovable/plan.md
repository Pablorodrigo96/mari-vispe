
## Fix: Grid de Categorias — Imagem Quebrada e Layout da 3ª Linha

### Problema 1: Imagem quebrada — Telecomunicações
A URL `https://images.unsplash.com/photo-1523494557144-e9d7037e4200?w=400&h=300&fit=crop` está retornando erro. Substituir por uma URL válida do Unsplash para telecomunicações/tecnologia.

Nova URL: `https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop` (imagem de antenas/telecom)

**Arquivo**: `src/data/mockData.ts` — linha 43, trocar a URL da categoria `telecom`.

### Problema 2: Layout — 9 categorias em grid de 4 colunas
Com 9 itens num grid de 4 colunas, o último item fica sozinho numa linha, esticado e desalinhado. Existem duas soluções:

**Opção A (escolhida)**: Remover a categoria "Telecomunicações" da lista, deixando exatamente 8 categorias — preenchimento perfeito em 2 linhas de 4 colunas.

**Opção B**: Manter 9 categorias mas usar grid com colunas responsivas que auto-ajustam para que o item sozinho não fique esticado (ex: `grid-cols-2 md:grid-cols-3 lg:grid-cols-4` com o último item centralizado via CSS).

Prefiro a **Opção A** pois é mais limpa — 8 categorias já cobrem bem os segmentos da plataforma, e o resultado visual é muito superior.

### Detalhes técnicos

**Arquivo 1**: `src/data/mockData.ts`
- Linha 43: Remover a entrada `{ id: 'telecom', label: 'Telecomunicações', ... }` do array `categories`
- Resultado: array com exatamente 8 categorias → 2 linhas perfeitas de 4 colunas

**Arquivo 2**: `src/pages/Index.tsx` (seção Categories)
- Verificar se o grid `grid-cols-2 md:grid-cols-4` está correto — com 8 itens fica 2 linhas no desktop e 4 linhas no mobile (2x2), ambos perfeitos.

### Resultado esperado
- 8 categorias, todas com imagens funcionando
- Grid perfeitamente preenchido em 2 linhas de 4 colunas no desktop
- Nenhum card sozinho na terceira linha
- Nenhuma imagem quebrada
