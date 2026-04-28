## Diagnóstico

Erro runtime: `Cannot read properties of undefined (reading 'tick')` em `react-force-graph-3d.js:1914` dentro de `layoutTick`. A linha é `state.layout[isD3Sim ? "tick" : "step"]()` — significa que `state.layout` está `undefined` quando o ciclo de animação roda.

**Causa raiz:** o `useEffect` em `JarvisGraph3D` chama `fg.d3Force(...)` e `fg.d3ReheatSimulation()` imediatamente após `graphData` chegar. Esse `useEffect` roda **antes** de o react-force-graph internamente executar `_updateProps` (que cria `state.layout = state.d3ForceLayout`). A primeira chamada a `d3ReheatSimulation` força um tick com layout ainda não definido → exception.

Bônus: meu shim de `ngraph.forcelayout` joga erro se chamado. Embora o engine seja `d3` (default), três-forcegraph chama `simulator()` em pontos de inicialização defensiva — quero um shim no-op que não exploda.

## Correções

### 1. Shim de ngraph que NÃO joga erro
Reescrever `src/shims/ngraphForcelayout.ts` retornando um layout no-op (`step()→true`, `getNodePosition→{0,0,0}`, etc.) com a shape mínima esperada pelo three-forcegraph. Mesmo que seja chamado por engano, não derruba a renderização.

### 2. Diferir configuração de forças para depois do mount do react-force-graph
No `useEffect` de forças do `JarvisGraph3D`, envolver as chamadas a `fg.d3Force(...)`, `fg.cameraPosition(...)` e `fg.d3ReheatSimulation()` em dois `requestAnimationFrame` aninhados. Isso garante que o react-force-graph já rodou seu `_updateProps` interno e populou `state.layout` com o `d3ForceLayout` antes de tocarmos nele. Adicionar `try/catch` defensivo e cleanup que cancela os RAFs.

### 3. Manter o shim com `simulator` callable
Adicionar a propriedade `simulator` como função no objeto exportado, retornando `{ settings: {} }` — three-forcegraph chama isso em alguns paths.

## Detalhes técnicos

**`src/shims/ngraphForcelayout.ts`** — substituir conteúdo por:
```ts
const ZERO = { x: 0, y: 0, z: 0 };
const ZERO_LINK = { from: ZERO, to: ZERO };
function createNoopLayout(graph?: any) {
  return {
    step: () => true,
    getNodePosition: () => ZERO,
    getLinkPosition: () => ZERO_LINK,
    setNodePosition: () => {},
    pinNode: () => {},
    isNodePinned: () => false,
    dispose: () => {},
    graph: graph ?? { getLink: () => null, forEachNode: () => {}, forEachLink: () => {} },
    simulator: { settings: {} },
  };
}
const createLayout = (graph?: any) => createNoopLayout(graph);
(createLayout as any).simulator = () => ({ settings: {} });
export default createLayout;
```

**`JarvisGraph3D.tsx`** — substituir o `useEffect` de forças (linhas 263–322) por uma versão com double-RAF defer + try/catch, mantendo a mesma lógica de forças/freeze. Cleanup cancela RAFs e timeout.

## Validação
1. Recarregar `/equity-brain/grafo-jarvis`.
2. Console: zero `Cannot read properties of undefined (reading 'tick')`.
3. Screenshot: grafo renderiza com 240+ nós e simulação rodando.
