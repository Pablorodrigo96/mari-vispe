/**
 * Painel lateral direito mostrando detalhes de um node selecionado.
 * Tabs: Conexões / Estratégias / Top Matches / Por que importa
 */

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, TrendingUp, Network, Sparkles, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { NODE_COLORS, NODE_LABELS, NODE_DESCRIPTIONS, EDGE_COLORS, EDGE_LABELS } from "@/lib/equityGraphScoring";
import type { GraphNode, GraphEdge } from "@/lib/equityGraphBuilder";
import { formatBRL } from "@/lib/equityBrain";

interface Props {
  node: GraphNode | null;
  allNodes: GraphNode[];
  allEdges: GraphEdge[];
  onClose: () => void;
  onFocus: (nodeId: string) => void;
  onSelectNode: (nodeId: string) => void;
}

export function NodeDetailPanel({ node, allNodes, allEdges, onClose, onFocus, onSelectNode }: Props) {
  if (!node) return null;

  // react-force-graph muta source/target para virar objetos node — extrair id de forma segura
  const endpointId = (v: any): string =>
    typeof v === "string" ? v : v?.id ?? String(v ?? "");

  const directEdges = allEdges.filter(
    (e) => endpointId(e.source) === node.id || endpointId(e.target) === node.id,
  );
  const directNeighbors = directEdges
    .map((e) => {
      const sId = endpointId(e.source);
      const tId = endpointId(e.target);
      const otherId = sId === node.id ? tId : sId;
      const other = allNodes.find((n) => n.id === otherId);
      return other ? { node: other, edge: e } : null;
    })
    .filter(Boolean) as { node: GraphNode; edge: GraphEdge }[];

  const sortedNeighbors = [...directNeighbors].sort((a, b) => b.edge.weight - a.edge.weight);
  const top5 = sortedNeighbors.slice(0, 5);

  // Top strategies (edge_types) ranked by avg weight
  const stratMap = new Map<string, { sum: number; count: number }>();
  for (const e of directEdges) {
    const cur = stratMap.get(e.edge_type) ?? { sum: 0, count: 0 };
    cur.sum += e.weight;
    cur.count += 1;
    stratMap.set(e.edge_type, cur);
  }
  const strategies = Array.from(stratMap.entries())
    .map(([k, v]) => ({ type: k, avg: v.sum / v.count, count: v.count }))
    .sort((a, b) => b.avg - a.avg);

  const color = NODE_COLORS[node.type] ?? "#71717a";
  const typeLabel = NODE_LABELS[node.type] ?? node.type;

  // Why important: weighted reasoning
  const totalConnections = directEdges.length;
  const hotConnections = directEdges.filter((e) => e.weight >= 0.7).length;
  const avgWeight = directEdges.length
    ? directEdges.reduce((s, e) => s + e.weight, 0) / directEdges.length
    : 0;

  const isCentralHub = totalConnections >= 8;
  const isUndervalued = node.type === "seller" && node.strategic_score >= 60 && node.opportunity_stage === "prospect";
  const isStrategicTarget = node.type === "seller" && hotConnections >= 3;

  // Papéis dinâmicos no grafo (badges contextuais)
  const platformAddonEdges = directEdges.filter((e) => e.edge_type === "platform_addon");
  const sellerToSellerEdges = directEdges.filter(
    (e) => e.edge_type === "seller_acquires_seller" || e.edge_type === "seller_merges_with_seller"
  );
  const isPotentialConsolidator = node.type === "seller" && platformAddonEdges.length >= 3;
  const isFusionCandidate = node.type === "seller" && sellerToSellerEdges.length >= 1;
  const isAvailableAddon = node.type === "seller" && platformAddonEdges.some((e) => {
    const sId = endpointId(e.source);
    const otherId = sId === node.id ? endpointId(e.target) : sId;
    const other = allNodes.find((n) => n.id === otherId);
    return other?.type === "platform";
  });
  const thesisTargets = node.type === "thesis" ? directNeighbors.filter((n) => n.node.type === "seller") : [];

  return (
    <Sheet open={!!node} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-[420px] sm:max-w-[420px] bg-zinc-950 border-l border-zinc-800 overflow-y-auto p-0"
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-zinc-800">
          <SheetHeader className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div
                  className="h-3 w-3 rounded-full shrink-0 ring-2 ring-zinc-900"
                  style={{ background: color, boxShadow: `0 0 12px ${color}` }}
                />
                <SheetTitle className="text-zinc-100 text-base font-bold truncate">
                  {node.label}
                </SheetTitle>
              </div>
              <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-400 shrink-0">
                {typeLabel}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-zinc-400">
              {node.vertical && <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800">{node.vertical}</span>}
              {node.uf && <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800">{node.uf}</span>}
              {node.municipio && <span className="text-zinc-500 truncate">{node.municipio}</span>}
            </div>
            <div className="flex items-end gap-3">
              <div>
                <div className="text-[9px] uppercase tracking-wider text-zinc-500">Strategic Score</div>
                <div className="text-3xl font-black text-emerald-400 leading-none">
                  {Math.round(node.strategic_score)}
                </div>
              </div>
              {node.valuation_band && node.valuation_band !== "—" && (
                <div className="ml-auto text-right">
                  <div className="text-[9px] uppercase tracking-wider text-zinc-500">Receita</div>
                  <div className="text-sm font-bold text-zinc-200">{node.valuation_band}</div>
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                onClick={() => onFocus(node.id)}
                className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 h-7 text-[11px] flex-1"
              >
                <Target className="h-3 w-3 mr-1" />
                Focar no grafo
              </Button>
              {node.metadata.listing_id && (
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                  className="bg-zinc-900 border-zinc-700 text-zinc-200 hover:text-emerald-300 h-7 text-[11px]"
                >
                  <Link to={`/anuncio/${node.metadata.listing_id}`}>
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Anúncio
                  </Link>
                </Button>
              )}
            </div>
          </SheetHeader>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="connections" className="px-5 pt-4">
          <TabsList className="grid w-full grid-cols-4 h-8 bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="connections" className="text-[10px] data-[state=active]:bg-zinc-800 data-[state=active]:text-emerald-300">
              <Network className="h-3 w-3 mr-1" />Conexões
            </TabsTrigger>
            <TabsTrigger value="strategies" className="text-[10px] data-[state=active]:bg-zinc-800 data-[state=active]:text-emerald-300">
              <TrendingUp className="h-3 w-3 mr-1" />Estratégias
            </TabsTrigger>
            <TabsTrigger value="matches" className="text-[10px] data-[state=active]:bg-zinc-800 data-[state=active]:text-emerald-300">
              <Target className="h-3 w-3 mr-1" />Top 5
            </TabsTrigger>
            <TabsTrigger value="why" className="text-[10px] data-[state=active]:bg-zinc-800 data-[state=active]:text-emerald-300">
              <Sparkles className="h-3 w-3 mr-1" />Por que
            </TabsTrigger>
          </TabsList>

          {/* CONEXÕES */}
          <TabsContent value="connections" className="mt-3 space-y-1.5 pb-6">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">
              {directEdges.length} conexões diretas
            </div>
            {sortedNeighbors.map(({ node: n, edge }) => (
              <button
                key={`${edge.id}`}
                onClick={() => onSelectNode(n.id)}
                className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800/60 transition-colors group"
              >
                <div
                  className="h-1.5 w-1.5 rounded-full shrink-0"
                  style={{ background: NODE_COLORS[n.type] }}
                />
                <span className="text-xs text-zinc-200 truncate flex-1 group-hover:text-emerald-300">
                  {n.label}
                </span>
                <span
                  className="text-[9px] px-1 py-0.5 rounded font-mono"
                  style={{ background: `${EDGE_COLORS[edge.edge_type]}20`, color: EDGE_COLORS[edge.edge_type] }}
                >
                  {edge.edge_type.split("_").slice(0, 2).join("·")}
                </span>
                <span className="text-[10px] text-emerald-400 font-bold w-8 text-right">
                  {(edge.weight * 100).toFixed(0)}
                </span>
              </button>
            ))}
            {directEdges.length === 0 && (
              <div className="text-center py-6 text-zinc-600 text-xs">
                Nenhuma conexão neste node ainda.
              </div>
            )}
          </TabsContent>

          {/* ESTRATÉGIAS */}
          <TabsContent value="strategies" className="mt-3 space-y-2 pb-6">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">
              Estratégias relacionadas (avg weight)
            </div>
            {strategies.map((s) => (
              <div key={s.type} className="flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ background: EDGE_COLORS[s.type] }}
                />
                <span className="text-xs text-zinc-200 flex-1">{EDGE_LABELS[s.type]}</span>
                <span className="text-[10px] text-zinc-500">{s.count}×</span>
                <div className="w-16 h-1 rounded bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full"
                    style={{ width: `${s.avg * 100}%`, background: EDGE_COLORS[s.type] }}
                  />
                </div>
                <span className="text-[10px] text-emerald-400 font-mono w-7 text-right">
                  {(s.avg * 100).toFixed(0)}
                </span>
              </div>
            ))}
            {strategies.length === 0 && (
              <div className="text-center py-6 text-zinc-600 text-xs">
                Sem estratégias detectadas para este node.
              </div>
            )}
          </TabsContent>

          {/* TOP 5 MATCHES */}
          <TabsContent value="matches" className="mt-3 space-y-2 pb-6">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">
              Top 5 conexões por peso
            </div>
            {top5.map(({ node: n, edge }, i) => (
              <button
                key={edge.id}
                onClick={() => onSelectNode(n.id)}
                className="w-full text-left p-2.5 rounded-md bg-zinc-900 border border-zinc-800 hover:border-emerald-700 transition-colors group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="text-emerald-500 font-black text-xs w-4">#{i + 1}</div>
                  <span className="text-xs text-zinc-100 font-bold truncate flex-1 group-hover:text-emerald-300">
                    {n.label}
                  </span>
                  <span className="text-emerald-400 font-mono text-xs">
                    {(edge.weight * 100).toFixed(0)}
                  </span>
                </div>
                <div className="text-[10px] text-zinc-400 line-clamp-2">{edge.explanation}</div>
              </button>
            ))}
          </TabsContent>

          {/* POR QUE IMPORTA */}
          <TabsContent value="why" className="mt-3 space-y-2.5 pb-6">
            <div className="p-3 rounded-md bg-zinc-900 border border-zinc-800">
              <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5">Resumo</div>
              <div className="text-xs text-zinc-200 space-y-2">
                <p>
                  <span className="text-emerald-400 font-bold">{totalConnections}</span> conexões totais ·
                  <span className="text-amber-400 font-bold"> {hotConnections}</span> de alta intensidade ·
                  peso médio <span className="text-zinc-100 font-bold">{(avgWeight * 100).toFixed(0)}</span>
                </p>
              </div>
            </div>

            {isCentralHub && (
              <Reason
                color="emerald"
                title="Hub de valor"
                text="Este node é um hub central — concentra muitas conexões estratégicas. Mover ele é mover a rede."
              />
            )}
            {isUndervalued && (
              <Reason
                color="rose"
                title="Possível arbitragem"
                text="Score alto mas ainda não está no marketplace público — janela para estruturar deal antes da concorrência."
              />
            )}
            {isStrategicTarget && (
              <Reason
                color="amber"
                title="Alvo estratégico quente"
                text={`${hotConnections} conexões de alto peso (>70). Múltiplos buyers convergem aqui.`}
              />
            )}
            {node.type === "platform" && (
              <Reason
                color="amber"
                title="Plataforma consolidada"
                text="Buyer já fez múltiplos deals nesta vertical — tese de buy-and-build comprovada."
              />
            )}
            {!isCentralHub && !isUndervalued && !isStrategicTarget && node.type !== "platform" && (
              <div className="text-xs text-zinc-500 italic px-1">
                Node em construção — adicione mais conexões para qualificar a importância estratégica.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function Reason({ color, title, text }: { color: "emerald" | "rose" | "amber"; title: string; text: string }) {
  const cls = {
    emerald: "border-emerald-900/60 bg-emerald-950/30 text-emerald-300",
    rose: "border-rose-900/60 bg-rose-950/30 text-rose-300",
    amber: "border-amber-900/60 bg-amber-950/30 text-amber-300",
  }[color];
  return (
    <div className={`p-2.5 rounded-md border ${cls}`}>
      <div className="text-[10px] uppercase tracking-wider font-bold mb-1">{title}</div>
      <div className="text-[11px] leading-relaxed text-zinc-300">{text}</div>
    </div>
  );
}
