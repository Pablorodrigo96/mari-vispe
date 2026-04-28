/**
 * Equity Graph Jarvis Adapter
 *
 * Pega o grafo cru produzido por buildStrategicGraph (já filtrado em
 * StrategicGraph.tsx) e devolve uma estrutura enriquecida pronta para
 * renderização 3D (esferas, glows, partículas, labels condicionais).
 *
 * Não roda novas queries. Não duplica scoring. Apenas decora.
 */

import type { GraphNode, GraphEdge, NodeType, EdgeType } from "./equityGraphBuilder";

export type StrategicRole =
  | "acquirer"
  | "target"
  | "platform"
  | "capital_provider"
  | "thesis"
  | "asset"
  | "strategy";

export interface JarvisNode extends GraphNode {
  degree: number;
  strongDegree: number;
  hot: boolean;
  heat: number; // 0..1
  visualRadius: number; // px no espaço 3D
  showLabel: boolean;
  strategicRole: StrategicRole;
  isNeuron: boolean; // marca visual: dispara sinapses fantasmas
}

export interface JarvisLink extends GraphEdge {
  particleIntensity: number; // 0..1 — usado quando partículas estão ativas
}

export interface JarvisGraphData {
  nodes: JarvisNode[];
  links: JarvisLink[];
}

// Tipos de aresta que sempre mostram partículas (mesmo idle)
export const ALWAYS_LIVE_EDGE_TYPES: ReadonlySet<EdgeType> = new Set([
  "buyer_acquires_seller",
  "platform_addon",
  "valuation_arbitrage",
]);

function calculateVisualRadius(node: GraphNode, degree: number, strongDegree: number): number {
  const score = Number.isFinite(node.strategic_score) ? node.strategic_score : 0;
  const base = 4;
  const scoreFactor = (score / 100) * 8;
  const degreeFactor = Math.log(1 + degree) * 3;
  const heatFactor = strongDegree >= 3 ? 3 : 0;

  if (node.type === "platform") return base + scoreFactor + degreeFactor + heatFactor + 5;
  if (node.type === "buyer_strategic") return base + scoreFactor + degreeFactor + 2;
  if (node.type === "thesis") return base + scoreFactor + 2;
  if (node.type === "strategy") return base + scoreFactor + 1.5;
  if (node.type === "asset") return base * 0.7 + scoreFactor * 0.6;

  return base + scoreFactor + degreeFactor + heatFactor;
}

function calculateNodeHeat(score: number, degree: number, strongDegree: number): number {
  const s = score / 100;
  const d = Math.min(1, degree / 12);
  const sd = Math.min(1, strongDegree / 5);
  return Math.max(0, Math.min(1, s * 0.45 + d * 0.25 + sd * 0.3));
}

function inferStrategicRole(node: GraphNode): StrategicRole {
  switch (node.type as NodeType) {
    case "buyer_strategic":
      return "acquirer";
    case "buyer_financial":
      return "capital_provider";
    case "platform":
      return "platform";
    case "thesis":
      return "thesis";
    case "asset":
      return "asset";
    case "strategy":
      return "strategy";
    case "seller":
    default:
      return "target";
  }
}

function calculateParticleIntensity(edge: GraphEdge): number {
  const w = edge.weight ?? 0;
  const c = edge.confidence ?? 0;
  const typeBoost = ALWAYS_LIVE_EDGE_TYPES.has(edge.edge_type) ? 0.2 : 0;
  return Math.max(0, Math.min(1, w * 0.7 + c * 0.3 + typeBoost));
}

const endpointId = (v: any): string =>
  typeof v === "string" ? v : v?.id ?? String(v ?? "");

/**
 * Adapta o grafo já filtrado em StrategicGraph para o formato Jarvis 3D.
 * Não re-aplica filtros — espera receber o subset que deve ser visualizado.
 */
export function adaptToJarvisGraph(
  nodes: GraphNode[],
  edges: GraphEdge[],
): JarvisGraphData {
  const degreeMap = new Map<string, number>();
  const strongDegreeMap = new Map<string, number>();

  for (const edge of edges) {
    const sId = endpointId(edge.source);
    const tId = endpointId(edge.target);
    degreeMap.set(sId, (degreeMap.get(sId) ?? 0) + 1);
    degreeMap.set(tId, (degreeMap.get(tId) ?? 0) + 1);

    if ((edge.weight ?? 0) >= 0.6) {
      strongDegreeMap.set(sId, (strongDegreeMap.get(sId) ?? 0) + 1);
      strongDegreeMap.set(tId, (strongDegreeMap.get(tId) ?? 0) + 1);
    }
  }

  // Hash determinístico simples → 10% dos nós marcados como "neurônios" (preferindo
  // sellers e buyers, que são os disparadores naturais de atividade no cérebro).
  const hashId = (s: string) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  };

  const jarvisNodes: JarvisNode[] = nodes.map((node) => {
    const degree = degreeMap.get(node.id) ?? 0;
    const strongDegree = strongDegreeMap.get(node.id) ?? 0;
    const score = Number.isFinite(node.strategic_score) ? node.strategic_score : 0;
    const hot = strongDegree >= 3;
    const heat = calculateNodeHeat(score, degree, strongDegree);
    const visualRadius = calculateVisualRadius(node, degree, strongDegree);
    const showLabel =
      hot ||
      score >= 75 ||
      degree >= 5 ||
      node.type === "thesis" ||
      node.type === "platform";

    const neuronEligible =
      node.type === "seller" ||
      node.type === "buyer_strategic" ||
      node.type === "buyer_financial";
    // 10% dos elegíveis (hash estável → mesmo nó sempre é/ou-não neurônio)
    const isNeuron = neuronEligible && hashId(node.id) % 10 === 0;

    return {
      ...node,
      degree,
      strongDegree,
      hot,
      heat,
      visualRadius,
      showLabel,
      strategicRole: inferStrategicRole(node),
      isNeuron,
    };
  });

  const jarvisLinks: JarvisLink[] = edges.map((edge) => ({
    ...edge,
    particleIntensity: calculateParticleIntensity(edge),
  }));

  return { nodes: jarvisNodes, links: jarvisLinks };
}
