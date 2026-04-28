/**
 * Browser-safe ESM shim for ngraph.forcelayout.
 *
 * three-forcegraph faz import estático de `ngraph.forcelayout` em module
 * evaluation time, mas o pacote é CommonJS-only e quebra o ESM do Vite.
 * Como usamos forceEngine="d3" (default), o engine ngraph nunca é usado de
 * fato — o shim só precisa existir e ser chamável sem explodir.
 *
 * IMPORTANTE: NÃO joga erro. Retorna um layout no-op com a mesma shape mínima
 * que three-forcegraph espera, caso por acidente seja chamado.
 */

const ZERO = { x: 0, y: 0, z: 0 };
const ZERO_LINK = { from: ZERO, to: ZERO };

function createNoopLayout(graph?: any) {
  return {
    step: () => true, // true = stable
    getNodePosition: () => ZERO,
    getLinkPosition: () => ZERO_LINK,
    setNodePosition: () => {},
    pinNode: () => {},
    isNodePinned: () => false,
    dispose: () => {},
    graph:
      graph ?? {
        getLink: () => null,
        forEachNode: () => {},
        forEachLink: () => {},
      },
    simulator: { settings: {} },
  };
}

const createLayout = (graph?: any) => createNoopLayout(graph);

(createLayout as any).simulator = () => ({ settings: {} });

export default createLayout;
