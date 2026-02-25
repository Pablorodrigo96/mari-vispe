

## Plano: Corrigir Hero e Mapa do Blind Teaser no Mobile

### Problemas identificados nas screenshots

1. **Hero (image-39)**: Os arcos SVG decorativos do lado esquerdo cruzam o centro da tela no mobile (w-[300px] num ecrã de ~390px), passando por cima do texto "Blind Teaser" e do ticker. O branding PME.B3 aparece no canto inferior mesmo com `hidden sm:flex` -- parece estar visível.

2. **Mapa (image-38)**: O mapa do Brasil aparece como um pequeno quadrado dourado (apenas o estado destacado é visível). A perspectiva 3D (`rotateX(12deg) rotateY(-10deg)`) combinada com `max-w-[220px]` torna o mapa minúsculo e irreconhecível no mobile. Há muito espaço vazio abaixo do mapa e acima do label "Operação em".

### Mudanças

#### 1. `src/components/teaser/TeaserHero.tsx`
- Reduzir opacidade dos arcos SVG no mobile para que nao dominem o centro da tela: adicionar classes de opacidade menores (`opacity-40 sm:opacity-100` no container dos arcos)
- Esconder o arco direito no mobile (`hidden sm:block`)
- Reduzir quantidade de particulas no mobile (renderizar apenas 6 em vez de 12 via CSS `hidden` nas pares)
- Reduzir titulo para `text-4xl sm:text-5xl md:text-7xl lg:text-9xl` para nao ficar apertado

#### 2. `src/components/teaser/BrazilMap.tsx`
- Remover a perspectiva 3D no mobile -- a rotacao `rotateX(12deg) rotateY(-10deg)` causa o mapa ficar cortado/distorcido em telas pequenas
- Usar media query via classe: no mobile, sem rotacao; no desktop, manter o efeito 3D
- Aumentar o `max-w` do SVG no mobile para pelo menos `max-w-[280px]` para que os estados fiquem visiveis
- Reduzir a amplitude do float animation no mobile (`y: [-3, 3, -3]` em vez de `[-6, 6, -6]`)

#### 3. `src/components/teaser/TeaserIntro.tsx`
- No mobile, colocar o mapa **acima** do texto (order reverso no grid) para que o mapa tenha largura total da coluna em vez de ficar espremido
- Reduzir `gap-16` para `gap-8 md:gap-16`
- Reduzir `mb-16` do titulo para `mb-8 sm:mb-16`

### Seção Tecnica

| Arquivo | Acao |
|---|---|
| `TeaserHero.tsx` | Reduzir opacidade arcos no mobile, esconder arco direito, titulo menor |
| `BrazilMap.tsx` | Remover rotacao 3D no mobile, aumentar tamanho SVG, reduzir float |
| `TeaserIntro.tsx` | Mapa acima do texto no mobile, gaps menores |

