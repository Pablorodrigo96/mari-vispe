

## Plano: Ajustes visuais e animacoes do Blind Teaser

### Problemas identificados

1. **Texto de descricao extrapolando a pagina** — o `<p>` com `whitespace-pre-wrap` nao quebra palavras longas. Falta `break-words` / `overflow-wrap: break-word`.
2. **Mapa do Brasil muito basico** — usa retangulos simples em vez de formas realistas dos estados. Comparado com a referencia (blocos 3D dourados), precisa de mais volume visual.
3. **Poucas animacoes** — as transicoes sao simples fade/slide. Faltam efeitos de hover, stagger mais elaborado, e animacoes continuas.

### Mudancas

#### 1. `src/components/teaser/TeaserIntro.tsx` — Corrigir overflow + animacoes

- Adicionar `break-words overflow-hidden` no `<p>` da descricao (linha 55)
- Remover `whitespace-pre-wrap` que forca texto sem quebra
- Adicionar `word-break: break-word` via classe
- Adicionar animacao stagger nos badges (category/year)
- Adicionar hover scale sutil nos badges

#### 2. `src/components/teaser/BrazilMap.tsx` — Visual mais sofisticado

- Manter os paths retangulares mas adicionar efeito de "blocos 3D" com sombras e transforms escalonados por estado
- Adicionar animacao de flutuacao continua (float) no mapa inteiro
- Adicionar efeito de hover individual nos estados (scale sutil)
- Pulse mais visivel no estado destacado
- Sombra drop-shadow mais forte no conjunto

#### 3. `src/components/teaser/TeaserHero.tsx` — Mais particulas e parallax

- Aumentar particulas flutuantes de 6 para 12 com tamanhos variados
- Adicionar efeito de "shimmer" no titulo (gradiente animado)
- Animacao de pulse no ticker badge

#### 4. `src/components/teaser/TeaserFinancials.tsx` — Animacoes nos KPIs

- Adicionar hover effect nos KPI cards (elevacao + brilho)
- Stagger mais longo nas animacoes de entrada
- Borda inferior dourada animada nos cards

#### 5. `src/components/teaser/TeaserDetails.tsx` — Hover e glow

- Adicionar glow effect nos cards ao hover
- Animacao de entrada mais dramatica (scale + fade combinados)

#### 6. `src/components/teaser/TeaserContact.tsx` — Botoes animados

- Adicionar pulse animation no botao "Registrar Interesse"
- Hover effect mais visivel nos botoes

### Secao Tecnica

| Arquivo | Acao |
|---|---|
| `src/components/teaser/TeaserIntro.tsx` | Fix overflow texto + stagger badges |
| `src/components/teaser/BrazilMap.tsx` | Efeito 3D blocos + float + hover states |
| `src/components/teaser/TeaserHero.tsx` | Mais particulas + shimmer titulo |
| `src/components/teaser/TeaserFinancials.tsx` | Hover KPIs + stagger |
| `src/components/teaser/TeaserDetails.tsx` | Glow hover + entrada dramatica |
| `src/components/teaser/TeaserContact.tsx` | Pulse botao + hover |

Nenhuma mudanca de banco de dados necessaria.

