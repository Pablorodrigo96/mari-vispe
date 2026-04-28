## Diagnóstico

O usuário confirma que após a última leva de mudanças (arcos 0.4–0.8, gold neon, partículas mínimas 5, halo aditivo, repulsão seller, etc.) o grafo perdeu a calibração visual anterior:

- Bolinhas parecem maiores → vem do `radius * 1.9` no glow + halos extras + nó-objeto `Group` com várias camadas. Pelo log, **168 nós e 516 links** ficam empilhados visualmente porque os arcos 0.4–0.8 "incham" o espaço aparente e o glow aditivo somado à curva pronunciada engrossa tudo.
- Linhas parecem mais grossas → `linkWidthFn` aplica `0.4 + w*3` (até 3.4) e mais `*1.6` para gold; os arcos curvados com partículas grandes (`base*2` para gold) reforçam a sensação de "fios grossos".
- Sem opacidade/fade nas linhas → trocamos `linkOpacity={0.55}` (constante) na última versão, perdendo a `linkOpacityFn` que dava 0.025 para conexões fracas (justamente o que filtrava ruído visual).
- "Tudo amontoado" → distância base do link continua `320 + (1-w)*420`, mas a curvatura média subiu para ~0.6, então arcos passam por dentro do cluster vizinho — visualmente aproxima.

A solução não é mexer na física (que está boa segundo o próprio usuário no turno anterior), e sim **restaurar os parâmetros visuais antigos** dos elementos (linhas finas, fade por peso, glow contido), preservando os **3 efeitos novos** (flares, dourado neon real seller↔seller, arcos).

---

## Mudanças

### 1. `JarvisGraph3D.tsx` — restaurar parâmetros visuais "magros"

**Linhas (ForceGraph3D props):**
- `linkOpacity={linkOpacityFn}` → volta a usar a função (0.025 para fracas, 0.45 normais, 0.95 focadas) em vez do `0.55` constante. **Esse é o "fade que sumiu".**
- `linkWidthFn`: reduzir base de `0.4 + w*3` para `0.25 + w*1.6` (mais fino, como antes); manter `*1.4` para gold (em vez de 1.6) — gold continua destacado mas sem virar "cabo".
- `linkDirectionalParticleWidth`: base `0.6 + w*1.6` (em vez de `1 + w*3`); gold `*1.6`.
- `linkDirectionalParticles`: gold = 4 (em vez de 5); demais sem mudança.
- `linkCurvature`: voltar para faixa **0.18 a 0.42** (em vez de 0.4–0.8). Continua sendo arco visível, mas sem invadir clusters vizinhos.

**Nó visual (`buildNodeObject`):**
- Glow `radius * 1.9` → `radius * 1.55`; opacidade base do glow `0.08 + heat*0.28` → `0.05 + heat*0.18`. Bolinhas voltam a parecer menores e mais "limpas".
- Halo capital de `buyer_financial`: `radius * 2.4 → 2.0`, opacidade `0.06 → 0.04`.
- Anéis orbitais: `radius * 2.2/2.4 → 2.05/2.2`, opacidade `0.32 → 0.22`.
- Anel dourado de mega-seller: opacidade `0.55 → 0.4`.

### 2. `JarvisGraph3D.tsx` — overlay diagnóstico (FPS / N / E / flare ativo + copiar logs)

Adicionar painel **canto inferior esquerdo** (z-20), pequeno, estilo HUD verde mono:

- **FPS**: medido via `requestAnimationFrame` num `useEffect` (média móvel de 60 frames).
- **Nodes / Links**: já temos no estado.
- **Flare ativo**: novo state `flareActive: boolean` exposto pelo hook `useSolarFlares` via callback `onFlareChange?: (active: boolean) => void` (assinatura opcional adicionada). Acende um pontinho amarelo quando `true`.
- **Botão "Copiar logs"**: captura os últimos N logs do console interceptando `console.log/info/warn/error` num buffer circular (criado em `useEffect` no mount, máximo 200 entradas). Ao clicar, serializa para texto e usa `navigator.clipboard.writeText` + toast "Logs copiados".

### 3. `JarvisGraph3D.tsx` — controles avançados de arco no painel "Ajustes visuais"

Adicionar 3 novos controles ao `visualPrefs` (e ao painel já existente bottom-right):

- **`curvatureMin`** (slider 0–80, default 18) — limite inferior da faixa.
- **`curvatureRange`** (slider 0–60, default 24) — amplitude da faixa.
- **`linkSegments`** (slider 4–24, default 12) — `linkResolution`.
- **`arcStyle`** (toggle visual: "Quadrática" / "Senoidal") — atualmente `react-force-graph-3d` só suporta Bézier quadrática nativa via `linkCurvature`; o toggle "Senoidal" altera o `linkCurveRotation` para variar em padrão senoidal por hash, simulando outro estilo. Documentar no código que é uma aproximação.

`linkCurvature` passa a usar: `curvatureMin/100 + (Math.abs(h) % 100) / 100 * (curvatureRange/100)`.

### 4. `JarvisGraph3D.tsx` — halo dourado proporcional ao weight

No `linkMaterial` para gold links, mudar `opacity: 0.92` constante para:

```ts
const w = l.weight ?? 0.5;
const op = focusId
  ? (sId === focusId || tId === focusId ? 0.95 : 0.4)
  : 0.5 + w * 0.45; // 0.5 (fraco) → 0.95 (forte)
```

Isso atende: "halo neon dourado proporcional à força do link e padrão consistente em foco/não-foco".

### 5. `useSolarFlares.ts` — expor estado ativo

Adicionar parâmetro opcional `onActiveChange?: (active: boolean) => void`. Chamar `true` no `fire()` e `false` no `cleanupActive()`. Manter assinatura retrocompatível.

---

## Arquivos afetados

- `src/components/equity-brain/jarvis/JarvisGraph3D.tsx` — restaurar tamanhos, restaurar `linkOpacity={linkOpacityFn}`, novos controles no painel, overlay diagnóstico, halo dourado por weight.
- `src/components/equity-brain/jarvis/useSolarFlares.ts` — callback `onActiveChange` opcional.

**Não mexer:** `equityGraphJarvisAdapter.ts` (raios já corretos), forças em `useEffect` (físico já validado pelo usuário), `equityGraphScoring.ts` (cores corretas).

## Validação pós-implementação

1. Abrir `/equity-brain/grafo-jarvis` no preview → confirmar bolinhas menores, links finos com fade, arcos suaves (não invadem clusters).
2. Aguardar ~10s → ponto "FLARE" no overlay deve piscar amarelo durante ~1.5s.
3. Clicar em "Copiar logs" → colar em qualquer editor para confirmar conteúdo.
4. Abrir painel "Ajustes" → mexer em curvatura/segmentos e ver arcos respondendo em tempo real.
