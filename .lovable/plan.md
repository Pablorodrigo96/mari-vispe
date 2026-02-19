

## Upgrade Visual das Paginas de Matching - Identidade Tech/IA Premium

As paginas de Matching e MatchingResults estao com visual "seco" comparado ao resto da plataforma (Index usa `gradient-navy-deep`, `bg-grid-pattern`, `glass-card`, radial glows). Vou trazer essa mesma identidade premium com foco em tecnologia e IA.

### 1. MatchingHero - Hero Imersivo Dark com Particulas e Animacoes

| Antes | Depois |
|-------|--------|
| Fundo branco com blur suave | Fundo `gradient-navy-deep` + `bg-grid-pattern` com radial glows dourados |
| Texto simples | Titulo com `text-gradient-gold`, badge pulsante "IA Embarcada" |
| Steps estaticos | Steps com `glass-card`, icones animados com `framer-motion` (staggered fade-in) |
| Sem elementos decorativos | Linhas de conexao animadas entre os steps, icone de rede neural decorativo |

Elementos visuais de tecnologia:
- Badge com dot pulsante: "Powered by AI" 
- Icones `Brain`, `Cpu`, `Network` do lucide
- Animacao sequencial dos 3 steps (appear one by one com delay)
- Particulas/dots decorativos com CSS (posicionados absolutos)

### 2. CompanySearchCard - Card Glassmorphism com Scanning Avancado

| Antes | Depois |
|-------|--------|
| Card branco simples | `glass-card` com borda accent/20 sobre fundo navy (a secao tera fundo escuro) |
| Spinner basico no scanning | Animacao de "radar scan" com circulos concentricos pulsando |
| Resultado aparece sem destaque | Resultado com glow dourado, score animado (count-up) |

Melhorias:
- A secao inteira tera fundo escuro (`gradient-navy-deep`) para dar continuidade ao hero
- Input com estilo glass (fundo semi-transparente)
- Animacao de scanning: circulos concentricos + texto que cicla entre frases ("Analisando setor...", "Cruzando dados...", "Calculando compatibilidade...")
- Badge de oportunidades com animacao `spring` mais dramatica

### 3. MatchingResults - Pagina de Resultados com Header Tech

| Antes | Depois |
|-------|--------|
| Header simples com texto | Header com fundo navy, titulo com gradient gold, stats em glass-cards |
| Tabs sem destaque | Tabs estilizadas com icones (Layers para horizontal, GitBranch para vertical) |
| Grid simples de cards | Cards com animacao staggered (aparecem um a um com delay) |
| Loading basico | Loading com animacao de "processando IA" |

Mudancas:
- Topo da pagina com mini-hero dark (fundo navy com grid pattern)
- Stats inline: "X matches encontrados | Categoria: Y | Score medio: Z"
- Tabs com icones e descricao mais rica
- Loading state com animacao de "neural network processing"

### 4. MatchCard - Card Premium com Score Visual

| Antes | Depois |
|-------|--------|
| Card estatico | Card com hover scale + glow sutil |
| Badge de score simples | Barra de progresso circular ou arco mostrando o score visualmente |
| Sem animacao | `framer-motion` fade-in com stagger index |

Melhorias:
- Hover: `hover:shadow-gold hover:border-accent/30 transition-all duration-300`
- Score como mini progress bar visual (nao so texto)
- Badge de tipo (Horizontal/Vertical) com icones
- Animacao de entrada com `motion.div` e delay baseado no index

### 5. ConsultorBanner - Banner Premium com Destaque

| Antes | Depois |
|-------|--------|
| Banner simples com borda | Banner com fundo glass, icone animado, borda gradient |
| Icone estatico | Icone com animacao `float` (sobe e desce suavemente) |
| Texto corrido | Texto com bullet points de beneficios + highlight em palavras-chave |

### Arquivos modificados

| Arquivo | Mudancas |
|---------|----------|
| `src/components/matching/MatchingHero.tsx` | Hero dark premium com grid pattern, animacoes staggered, icones tech, glass cards |
| `src/components/matching/CompanySearchCard.tsx` | Secao dark, card glass, scanning animation avancado, textos ciclicos |
| `src/pages/MatchingResults.tsx` | Mini-hero dark no topo, tabs com icones, loading tech, cards com stagger |
| `src/components/matching/MatchCard.tsx` | Hover effects, score visual bar, animacao de entrada com motion |
| `src/components/matching/ConsultorBanner.tsx` | Glass card, icone animado, texto com highlights |

### Detalhes tecnicos

- Todas as animacoes usam `framer-motion` (ja instalado)
- Classes CSS existentes reutilizadas: `gradient-navy-deep`, `bg-grid-pattern`, `glass-card`, `text-gradient-gold`, `shadow-gold`, `animate-float`
- Icones novos do lucide: `Brain`, `Cpu`, `Network`, `Layers`, `GitBranch`, `Zap`, `Sparkles`
- Nenhuma dependencia nova necessaria
