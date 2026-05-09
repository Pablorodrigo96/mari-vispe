## Objetivo

Trocar o visual "nuvem dispersa" do `/equity-brain/grafo-jarvis` pelo **globo 3D** (esfera densa girando), mantendo todos os filtros, dados e efeitos atuais (HUD, neon, sinapses, flares).

A causa do dispersão: hoje o grafo usa `react-force-graph-3d` com forças d3 (charge, link distance, collide, seller-spread). Mesmo após "freeze", os pontos formam uma nuvem orgânica, não uma esfera.

## Estratégia

**Não trocamos a biblioteca**. Continuamos com `react-force-graph-3d` (e todo o resto do arquivo) — só **substituímos o layout** por uma distribuição esférica fixa (Fibonacci sphere) e **rotacionamos** a câmera.

### Arquivo único alterado: `src/components/equity-brain/jarvis/JarvisGraph3D.tsx`

#### 1. Posicionamento esférico (Fibonacci sphere)

Em um `useEffect` que roda quando `graphData.nodes` muda, calcular para cada nó:

```text
golden = π · (3 − √5)
y_norm = 1 − (i / (N−1)) · 2          // de 1 a -1
r_xy   = √(1 − y_norm²)
θ      = golden · i
x = cos(θ) · r_xy · R
y = y_norm · R
z = sin(θ) · r_xy · R
```

Depois fixar com `node.fx = x; node.fy = y; node.fz = z;`. Isso **trava** o nó na posição esférica e neutraliza qualquer força residual.

- `R` (raio da esfera) escalado por contagem de nós: `R = 600 + N * 4`, clamp 700–2200.
- Ordem: ordenar nós por `heat` decrescente antes do Fibonacci → nós quentes (mais conectados) ficam concentrados perto dos polos visíveis, frios ficam atrás. Isso já dá hierarquia 3D natural sem precisar reordenar Z manualmente.
- Sellers grandes (`bigSellerRing`) podem receber `R * 1.04` para "saltar" levemente da casca.

#### 2. Desligar as forças

No `useEffect` de forças (linhas ~418-513), substituir o bloco atual por:

```ts
const fgNow = fgRef.current as any;
fgNow.d3Force?.("charge", null);
fgNow.d3Force?.("link", null);
fgNow.d3Force?.("collide", null);
fgNow.d3Force?.("center", null);
fgNow.d3Force?.("seller-spread", null);
fgNow.d3AlphaDecay?.(1);   // simulação para imediatamente
fgNow.cooldownTicks?.(0);
```

E remover o `setTimeout(16000)` de freeze — não precisa mais, já está fixo.

#### 3. Rotação contínua (o "globo girando")

Em vez de rotacionar 350 nós a cada frame (custo alto), **rotacionamos a câmera** ao redor da origem:

```ts
useEffect(() => {
  const fg = fgRef.current as any;
  if (!fg) return;
  let raf = 0;
  const R_cam = 2800;
  const start = performance.now();
  const speed = 0.00012; // rad/ms ≈ 1 volta a cada ~52s
  const loop = () => {
    const t = performance.now() - start;
    const a = t * speed;
    fg.cameraPosition?.(
      { x: Math.sin(a) * R_cam, y: Math.cos(a * 0.3) * 200, z: Math.cos(a) * R_cam },
      { x: 0, y: 0, z: 0 },
      0
    );
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(raf);
}, [graphData.nodes.length]);
```

- Pausa a rotação enquanto o usuário arrasta: detectar via `onNodeDragStart` / `onNodeClick` → `pauseRef.current = true`. Retomar após 8s sem interação.
- `?focus=` continua funcionando: ao focar, pausamos o auto-orbit (já estava em outro `useEffect`).

#### 4. Profundidade visual (Z-sorting / opacidade)

O `react-force-graph-3d` já faz depth sort automático via WebGL. Para reforçar a ilusão de esfera (pontos do "fundo" mais sutis), no `buildNodeObject` ler `node.z` e modular a opacidade do `glow`:

```ts
const zNorm = ((n.z ?? 0) + R) / (2 * R); // 0..1, 1 = frente
glow.material.opacity *= 0.4 + 0.6 * zNorm;
```

Isso reproduz exatamente o efeito do vídeo (frente brilhante, fundo apagando).

#### 5. Manter

- Sidebar de filtros, HUD, scanlines, vinheta, flares, sinapses, painel de detalhe, deep-link `?focus=`.
- Links/arestas continuam renderizando normalmente — vão atravessar a esfera, criando o look de "cérebro/teia interna".

## Riscos

- Com 350 nós sobre a esfera, links atravessando o centro podem virar ruído visual. Mitigação: o `linkOpacityFn` atual já joga links de baixo peso para `0.025` quando há foco; sem foco mantém `0.45`. Pode ser preciso baixar para `0.12` o default. Decidiremos visualmente após ver render.
- `node.fx/fy/fz` precisam ser setados **antes** do primeiro tick. Vamos setar dentro do `useMemo` do `graphData` (logo após `adaptToJarvisGraph`) para garantir.

## Fora de escopo

- Trocar para Three.js puro / `@react-three/fiber`.
- Mexer no grafo 2D (`/equity-brain/grafo`).
- Mudar lógica de scoring / dados.
