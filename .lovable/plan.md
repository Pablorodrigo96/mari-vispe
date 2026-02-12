

## Compactar o Design do Menu de Filtros Lateral

### Problema

O sidebar de filtros esta com elementos grandes demais: textos, checkboxes, espacamentos e padding excessivos, ocupando muito espaco vertical e visual.

### Alteracoes em `src/components/map/MapFilterSidebar.tsx`

**1. Header mais compacto**
- Reduzir padding de `p-5` para `p-3`
- Titulo "Filtros" de `font-semibold` para `text-sm font-semibold`
- Icone do filtro de `h-5 w-5` para `h-4 w-4`

**2. Area de conteudo**
- Reduzir padding interno de `p-5` para `px-3 py-2`
- Reduzir spacing entre acordeons de `space-y-2` para `space-y-0`

**3. Accordion triggers**
- Reduzir padding de `py-3` para `py-2`
- Reduzir texto das secoes de `text-sm` para `text-xs`
- Icones das secoes de `h-4 w-4` para `h-3.5 w-3.5`

**4. Checkboxes e labels**
- Reduzir texto dos labels de `text-sm` para `text-xs`
- Reduzir emoji/icone de `text-base` para `text-sm`
- Reduzir spacing entre items de `space-y-2.5` para `space-y-1`
- Reduzir padding dos items de `px-2 py-1.5` para `px-1.5 py-1`
- Reduzir gap de `gap-2.5` para `gap-2`

**5. Accordion content**
- Reduzir padding de `pt-2 pb-4` para `pt-1 pb-2`

**6. Slider de preco**
- Reduzir texto de valores de `text-sm` para `text-xs`
- Reduzir spacing de `space-y-4` para `space-y-2`

**7. Botao mobile**
- Reduzir padding do container de `p-5` para `p-3`

Nenhuma alteracao de logica, apenas Tailwind classes para tornar tudo mais compacto e proporcional ao espaco disponivel (w-72).

