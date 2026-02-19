

## Upgrade Visual Global: Particulas, Animacoes Tech e Fix do Header

### Problema 1: Header - Texto desaparece na barra branca

O Header so fica transparente na homepage (`isHome = location.pathname === '/'`). Nas demais paginas com hero dark (Matching, MatchingResults), o header ja e branco e o texto do hero some atras dele. Para paginas com hero claro (Investors, Capital, Sell, Valuation), nao ha conflito visual mas tambem nao ha imersao.

**Solucao**: Expandir a logica de transparencia do Header para funcionar em TODAS as paginas que tem hero dark. Criar uma lista de rotas com hero escuro onde o header deve ser transparente.

### Problema 2: Paginas sem identidade tech

As paginas Investors, Capital, Sell e Valuation usam fundos claros genericos (`bg-gradient-to-b from-primary/5`), sem particulas, sem grid pattern, sem glass cards. Precisam do mesmo tratamento premium que o Matching recebeu.

### Problema 3: Sem particulas animadas

Nenhuma pagina tem efeito de particulas. Vou criar um componente reutilizavel `ParticlesBackground` com CSS puro (sem canvas para manter performance).

---

### Plano de implementacao

#### 1. Componente `ParticlesBackground` (novo)
`src/components/ui/particles-background.tsx`

Componente reutilizavel com particulas CSS animadas:
- 15-20 dots de tamanhos variados (1px a 3px)
- Posicoes absolutas aleatorias pre-definidas
- Animacao `float` com delays variados
- Opacidade sutil (10-40%)
- Aceita prop `variant: 'dark' | 'light'` para adaptar cores
- Linhas de conexao decorativas entre alguns dots (SVG lines com opacidade baixa)

#### 2. Fix do Header - Transparencia em paginas dark
`src/components/layout/Header.tsx`

Mudar a logica de `isHome` para uma lista de rotas com hero escuro:
```
const darkHeroRoutes = ['/', '/matching', '/matching/results'];
const hasDarkHero = darkHeroRoutes.includes(location.pathname);
const isTransparent = hasDarkHero && !isScrolled && !mobileMenuOpen;
```

#### 3. Investors - Hero Dark Imersivo
`src/components/investors/InvestorsHero.tsx`

- Fundo: `gradient-navy-deep` + `bg-grid-pattern`
- Particulas animadas via `ParticlesBackground`
- Texto branco com `text-gradient-gold` no destaque
- Badge pulsante "Oportunidades Exclusivas de M&A"
- Card da direita com estilo `glass-card`
- Stats com glass cards
- Animacoes `framer-motion` staggered

#### 4. Investors - Beneficios com animacao
`src/components/investors/InvestorBenefits.tsx`

- Cards com `framer-motion` fade-in staggered
- Hover com `shadow-gold` sutil
- Icones com animacao de scale no hover

#### 5. Investors - CTA com particulas
`src/components/investors/InvestorCTA.tsx`

- Fundo `gradient-navy-deep` + `bg-grid-pattern` + particulas
- Radial glows dourados

#### 6. Capital - Hero Dark
`src/components/capital/CapitalHero.tsx`

- Fundo dark com grid pattern e particulas
- Texto branco, destaque gold
- Simulator card com estilo glass
- Animacoes de entrada

#### 7. Sell - Hero Dark
`src/pages/Sell.tsx`

- Hero section com `gradient-navy-deep`
- Stats em glass-cards
- Particulas no fundo
- Texto branco

#### 8. Valuation - Hero Dark (via ValuationTypeSelector)
O `ValuationTypeSelector` serve como hero. Aplicar o mesmo tratamento dark.

### Arquivos modificados

| Arquivo | Mudanca |
|---------|---------|
| `src/components/ui/particles-background.tsx` | NOVO - Componente de particulas CSS reutilizavel |
| `src/components/layout/Header.tsx` | Expandir transparencia para rotas com hero dark |
| `src/components/investors/InvestorsHero.tsx` | Hero dark imersivo com particulas e animacoes |
| `src/components/investors/InvestorBenefits.tsx` | Cards animados com framer-motion |
| `src/components/investors/InvestorCTA.tsx` | Fundo dark com grid pattern e particulas |
| `src/components/investors/InvestorTestimonials.tsx` | Animacoes de entrada nos cards |
| `src/components/capital/CapitalHero.tsx` | Hero dark com particulas e glass card |
| `src/pages/Sell.tsx` | Hero dark com particulas, stats em glass |
| `src/pages/Investors.tsx` | Ajustar padding do main para hero dark |
| `src/pages/Capital.tsx` | Ajustar padding para hero dark |

### Detalhes tecnicos

- Particulas: CSS puro com `position: absolute`, `animate-float`, delays variados. Sem canvas, sem dependencia nova.
- Animacoes: `framer-motion` (ja instalado) com `staggerChildren`, `whileInView`, `viewport={{ once: true }}`
- Classes reutilizadas: `gradient-navy-deep`, `bg-grid-pattern`, `glass-card`, `text-gradient-gold`, `shadow-gold`, `animate-float`
- Header: A lista `darkHeroRoutes` inclui `/`, `/matching`, `/matching/results`, `/investors`, `/capital`, `/vender`, `/valuation`
- Nenhuma dependencia nova

