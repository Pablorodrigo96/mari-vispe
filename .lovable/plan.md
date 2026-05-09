## Objetivo

Substituir o layout esférico determinístico atual (Fibonacci sphere com `fx/fy/fz` pinados, todas as forças d3 nulas) por um efeito de **germinação progressiva**: nós nascem na origem, links entram aos poucos, e a simulação de força os empurra organicamente até estabilizarem em formato de globo via `forceRadial`.

## Arquivo afetado

`src/components/equity-brain/jarvis/JarvisGraph3D.tsx`

## Mudanças

### 1. Estado de links visíveis (germinação)

Adicionar:
```ts
const [visibleLinkCount, setVisibleLinkCount] = useState(0);
```

Os nós entram todos de uma vez (com posição inicial em 0,0,0) — o que cresce progressivamente é o conjunto de **links**. Isso é mais barato que filtrar nós e produz o efeito "neurônios formando sinapses".

### 2. Sequenciador

Novo `useEffect` disparado quando `graphData.links.length` muda:

```ts
useEffect(() => {
  setVisibleLinkCount(0);
  if (!graphData.links.length) return;
  const STEP = 3;          // 3 links por tick
  const INTERVAL_MS = 70;  // ~14fps de germinação
  const id = setInterval(() => {
    setVisibleLinkCount((c) => {
      const next = c + STEP;
      if (next >= graphData.links.length) {
        clearInterval(id);
        return graphData.links.length;
      }
      return next;
    });
  }, INTERVAL_MS);
  return () => clearInterval(id);
}, [graphData.links]);

const displayLinks = useMemo(
  () => graphData.links.slice(0, visibleLinkCount),
  [graphData.links, visibleLinkCount],
);
```

Passar `displayLinks` (não `graphData.links`) para a prop `linkData` do `<ForceGraph3D />`. Os `nodes` continuam sendo o array completo desde o frame zero.

### 3. Posicionamento inicial em (0,0,0)

Remover o bloco do useEffect atual (linhas ~419-478) que fixa `fx/fy/fz` em coordenadas Fibonacci. Substituir por inicialização única:

```ts
useEffect(() => {
  if (!graphData.nodes.length) return;
  graphData.nodes.forEach((n: any) => {
    // jitter mínimo evita NaN do d3 quando todos coincidem
    n.x = (Math.random() - 0.5) * 0.5;
    n.y = (Math.random() - 0.5) * 0.5;
    n.z = (Math.random() - 0.5) * 0.5;
    delete n.fx; delete n.fy; delete n.fz;
  });
}, [graphData.nodes]);
```

### 4. Forças d3 (expansão orgânica + globo)

Importar `forceRadial` do `d3-force-3d` (já disponível). Configurar via `useEffect` que aplica forças no `fgRef.current`:

```ts
import { forceCollide, forceManyBody, forceRadial, forceLink } from "d3-force-3d";

useEffect(() => {
  const fg = fgRef.current as any;
  if (!fg || !graphData.nodes.length) return;

  const N = graphData.nodes.length;
  const R = Math.max(600, Math.min(1800, 500 + N * 3.5));
  sphereRadiusRef.current = R;

  fg.d3Force("charge", forceManyBody().strength(-180).distanceMax(R * 1.6));
  fg.d3Force("link", forceLink()
    .id((d: any) => d.id)
    .distance((l: any) => 60 + (1 - (l.weight ?? 0.5)) * 90)
    .strength(0.35));
  fg.d3Force("collide", forceCollide((n: any) => (n.visualRadius ?? 6) + 4));
  fg.d3Force("radial", forceRadial(R, 0, 0, 0).strength(0.18));
  fg.d3Force("center", null);

  // Damping/viscosidade — crescimento controlado, sem explodir
  fg.d3VelocityDecay(0.55);
  fg.d3AlphaDecay(0.012);
  fg.d3AlphaTarget(0.05); // mantém vivo durante a germinação
  fg.cooldownTicks(Infinity);
  fg.refresh();
}, [graphData.nodes]);
```

### 5. Congelamento após germinação completa

Quando `visibleLinkCount === graphData.links.length`, baixar o `alphaTarget` para 0 e deixar o `alphaDecay` levar a simulação ao repouso. Após estabilizar (~2s), aplicar `cooldownTicks(0)` para congelar e liberar CPU:

```ts
useEffect(() => {
  const fg = fgRef.current as any;
  if (!fg) return;
  if (visibleLinkCount && visibleLinkCount >= graphData.links.length) {
    fg.d3AlphaTarget(0);
    const t = setTimeout(() => {
      try { fg.cooldownTicks(0); fg.refresh(); } catch {}
    }, 2500);
    return () => clearTimeout(t);
  }
}, [visibleLinkCount, graphData.links.length]);
```

### 6. Auto-orbit da câmera

Mantém o orbit existente (linhas ~480+). A câmera continua girando ao redor da origem; agora o globo de fato se forma em volta dela em vez de aparecer pronto.

## Parâmetros ajustáveis (caso "exploda")

Se o crescimento ficar caótico, reduzir nesta ordem:
- `charge.strength`: −180 → −120
- `velocityDecay`: 0.55 → 0.7 (mais viscoso)
- `radial.strength`: 0.18 → 0.28 (puxa mais forte para a esfera)
- `STEP`: 3 → 1 (germinação mais lenta)

## Fora de escopo

- Renderização de nós (esferas, glow, anéis) — mantida.
- Filtros, painel de detalhes, presentation mode, ghost synapses, solar flares — mantidos.
- 2D `StrategicGraph` — não afetado.
