## Diagnóstico

A home atual sofre de "centered column syndrome": o `HeroCarousel` usa `max-w-5xl mx-auto` + `text-center`, deixando ~30% de cada lateral vazia em telas ≥1280px. Isso reduz a presença visual da marca, deixa o hero parecendo um slide de PowerPoint e não aproveita o watermark/tagline já presentes.

## Proposta de redesign (nível editorial / financial-tech)

### 1. Hero: grid assimétrico 7/5 ao invés de coluna central

```text
┌─────────────────────────────────────────────────────────────────┐
│ [eyebrow chip]                          ┌────────────────────┐  │
│                                         │  RIGHT RAIL        │  │
│ Headline grande (display, -tracking)    │                    │  │
│ Lorem ipsum dolor sit                   │  Live ticker       │  │
│ amet consectetur.                       │  • 21M CNPJs       │  │
│                                         │  • 1.247 em janela │  │
│ ▸ HIGHLIGHT marca-texto Volt           │  • R$ 4.2B volume  │  │
│                                         │                    │  │
│ Body em 2 parágrafos curtos, alinhado   │  Mini-card "Mari   │  │
│ à esquerda, ~520px max.                 │  está olhando      │  │
│                                         │  agora" pulsando   │  │
│ [CTA primário] [CTA secundário ghost]   │                    │  │
│                                         │  Avatar Mari +     │  │
│ ●●○○○ dots à esquerda + numeração       │  status dot        │  │
│ "03 / 05" tipografia mono               └────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

- Coluna esquerda (`lg:col-span-7`): conteúdo do slide alinhado à esquerda (`text-left`), headline em `text-5xl lg:text-7xl`, tracking apertado.
- Coluna direita (`lg:col-span-5`): "right rail" persistente (não muda entre slides) com:
  - **Live ticker glass-card** com 3 stats principais animadas (number flip).
  - **Status card "Mari está analisando agora"** — dot pulsando Volt, contador incrementando, microcopy.
  - **Avatar/símbolo Mari** grande, levemente girando ou com glow.
- Mobile (`<lg`): stack vertical, right rail vira faixa horizontal compacta abaixo do CTA.

### 2. Tipografia & ritmo

- Headline: `font-display`, `tracking-[-0.03em]`, `leading-[0.95]`, peso 700.
- Highlight: manter `bg-accent text-secondary-foreground font-extrabold` mas em bloco inline mais discreto (sem `border-secondary-foreground`, que polui), com `px-2 py-0.5 rounded-sm` ao invés de `rounded-md`, simulando marca-texto físico.
- Body: `text-white/65`, `text-base lg:text-lg`, `max-w-[520px]` — nunca centralizado.
- Eyebrow: chip menor, alinhado à esquerda, sem o `animate-pulse` (mais sóbrio).

### 3. Controles do carrossel

- Dots à esquerda + contador "03 / 05" em `font-mono text-xs text-white/40`.
- Setas `< >` discretas no canto inferior direito do hero (apenas desktop).
- Progress bar fina (1px) na base do hero indicando o autoplay (5500ms preenchendo).
- Mantém autoplay/hover-pause/keyboard nav.

### 4. "Pós-hero" (bloco abaixo)

Hoje está centralizado e repetitivo com o slide. Proposta:
- Virar uma **faixa de 3 cards lado a lado** ("Janela", "Valor", "Comprador") — cada um com ícone, headline curto, 1 frase. Isso reforça os 3 outputs da Mari sem competir com o hero.
- CTA "Analisar minha empresa AGORA" vira um botão único centralizado abaixo dos 3 cards, com microcopy "Sem cadastro · 60s".

### 5. Stats (4 cards atuais)

- Reduzir para `grid-cols-4 gap-3` mais denso, glass-card mais fino, números em `font-mono`, label em `text-[10px] uppercase tracking-[0.2em] text-white/40`. Estilo Bloomberg/terminal.
- Adicionar ponto Volt à esquerda de cada número (status indicator).

### 6. Container & largura

- Trocar `container mx-auto px-4` por `max-w-[1440px] mx-auto px-6 lg:px-12` no hero — aproveita até 1440px, mantém respiro nas bordas.
- Watermark `MariWatermark` reposicionado para não competir com o right rail (mover para trás do conteúdo, opacidade 0.04, blur).

### 7. Categorias ("É um investidor...")

Manter, mas o `text-2xl md:text-3xl` da pergunta é tímido. Subir para `text-3xl md:text-5xl`, alinhar à esquerda dentro de um container `max-w-6xl`, e jogar o `<p>` de descrição ao lado direito (grid 2 colunas no header da seção). Mais editorial, menos landing page genérica.

## Arquivos a alterar

- **`src/components/home/HeroCarousel.tsx`** — refator grande:
  - Novo layout grid `lg:grid-cols-12`.
  - `SlideView` → `text-left`, alinhado à esquerda da coluna 7.
  - Novo subcomponente `HeroRightRail` (stats animados + status Mari + avatar).
  - Controles: dots à esquerda + contador "NN / NN" + setas + progress bar.
  - Highlight: classes mais sóbrias.
- **`src/pages/Index.tsx`**:
  - Hero section: trocar `container mx-auto` por `max-w-[1440px]`, remover `text-center` do bloco pós-hero.
  - Pós-hero: virar grid de 3 cards (Janela / Valor / Comprador) + CTA centralizado abaixo.
  - Stats: estilo terminal mais denso.
  - Categorias: header em 2 colunas (título esquerda, descrição direita), eyebrow alinhado à esquerda.
- **Sem mudanças** em Header, Footer, MariDifferentialCard, Featured Listings, CTA final, `/painel`, `/equity-brain`, `/mari`.

## Detalhes técnicos

- Reusar tokens existentes: `glass-card`, `bg-volt`, `shadow-volt`, `text-accent`, `gradient-navy-deep`, `font-display`, `font-mono`.
- Animações: manter `framer-motion` + `embla-carousel-autoplay`. Adicionar `motion.div` com `animate={{ scale }}` no dot pulsante do right rail.
- Number flip simples no ticker: `useEffect` + `setInterval` incrementando 1 a cada 4s (visual de "live"), sem chamada real ao backend.
- Acessibilidade preservada: `role="region"`, `aria-label`, `aria-current` nos dots, `aria-live="polite"` no contador.
- Responsivo:
  - `<lg`: stack vertical, right rail vira faixa horizontal de 3 mini-cards com scroll-snap.
  - `<md`: headline `text-4xl`, esconde setas, mantém dots + contador.
- Sem novas dependências.

## Fora de escopo

- Mudanças no copy dos 5 slides (mantém os textos atuais).
- Mudar paleta, fontes globais ou tokens do design system.
- Editar `/mari`, `/painel`, `/equity-brain`, Auth, Sell Wizard.