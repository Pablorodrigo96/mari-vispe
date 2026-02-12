
## Ajuste de Estilo Visual dos Clusters

### Análise Atual
Os clusters atualmente têm:
- Tamanhos: small (40px), medium (44px), large (50px)
- Cores: Navy escuro com detalhes dourados
- Inner divs com 36px x 36px
- Efeitos de transição básicos

### Melhorias Propostas

**1. Aumentar Tamanhos Base**
- Small: 40px → 52px
- Medium: 44px → 64px
- Large: 50px → 76px
- Inner divs: 36px → aumentar proporcionalmente

**2. Cores Mais Vibrantes e Profissionais**
- **Small clusters** (até 10): Fundo dourado com logo sutil (não mais navy/dourado misturado)
  - Background: `hsl(38, 92%, 50%)` (dourado sólido)
  - Border: `hsl(38, 92%, 60%)` com glow leve
  - Text: Branco/navy escuro com contraste alto
  - Adicionar sombra/glow para destacar mais

- **Medium clusters** (10-100): Dourado mais intenso com efeito visual
  - Background: `hsl(38, 92%, 47%)` com borda mais espessa
  - Border: `hsl(38, 92%, 70%)` (mais claro) com 3px
  - Text: Navy escuro, maior e mais bold
  - Adicionar shadow externo mais pronunciado

- **Large clusters** (100+): Destaque máximo com efeito premium
  - Background: Gradiente dourado (de `hsl(38, 92%, 50%)` a `hsl(38, 85%, 45%)`)
  - Border: 4px solid com cor mais clara
  - Text: Navy, muito bold, maior
  - Shadow com glow dourado (`box-shadow: 0 0 20px hsla(38, 92%, 50%, 0.4)`)

**3. Efeitos Interativos**
- Adicionar `transform: scale(1.1)` no hover dos clusters
- Efeito de pulsação suave (`pulse` animation) nos clusters grandes
- Transição de 200ms para suavidade

**4. Tipografia Aprimorada**
- Aumentar font-size: 13px → 16px (small), 14px → 18px (medium), 15px → 20px (large)
- Adicionar `letter-spacing: -0.5px` para números mais compactos
- Usar `font-weight: 900` em todos

**5. Border Styling**
- Small: 2px → 3px
- Medium: 2px → 3px
- Large: 3px → 4px
- Adicionar `box-shadow` com glow externo em todas as variantes

### Arquivos a Modificar
1. `src/components/map/BusinessMap.tsx` - Aumentar `px` (tamanho do ícone) nas 3 variantes
2. `src/index.css` - Revisar estilos `.marker-cluster-*` e `.marker-cluster div`

### Comportamento Esperado
- Clusters muito mais visíveis e destacados no mapa
- Transição suave ao hover
- Cores vibrantes (dourado/navy) alinhadas com o design corporativo
- Sensação premium similar a plataformas financeiras de alto nível
