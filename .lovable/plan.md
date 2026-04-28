## Auditoria do Grafo 3D — diagnóstico

Naveguei até `/equity-brain/grafo-jarvis` no preview e a tela está **100% em branco**. Causa raiz confirmada nos logs do navegador:

```
504 () /node_modules/.vite/deps/chunk-JLMLWGGE.js
504 () /node_modules/.vite/deps/chunk-FFODJARL.js
```

O `vite.config.ts` está com `three`, `three-spritetext`, `three-render-objects`, `three-forcegraph`, `react-force-graph-3d` e `d3-force-3d` em `optimizeDeps.exclude`. Sem pre-bundle, o Vite tenta servir cada arquivo do `three` (~1.500 módulos) individualmente em dev — o servidor estoura e devolve 504 → o React nunca monta. O build de produção funciona porque o Rollup faz o bundling, mas o **preview que o usuário vê está quebrado**.

Além disso, encontrei mais 4 bugs ativos no componente.

## Correções

### 1. Tela branca em dev (causa raiz)
- `vite.config.ts`: voltar `three`, `three-spritetext`, `three-render-objects`, `three-forcegraph`, `react-force-graph-3d`, `d3-force-3d` para `optimizeDeps.include`.
- Manter o alias do shim `ngraph.forcelayout` (resolveu o erro de export default antes).
- Adicionar shims minimalistas para `ngraph.events`, `ngraph.merge`, `ngraph.random` (mesmo padrão) caso o pre-bundle reclame de novo.
- Limpar `node_modules/.vite` para forçar re-otimização limpa.

### 2. Forças de repulsão não aplicadas em grafos já estabilizados
No `useEffect` que configura `charge`/`collide`/`link`, chamar `fg.d3ReheatSimulation()` no fim para garantir que as novas forças (distância mínima entre empresas) realmente atuem mesmo após mudanças de filtro.

### 3. `useGhostSynapses` — leak e ghosts órfãos
- Remover qualquer grupo `ghost-synapses` pré-existente da cena antes de adicionar o novo (defesa contra dupla montagem em StrictMode/HMR).
- Buscar o nó atual via `fgRef.current.graphData()` em vez do snapshot capturado, para sempre ter coordenadas vivas mesmo após re-render.

### 4. Curvatura colapsando em arestas sem coordenada inicial
Antes da simulação rodar, `source.x`/`target.x` são `undefined`. Trocar o cálculo para usar `linkCurvature` constante por par (hash determinístico → 0.25–0.55) em vez de depender de distância 3D. Isso elimina o efeito "fragmentado" no primeiro frame e mantém o arco circular mesmo no zoom out.

### 5. Freeze prematuro do layout
Aumentar o timeout de freeze de 7s → 12s e só congelar se a simulação realmente parou (`fg.d3AlphaTarget() === 0` e `fg.d3Alpha() < 0.05`). Caso contrário, deixar a física continuar.

## Detalhes técnicos

**vite.config.ts** — `optimizeDeps`:
```ts
include: [
  "react", "react-dom", "react/jsx-runtime", "reactflow", "dagre",
  "three", "three-spritetext", "three-render-objects",
  "three-forcegraph", "react-force-graph-3d", "d3-force-3d",
],
exclude: [],
```

**JarvisGraph3D.tsx** — após configurar forças:
```ts
fg.d3ReheatSimulation();
```

**JarvisGraph3D.tsx** — `linkCurvature`:
```ts
linkCurvature={(l: any) => {
  const k = endpointId(l.source) + "|" + endpointId(l.target);
  let h = 0; for (let i=0;i<k.length;i++) h = (h*31 + k.charCodeAt(i))|0;
  return 0.25 + (Math.abs(h) % 30) / 100; // 0.25 .. 0.54 estável
}}
```

**useGhostSynapses.ts** — antes de `scene.add(group)`:
```ts
const prev = scene.getObjectByName("ghost-synapses");
if (prev) scene.remove(prev);
```
e dentro do `tick`, usar `fgRef.current?.graphData().nodes` para coordenadas.

## Validação
1. `rm -rf node_modules/.vite` e aguardar Vite reotimizar.
2. Navegar até `/equity-brain/grafo-jarvis` com `browser--navigate_to_sandbox` e capturar screenshot — deve mostrar o grafo 3D.
3. Conferir console do navegador: zero erros 504, zero SyntaxError de ngraph.
4. Rodar `bun run build:dev` para garantir que produção segue OK.
