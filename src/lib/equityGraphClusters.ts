/**
 * Detecção leve de clusters no grafo estratégico.
 * Usa heurísticas baseadas em (vertical, UF, type) — suficiente para o visual.
 * Não tenta Louvain real (caro p/ render em 60fps).
 */

import type { GraphNode, GraphEdge } from "./equityGraphBuilder";

export type ClusterKind =
  | "regional_consolidation"
  | "strategic_buyer_orbit"
  | "thesis_circle"
  | "vertical_pool"
  | "hot_opportunities";

export interface Cluster {
  id: string;
  kind: ClusterKind;
  label: string;
  color: string;
  nodeIds: string[];
}

export const CLUSTER_COLORS: Record<ClusterKind, string> = {
  regional_consolidation: "rgba(16, 185, 129, 0.10)",  // emerald
  strategic_buyer_orbit: "rgba(56, 189, 248, 0.10)",   // sky
  thesis_circle: "rgba(167, 139, 250, 0.12)",          // violet
  vertical_pool: "rgba(251, 191, 36, 0.08)",           // amber
  hot_opportunities: "rgba(244, 63, 94, 0.14)",        // rose
};

export function detectClusters(
  nodes: GraphNode[],
  edges: GraphEdge[],
): Cluster[] {
  const clusters: Cluster[] = [];

  // 1. Regional consolidation: sellers da mesma (vertical + UF) com >=3
  const byVertUf = new Map<string, string[]>();
  for (const n of nodes) {
    if (n.type !== "seller" || !n.vertical || !n.uf) continue;
    const key = `${n.vertical}::${n.uf}`;
    if (!byVertUf.has(key)) byVertUf.set(key, []);
    byVertUf.get(key)!.push(n.id);
  }
  for (const [key, ids] of byVertUf.entries()) {
    if (ids.length < 3) continue;
    const [vert, uf] = key.split("::");
    clusters.push({
      id: `cluster:reg:${key}`,
      kind: "regional_consolidation",
      label: `Consolidação ${vert} · ${uf}`,
      color: CLUSTER_COLORS.regional_consolidation,
      nodeIds: ids,
    });
  }

  // 2. Strategic buyer orbit: cada buyer estratégico + seus sellers conectados
  const buyerNeighbors = new Map<string, Set<string>>();
  for (const e of edges) {
    if (!e.source.startsWith("buyer:") || !e.target.startsWith("seller:")) continue;
    if (!buyerNeighbors.has(e.source)) buyerNeighbors.set(e.source, new Set());
    buyerNeighbors.get(e.source)!.add(e.target);
  }
  for (const [bid, sellers] of buyerNeighbors.entries()) {
    if (sellers.size < 4) continue;
    const buyer = nodes.find((n) => n.id === bid);
    if (!buyer || buyer.type !== "buyer_strategic") continue;
    clusters.push({
      id: `cluster:orbit:${bid}`,
      kind: "strategic_buyer_orbit",
      label: `Órbita ${buyer.label}`,
      color: CLUSTER_COLORS.strategic_buyer_orbit,
      nodeIds: [bid, ...Array.from(sellers).slice(0, 12)],
    });
  }

  // 3. Hot opportunities: sellers com >=3 edges de weight>0.6
  const hotEdgeCount = new Map<string, number>();
  for (const e of edges) {
    if (e.weight < 0.6) continue;
    hotEdgeCount.set(e.target, (hotEdgeCount.get(e.target) ?? 0) + 1);
    hotEdgeCount.set(e.source, (hotEdgeCount.get(e.source) ?? 0) + 1);
  }
  const hotIds = Array.from(hotEdgeCount.entries())
    .filter(([, c]) => c >= 3)
    .map(([id]) => id);
  if (hotIds.length >= 3) {
    clusters.push({
      id: `cluster:hot`,
      kind: "hot_opportunities",
      label: `🔥 Hotspots (${hotIds.length})`,
      color: CLUSTER_COLORS.hot_opportunities,
      nodeIds: hotIds,
    });
  }

  return clusters;
}
