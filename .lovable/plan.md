## Diagnóstico

As marcações vermelhas mostram grandes **zonas mortas laterais** no hero do `/valuation` (Plano Perfeito) e também na home (Ato 2). O conteúdo vive num `max-w-7xl` centralizado, então em telas ≥1400px sobra ~25% de cada lado vazio. Falta:

- Aproveitamento **edge-to-edge** (até as bordas reais)
- **Marginalia** tipográfica nas bordas (números, labels rotacionados, tickers)
- Quebra do "centralizão landing page" → grid assimétrico
- Detalhes que dão profundidade (grid de fundo, coordenadas, rótulos de canto)

## Escopo

Refazer apenas o **`PlanoPerfeitoHero`** (`/valuation` topo) — o resto da página segue intacto. Se aprovar, aplico o mesmo padrão depois no Ato 2 da home como follow-up.

## Direção visual

**Layout edge-to-edge assimétrico em 12 colunas full-bleed** (sem `max-w-7xl`, padding lateral mínimo `px-6 md:px-10`):

```text
┌─[01]─────────────────────────────────────────────[VALUATION / 2026]─┐
│ ●                                                                    │
│ O PLANO PERFEITO                              ┌──────────────────┐  │
│                                               │ MARI · AO VIVO   │  │
│ Construa a ponte                              │ Janela    1.248  │  │
│ da sua empresa                                │ Volume   R$4,2bi │  │
│ ▓até o bilhão.▓                               │ Múltiplo  6,2x   │  │
│                                               └──────────────────┘  │
│ [CONSTRUIR MEU PLANO]   ver como funciona →                         │
│ ● 100% gratuito                                                     │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│ 01 — STATUS QUO    │ 02 — VISION       │ 03 — STRATEGY              │
│ De onde você está  │ Aonde quer chegar │ Como chegar lá             │
│ ...                │ ...               │ ...                        │
└─[VISPECAPITAL · mari]──────────────────[scroll ↓ ver metodologia]───┘
```

### Mudanças concretas

1. **Container full-bleed** — remove `max-w-7xl mx-auto`, usa `w-full px-6 md:px-10 lg:px-16` para encostar nas bordas reais.

2. **Marginalia nas 4 bordas (borda infinita)**:
   - **Topo-esquerdo:** ticker `[ 01 / 03 — O PLANO PERFEITO ]` em mono Volt
   - **Topo-direito:** `VALUATION · 2026` em mono branco/40
   - **Rodapé-esquerdo:** wordmark vertical rotacionado 90° `VISPECAPITAL · mari` com `writing-mode: vertical-rl` na lateral esquerda (encostado na borda)
   - **Rodapé-direito:** indicador `SCROLL ↓ METODOLOGIA` em mono pequeno
   - **Lateral direita:** régua/escala vertical `00 — 03` marcando cada pilar

3. **Grid assimétrico 12-col** no hero principal:
   - Headline ocupa cols 1–7 (esquerda)
   - **Card "Mari · ao vivo"** novo nas cols 8–12 (preenche a zona morta direita) mostrando: CNPJs analisados, janela de venda, volume mapeado, múltiplo médio — espelhando o card que existe na home (referência da img 1)
   - Quebra a sensação "tudo no meio"

4. **Background depth** (sem encher de partícula):
   - Grid de pontos sutil `bg-grid-pattern` em opacidade 5%
   - Linhas diagonais Volt já existentes mantidas, mas estendidas até as bordas
   - Coordenadas técnicas decorativas no canto: `LAT -23.55 · LNG -46.63` (vibe Bloomberg/terminal)

5. **Pilares em 3-col edge-to-edge** com numeração gigante de fundo:
   - Cada pilar ganha um `01` / `02` / `03` enorme (text-[180px] outline) atrás do conteúdo como elemento gráfico
   - Bordas dos pilares vão até a borda real da tela (não param no container)

6. **Tipografia integrada às bordas**:
   - Eyebrow encostado na esquerda (não centralizado)
   - Headline cresce até `lg:text-[9rem]` em telas grandes, com `tracking-tighter` para "abraçar" o espaço
   - Quebra de linha controlada: "Construa a ponte" / "da sua empresa" / "▓até o bilhão.▓"

7. **Responsivo**:
   - Mobile: marginalia desliga, vira coluna única simples
   - Tablet: card lateral vira embaixo do headline
   - Desktop ≥1280px: layout 12-col completo com todas marginalia
   - Ultra-wide ≥1536px: aumenta padding lateral para `px-24` mas mantém marginalia colada na borda

### Cores (locked)

Carbon `#0A0A0A` · Volt `#D9F564` · Bone `#FAFAF7` · Graphite `#2A2A2A` — sem desvios.

### Arquivos afetados

- `src/components/valuation/plano-perfeito/PlanoPerfeitoHero.tsx` (reescrito)
- Nenhum hook/lógica/rota muda

## Fora de escopo (follow-up se quiser)

- Aplicar mesmo tratamento edge-to-edge no Ato 2 da home (`src/components/home/...`)
- `ValuationTypeSelector` abaixo do hero (mantém como está nesse ciclo)
