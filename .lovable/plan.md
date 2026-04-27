## Problema

O grafo no `/equity-brain/grafo` está em movimento contínuo (efeito "água-viva"), o que dificulta:
- Ler labels
- Clicar nos nodes
- Analisar clusters

Causas atuais em `StrategicGraph.tsx`:
- `cooldownTicks={120}` mas `d3AlphaDecay={0.025}` (decai lento → demora a esfriar)
- Nenhuma força de **repulsão custom** → nodes ficam apinhados
- Sem `cooldownTime` curto → simulação reinicia a cada filtro
- Sem reheat controlado no hover (hoje o hover repinta tudo, o que pode estar empurrando a simulação)

## Solução

Tornar o grafo **estático após convergência rápida** e expandir o espaçamento, com expansão visual apenas no hover (sem mexer na simulação).

### 1. Convergência rápida e parada definitiva (`StrategicGraph.tsx`)

Ajustar props do `<ForceGraph2D>`:
- `cooldownTicks={80}` (menos ticks)
- `cooldownTime={3000}` (para de simular após 3s no máximo)
- `d3AlphaDecay={0.05}` (decai 2x mais rápido → estabiliza logo)
- `d3VelocityDecay={0.55}` (mais "atrito" → menos drift)
- `warmupTicks={60}` (pré-aquece ANTES de renderizar → já entra estável)
- Adicionar `onEngineStop` para fixar nodes (`node.fx = node.x; node.fy = node.y`) garantindo que ele não se mova mais — nem em hover, nem em re-render.

### 2. Forças customizadas para espaçar (via `fgRef.current.d3Force`)

Em `useEffect` após mount:
- `d3Force('charge').strength(-450)` (repulsão forte, hoje é o default ~-30)
- `d3Force('link').distance(link => 80 + (1 - link.weight) * 120)` (links fracos = nodes mais distantes)
- Adicionar `d3Force('collide', d3.forceCollide(node => baseRadius(node) + 14))` para evitar overlap

### 3. Hover sem reaquecer simulação

Hoje `setHoveredNodeId` dispara re-render do canvas (ok), mas precisamos garantir que **NÃO** chamamos `fgRef.current.d3ReheatSimulation()`. O atual já não chama — apenas confirmar.

Para o efeito visual de "aumentar no hover":
- Já existe `isHovered` no `nodeCanvasObject`
- Aumentar o multiplicador atual: halo + raio ~50% maior quando hovered
- Vizinhos (`neighborIds`) ganham um leve "pulse" de cor mais forte sem mover

### 4. Re-fit após estabilizar

No `onEngineStop`:
- Chamar `fgRef.current.zoomToFit(400, 60)` uma única vez para enquadrar todo o grafo já parado.

### 5. Reset ao trocar filtros

Quando `nodes`/`edges` mudam (filtros), liberar fixação:
- `useEffect` que limpa `node.fx`/`node.fy` de todos os nodes e dá `d3ReheatSimulation()` controlado, depois `onEngineStop` re-fixa.

## Arquivos a modificar

- `src/components/equity-brain/graph/StrategicGraph.tsx` (único arquivo)

## Resultado esperado

- Grafo entra já organizado (warmup pré-render)
- Para de mexer em ~3s
- Nodes bem espaçados, sem sobreposição
- Hover destaca visualmente sem mover nada
- Cliques precisos, leitura confortável
