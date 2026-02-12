

## Aperfeicoamento Profissional da Home Page

### Visao Geral
Elevar o design da home page de "bom" para "excepcional" com refinamentos tipograficos, espacamento, micro-interacoes e detalhes visuais dignos de uma plataforma financeira de alto nivel.

### 1. Header - Transparente no Hero, solido ao rolar

**Arquivo**: `src/components/layout/Header.tsx`

- Header inicia transparente (sem fundo, sem borda) quando no topo da pagina
- Ao rolar (scroll > 20px), transiciona suavemente para fundo solido com backdrop-blur
- Adicionar hook `useScrollPosition` para detectar scroll
- Links em branco quando transparente, cor normal quando solido
- Transicao CSS suave de 300ms

### 2. Hero Section - Tipografia e ritmo vertical refinados

**Arquivo**: `src/pages/Index.tsx`

- Adicionar um badge/pill acima do titulo principal: "Plataforma #1 de M&A no Brasil" com borda dourada sutil
- Tipografia do titulo: adicionar `text-balance` e `leading-[1.1]` para um headline mais apertado e elegante
- Subtitulo: aumentar para `text-white/70` (mais legivel) e adicionar `leading-relaxed`
- Adicionar dois botoes CTA abaixo do subtitulo (antes do search): "Explorar Marketplace" (dourado) e "Avaliar Minha Empresa" (outline branco)
- Aumentar padding vertical do hero: `pt-28 pb-24 md:pt-40 md:pb-36`
- Radial glow: posicionar no topo-esquerda para criar assimetria visual mais interessante

### 3. Search Bar - Elevar presenca visual

**Arquivo**: `src/components/home/SearchBar.tsx`

- Aumentar a sombra para `shadow-2xl` com opacidade reduzida
- Borda mais visivel: `border-white/15`
- Adicionar um label discreto acima: "Encontre o negocio ideal" em `text-white/40 text-sm tracking-widest uppercase`
- Aumentar border-radius para `rounded-2xl`

### 4. Stats - Numeros com mais impacto

**Arquivo**: `src/pages/Index.tsx`

- Aumentar tamanho dos numeros para `text-3xl md:text-4xl`
- Adicionar `font-mono tracking-tight` nos valores para aspecto financeiro
- Linha separadora dourada sutil entre numero e label
- Remover icones dos stats (mais limpo) ou reduzir tamanho para h-4 w-4
- Adicionar uma borda inferior dourada de 2px nos cards ao hover

### 5. Secao de Categorias - Transicao e layout premium

**Arquivo**: `src/pages/Index.tsx`

- Mudar grid para `grid-cols-2 md:grid-cols-4` com alturas maiores: `h-44 md:h-56`
- Adicionar contagem de listings por categoria (ex: "23 empresas") como texto pequeno abaixo do titulo
- Overlay mais sofisticado com gradiente de 3 pontos
- Adicionar seta discreta no hover (ArrowRight com opacity transition)

### 6. Secao de Destaque - Espacamento e hierarquia

**Arquivo**: `src/pages/Index.tsx`

- Adicionar fundo levemente diferenciado: `bg-muted/30` para separar visualmente
- Linha dourada decorativa ao lado do titulo (vertical, nao horizontal)
- Subtitulo com `tracking-wide`

### 7. CTA Final - Mais presenca e sofisticacao

**Arquivo**: `src/pages/Index.tsx`

- Adicionar um segundo glow radial posicionado diferente do hero para variar
- Aumentar padding: `py-24 md:py-32`
- Adicionar depoimento/citacao curta de um cliente antes do botao (social proof inline)
- Botao maior: `h-14 px-12 text-lg rounded-xl`

### 8. CSS - Novas utilidades e refinamentos

**Arquivo**: `src/index.css`

- Adicionar classe `.text-gradient-gold` para texto com gradiente dourado
- Adicionar animacao `animate-float` suave para elementos decorativos
- Adicionar `.glass-card` como preset para cards com glassmorphism
- Melhorar `.shadow-gold` com mais camadas para efeito de brilho

### 9. Footer - Alinhamento com novo visual

**Arquivo**: `src/components/layout/Footer.tsx`

- Adicionar uma linha dourada fina no topo do footer como separador visual
- Copyright atualizar para 2025

### Detalhes Tecnicos

**Arquivos modificados:**
1. `src/pages/Index.tsx` - Hero, stats, categorias, destaque, CTA
2. `src/index.css` - Novas utilidades CSS
3. `src/components/home/SearchBar.tsx` - Estilo refinado
4. `src/components/layout/Header.tsx` - Transparencia com scroll
5. `src/components/layout/Footer.tsx` - Detalhes visuais

**Nenhuma dependencia nova** - tudo com Tailwind, CSS e React hooks nativos.

### Resultado Esperado
Uma home page que transmite a seriedade e confianca de plataformas como BTG Pactual Digital, XP Investimentos ou Dealogic, com atencao a cada detalhe tipografico, espacamento e micro-interacao.

