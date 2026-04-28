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
  displayColor?: string; // sobrescreve NODE_COLORS quando definido (sellers por porte+setor)
  bigSellerRing?: boolean; // sellers R$50M+ ganham anel orbital dourado
}

// ---------- Cor de seller por SETOR (matiz) + PORTE (saturação/luminância) ----------
const SECTOR_HUE: Record<string, number> = {
  "tech": 160, "saas": 160, "tecnologia": 160, "software": 160,
  "saude": 175, "saúde": 175, "health": 175, "clinica": 175, "clínica": 175,
  "industria": 25, "indústria": 25, "manufatura": 25,
  "varejo": 320, "comercio": 320, "comércio": 320, "retail": 320, "ecommerce": 320, "e-commerce": 320,
  "servico": 200, "serviço": 200, "servicos": 200, "serviços": 200, "services": 200,
  "alimenta": 15, "food": 15, "restaurante": 15,
  "educa": 270, "education": 270, "ensino": 270,
  "logistica": 45, "logística": 45, "transporte": 45,
  "telecom": 220, "isp": 220, "telecomunic": 220,
  "energia": 60, "utilities": 60,
  "constru": 30, "engenharia": 30,
  "agro": 100, "agronegocio": 100, "agronegócio": 100, "rural": 100,
};

function hueForSector(sector?: string | null): number {
  if (!sector) return 240;
  const s = sector.toLowerCase();
  for (const key of Object.keys(SECTOR_HUE)) {
    if (s.includes(key)) return SECTOR_HUE[key];
  }
  return 240;
}

interface SizeBand { sat: number; lum: number; ring: boolean; }
function bandFromRevenue(rev?: number | null): SizeBand {
  const v = Number(rev ?? 0);
  if (v >= 50_000_000) return { sat: 100, lum: 65, ring: true };
  if (v >= 10_000_000) return { sat: 90,  lum: 60, ring: false };
  if (v >= 5_000_000)  return { sat: 80,  lum: 55, ring: false };
  if (v >= 1_000_000)  return { sat: 65,  lum: 45, ring: false };
  return { sat: 50, lum: 35, ring: false };
}

function sellerColor(node: GraphNode): { color: string; ring: boolean } {
  const hue = hueForSector(node.vertical);
  const band = bandFromRevenue(node.metadata?.faturamento);
  return { color: `hsl(${hue}, ${band.sat}%, ${band.lum}%)`, ring: band.ring };
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
