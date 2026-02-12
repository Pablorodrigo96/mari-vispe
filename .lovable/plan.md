

## Redesign da Home Page - Visual Corporativo e Profissional

### Problema
A tela inicial tem aparencia generica de template (estilo "Lovable"), com hero simples em fundo branco, icones basicos e falta de elementos visuais que transmitam confianca e sofisticacao para uma plataforma de M&A.

### Mudancas Propostas

**1. Hero Section - Impacto visual corporativo**
- Fundo com gradiente navy escuro (usando as cores `--navy` e `--navy-light` ja existentes) em vez do fundo branco/cinza claro
- Texto em branco sobre fundo escuro, com destaque dourado no "negociacao de empresas"
- Adicionar um sutil pattern geometrico ou mesh gradient no fundo para profundidade
- Subtitulo com opacidade reduzida para hierarquia tipografica
- Espacamento mais generoso entre elementos

**2. SearchBar - Mais refinado**
- Manter a estrutura atual mas com bordas mais sutis e sombra mais elegante sobre o fundo escuro do hero
- Contraste melhorado contra o hero escuro

**3. Stats Section - Cards com presenca**
- Separar os stats em cards individuais com fundo branco, borda sutil e sombra leve
- Icones dentro de circulos com fundo dourado suave (bg-accent/10)
- Numeros maiores e mais bold, labels menores
- Posicionar logo abaixo do hero, ainda com fundo escuro ou em transicao

**4. Secao de Categorias - Layout mais sofisticado**
- Cards com imagem ocupando mais espaco, overlay com gradiente escuro e titulo sobre a imagem
- Efeito hover com zoom suave na imagem
- Remover bordas explicitas, usar sombras suaves

**5. Secao de Destaque - Mais limpa**
- Fundo branco puro em vez de muted/30
- Titulo com linha decorativa dourada abaixo ou ao lado

**6. CTA Final - Mais sofisticado**
- Gradiente navy com pattern sutil em vez de cor solida
- Botao com mais presenca visual

### Detalhes Tecnicos

**Arquivos modificados:**
1. `src/pages/Index.tsx` - Reestruturar hero com fundo escuro, stats em cards, categorias com overlay
2. `src/index.css` - Adicionar classes utilitarias para o pattern de fundo e novos gradientes
3. `src/components/home/SearchBar.tsx` - Ajustes de estilo para contraste no hero escuro

**Nenhuma dependencia nova necessaria** - todas as mudancas usam Tailwind CSS e as cores ja definidas no design system.

### Resultado Esperado
Uma home page com aspecto de plataforma financeira/corporativa, similar a plataformas como BTG Pactual, XP Investimentos ou portais de M&A internacionais, transmitindo confianca e seriedade.
