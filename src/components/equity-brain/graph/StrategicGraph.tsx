/**
 * Strategic Graph — render principal force-directed (estilo cérebro/knowledge graph).
 *
 * Substitui o ReactFlow + Dagre hierárquico por uma simulação física orgânica
 * com clusters emergentes, glow pulsante em hotspots, linhas curvas tipadas
 * e painel lateral de detalhes.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D, { type ForceGraphMethods } from "react-force-graph-2d";
import { forceCollide, forceManyBody } from "d3-force";
import { useQueries } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  buildStrategicGraph,
  type GraphNode,
  type GraphEdge,
  type EdgeType,
} from "@/lib/equityGraphBuilder";
import { detectClusters } from "@/lib/equityGraphClusters";
import {
  EDGE_COLORS,
  NODE_COLORS,
  EDGE_LAYERS,
  type LayerKey,
} from "@/lib/equityGraphScoring";
import { GraphFilterSidebar } from "./GraphFilterSidebar";
import { NodeDetailPanel } from "./NodeDetailPanel";
import { GraphLegend } from "./GraphLegend";

// ---------- Default state ----------
const DEFAULT_NODE_TYPES = new Set([
  "seller",
  "buyer_strategic",
  "buyer_financial",
  "thesis",
  "platform",
  "asset",
  "strategy",
]);
const DEFAULT_LAYERS = new Set<LayerKey>([
  "ma_direct",
  "rollup",
  "operational",
  "commercial",
  "arbitrage",
  "capital",
  "thesis",
]);

export function StrategicGraph() {
  const fgRef = useRef<ForceGraphMethods | undefined>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [isMobile, setIsMobile] = useState(false);

  // ---------- Filters state ----------
  const [filterCollapsed, setFilterCollapsed] = useState(false);
  const [selectedVerticals, setSelectedVerticals] = useState<Set<string>>(new Set());
  const [selectedUfs, setSelectedUfs] = useState<Set<string>>(new Set());
  const [selectedNodeTypes, setSelectedNodeTypes] = useState<Set<string>>(DEFAULT_NODE_TYPES);
  const [enabledLayers, setEnabledLayers] = useState<Set<LayerKey>>(DEFAULT_LAYERS);
  const [minWeight, setMinWeight] = useState(0.15);
  const [minConfidence, setMinConfidence] = useState(0.0);
  const [thesisFilter, setThesisFilter] = useState<string | null>(null);
  const [buyerFilter, setBuyerFilter] = useState<string | null>(null);

  // ---------- Selection / hover ----------
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [pulse, setPulse] = useState(0);

  // ---------- Container size ----------
  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        const r = containerRef.current.getBoundingClientRect();
        setSize({ w: r.width, h: r.height });
      }
      setIsMobile(window.innerWidth < 768);
    };
    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  // ---------- Pulse animation tick ----------
  useEffect(() => {
    if (isMobile) return;
    let raf: number;
    const tick = () => {
      setPulse((p) => (p + 0.03) % (Math.PI * 2));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isMobile]);

  // Helper: raio base do node (precisa estar antes dos useEffects que usam ele)
  const getBaseRadius = (n: GraphNode) => {
    const score = Number.isFinite(n.strategic_score) ? n.strategic_score : 0;
    return Math.max(2, 4 + (score / 100) * 12);
  };

  // ---------- Data ----------
  const queries = useQueries({
    queries: [
      {
        queryKey: ["sg", "companies"],
        queryFn: async () => {
          const { data } = await supabase
            .from("eb_companies" as any)
            .select("cnpj,razao_social,nome_fantasia,setor_ma,uf,municipio,faturamento_estimado,ebitda_estimado,funcionarios_estimado,cnae_descricao,has_listing,listing_id")
            .limit(150);
          return (data ?? []) as any[];
        },
      },
      {
        queryKey: ["sg", "scored"],
        queryFn: async () => {
          const { data } = await supabase
            .from("eb_companies_scored" as any)
            .select("cnpj,ma_score")
            .limit(150);
          return (data ?? []) as any[];
        },
      },
      {
        queryKey: ["sg", "buyers"],
        queryFn: async () => {
          const { data } = await supabase
            .from("eb_buyers" as any)
            .select("id,nome,tipo,ticket_min,ticket_max,setores_interesse,ufs_interesse,sinergias_chave,deals_realizados,prioridade_global,vertical_principal");
          return (data ?? []) as any[];
        },
      },
      {
        queryKey: ["sg", "theses"],
        queryFn: async () => {
          const { data } = await supabase
            .from("eb_investment_theses" as any)
            .select("thesis_key,display_name,category,description,required_signals,active")
            .eq("active", true);
          return (data ?? []) as any[];
        },
      },
      {
        queryKey: ["sg", "buyer-theses"],
        queryFn: async () => {
          const { data } = await supabase
            .from("eb_buyer_theses" as any)
            .select("buyer_id,thesis_key,prioridade,active")
            .eq("active", true);
          return (data ?? []) as any[];
        },
      },
      {
        queryKey: ["sg", "matches"],
        queryFn: async () => {
          const { data } = await supabase
            .from("eb_matches" as any)
            .select("cnpj,buyer_id,thesis_key,match_score,setor_fit,geografia_fit,porte_fit,tese_fit,is_current")
            .eq("is_current", true)
            .limit(300);
          return (data ?? []) as any[];
        },
      },
    ],
  });

  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);

  const [companiesQ, scoredQ, buyersQ, thesesQ, btQ, matchesQ] = queries;

  // ---------- Build graph ----------
  const enabledEdgeTypes = useMemo<Set<EdgeType>>(() => {
    const set = new Set<EdgeType>();
    enabledLayers.forEach((k) => EDGE_LAYERS[k].types.forEach((t) => set.add(t as EdgeType)));
    return set;
  }, [enabledLayers]);

  const { nodes, edges, clusters } = useMemo(() => {
    if (!companiesQ.data || !buyersQ.data || !thesesQ.data || !btQ.data) {
      return { nodes: [] as GraphNode[], edges: [] as GraphEdge[], clusters: [] as any[] };
    }

    // Merge ma_score em companies
    const scoreMap = new Map<string, number>(
      (scoredQ.data ?? []).map((s: any) => [s.cnpj, Number(s.ma_score ?? 0)]),
    );
    const enrichedCompanies = (companiesQ.data ?? []).map((c: any) => ({
      ...c,
      ma_score: scoreMap.get(c.cnpj) ?? 0,
    }));

    const built = buildStrategicGraph(
      {
        companies: enrichedCompanies,
        buyers: buyersQ.data ?? [],
        theses: thesesQ.data ?? [],
        buyerTheses: btQ.data ?? [],
        matches: matchesQ.data ?? [],
      },
      {
        maxNodes: 350,
        minWeight,
        minConfidence,
        enabledEdgeTypes,
        ufFilter: selectedUfs.size ? selectedUfs : undefined,
        verticalFilter: selectedVerticals.size ? selectedVerticals : undefined,
        thesisFilter,
        buyerFilter,
      },
    );

    // Filter by node type
    const filteredNodes = built.nodes.filter((n) => selectedNodeTypes.has(n.type));
    const allowedIds = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges = built.edges.filter(
      (e) => allowedIds.has(e.source as any) && allowedIds.has(e.target as any),
    );
    // Drop nodes with no edges (cleaner view)
    const connected = new Set<string>();
    filteredEdges.forEach((e) => {
      connected.add(e.source as any);
      connected.add(e.target as any);
    });
    const finalNodes = filteredNodes.filter((n) => connected.has(n.id) || n.type === "thesis" || n.type === "strategy");

    const cl = detectClusters(finalNodes, filteredEdges);
    return { nodes: finalNodes, edges: filteredEdges, clusters: cl };
  }, [
    companiesQ.data, scoredQ.data, buyersQ.data, thesesQ.data, btQ.data, matchesQ.data,
    minWeight, minConfidence, enabledEdgeTypes,
    selectedNodeTypes, selectedUfs, selectedVerticals, thesisFilter, buyerFilter,
  ]);

  // ---------- Filter options derivados ----------
  const verticalsList = useMemo(() => {
    const set = new Set<string>();
    (companiesQ.data ?? []).forEach((c: any) => c.setor_ma && set.add(c.setor_ma));
    return Array.from(set).sort();
  }, [companiesQ.data]);

  const ufsList = useMemo(() => {
    const set = new Set<string>();
    (companiesQ.data ?? []).forEach((c: any) => c.uf && set.add(c.uf));
    return Array.from(set).sort();
  }, [companiesQ.data]);

  // ---------- Hover neighbors (highlight) ----------
  const neighborIds = useMemo(() => {
    if (!hoveredNodeId) return new Set<string>();
    const set = new Set<string>([hoveredNodeId]);
    edges.forEach((e) => {
      const s = e.source as any as string;
      const t = e.target as any as string;
      if (s === hoveredNodeId) set.add(t);
      else if (t === hoveredNodeId) set.add(s);
    });
    return set;
  }, [hoveredNodeId, edges]);

  // ---------- Top-N hot nodes (glow pulse) ----------
  const hotNodeIds = useMemo(() => {
    const counts = new Map<string, number>();
    edges.forEach((e) => {
      if (e.weight < 0.6) return;
      const s = e.source as any as string;
      const t = e.target as any as string;
      counts.set(s, (counts.get(s) ?? 0) + 1);
      counts.set(t, (counts.get(t) ?? 0) + 1);
    });
    return new Set(
      Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([id]) => id),
    );
  }, [edges]);

  const handleReset = () => {
    setSelectedVerticals(new Set());
    setSelectedUfs(new Set());
    setSelectedNodeTypes(DEFAULT_NODE_TYPES);
    setEnabledLayers(DEFAULT_LAYERS);
    setMinWeight(0.15);
    setMinConfidence(0);
    setThesisFilter(null);
    setBuyerFilter(null);
  };

  // ---------- Configurar forças d3 (espaçar nodes) e liberar fixação ao mudar dataset ----------
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg || !nodes.length) return;

    // Repulsão forte para espaçar
    fg.d3Force("charge", forceManyBody().strength(-450).distanceMax(700));
    // Anti-overlap baseado em raio + folga
    fg.d3Force(
      "collide",
      forceCollide<GraphNode>().radius((n) => getBaseRadius(n) + 14).strength(0.9),
    );
    // Distância dos links: links fracos = nodes mais distantes
    const linkForce: any = fg.d3Force("link");
    if (linkForce) {
      linkForce.distance((l: any) => 80 + (1 - (l.weight ?? 0.3)) * 120).strength(0.5);
    }

    // Liberar fixações antigas (caso filtros tenham mudado o dataset)
    nodes.forEach((n: any) => {
      n.fx = undefined;
      n.fy = undefined;
    });
    fg.d3ReheatSimulation();
  }, [nodes, edges]);

  // ---------- Mobile fallback ----------
  if (isMobile) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-zinc-950 p-8">
        <div className="text-center max-w-sm">
          <div className="text-emerald-400 text-4xl mb-3">🧠</div>
          <h2 className="text-zinc-100 font-bold text-lg mb-2">Cérebro estratégico — apenas desktop</h2>
          <p className="text-zinc-500 text-sm">
            A rede de oportunidades exige uma tela maior. Acesse de um computador.
          </p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-zinc-950">
        <div className="text-rose-400 text-sm">Erro ao carregar dados do grafo.</div>
      </div>
    );
  }

  // ---------- Render ----------
  return (
    <div ref={containerRef} className="w-full h-full bg-zinc-950 relative overflow-hidden">
      {/* Background sutil radial */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(16,185,129,0.05) 0%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(56,189,248,0.04) 0%, transparent 50%)",
        }}
      />

      {isLoading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-zinc-950/80">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Tecendo a rede…</div>
          </div>
        </div>
      )}

      {/* Filter sidebar */}
      <GraphFilterSidebar
        collapsed={filterCollapsed}
        onToggleCollapse={() => setFilterCollapsed((c) => !c)}
        verticals={verticalsList}
        ufs={ufsList}
        thesesList={(thesesQ.data ?? []) as any[]}
        buyersList={(buyersQ.data ?? []) as any[]}
        selectedVerticals={selectedVerticals}
        selectedUfs={selectedUfs}
        selectedNodeTypes={selectedNodeTypes}
        enabledLayers={enabledLayers}
        minWeight={minWeight}
        minConfidence={minConfidence}
        thesisFilter={thesisFilter}
        buyerFilter={buyerFilter}
        onChange={(p) => {
          if (p.selectedVerticals) setSelectedVerticals(p.selectedVerticals);
          if (p.selectedUfs) setSelectedUfs(p.selectedUfs);
          if (p.selectedNodeTypes) setSelectedNodeTypes(p.selectedNodeTypes);
          if (p.enabledLayers) setEnabledLayers(p.enabledLayers);
          if (p.minWeight !== undefined) setMinWeight(p.minWeight);
          if (p.minConfidence !== undefined) setMinConfidence(p.minConfidence);
          if (p.thesisFilter !== undefined) setThesisFilter(p.thesisFilter);
          if (p.buyerFilter !== undefined) setBuyerFilter(p.buyerFilter);
        }}
        onReset={handleReset}
      />

      {/* Stats badge */}
      <div className="absolute top-3 right-3 z-10 bg-zinc-950/90 border border-zinc-800 rounded-md px-3 py-1.5 backdrop-blur">
        <div className="text-[10px] text-zinc-400 font-mono">
          <span className="text-emerald-400 font-bold">{nodes.length}</span> nodes ·{" "}
          <span className="text-cyan-400 font-bold">{edges.length}</span> edges ·{" "}
          <span className="text-rose-400 font-bold">{clusters.length}</span> clusters
        </div>
      </div>

      <ForceGraph2D
        ref={fgRef as any}
        graphData={{ nodes: nodes as any, links: edges as any }}
        width={size.w}
        height={size.h}
        backgroundColor="rgba(0,0,0,0)"
        cooldownTicks={120}
        d3AlphaDecay={0.025}
        d3VelocityDecay={0.32}
        warmupTicks={30}
        linkCurvature={(l: any) => 0.12 + (l.weight ?? 0) * 0.08}
        linkDirectionalParticles={(l: any) => (l.weight >= 0.7 ? 2 : 0)}
        linkDirectionalParticleWidth={(l: any) => 1.5 + l.weight * 1.5}
        linkDirectionalParticleColor={(l: any) => EDGE_COLORS[l.edge_type] ?? "#52525b"}
        linkWidth={(l: any) => {
          const isHl = hoveredNodeId
            ? (l.source.id ?? l.source) === hoveredNodeId || (l.target.id ?? l.target) === hoveredNodeId
            : true;
          return (l.weight * 3.5 + 0.3) * (isHl ? 1.5 : 1);
        }}
        linkColor={(l: any) => {
          const base = EDGE_COLORS[l.edge_type] ?? "#52525b";
          const conf = l.confidence ?? 0.6;
          if (!hoveredNodeId) {
            return base.replace("hsl(", "hsla(").replace(")", `, ${conf * 0.55 + 0.15})`);
          }
          const sId = l.source.id ?? l.source;
          const tId = l.target.id ?? l.target;
          const isHl = sId === hoveredNodeId || tId === hoveredNodeId;
          return base
            .replace("hsl(", "hsla(")
            .replace(")", `, ${isHl ? 0.95 : 0.05})`);
        }}
        onNodeClick={(n: any) => {
          setSelectedNode(n as GraphNode);
          // Center on node
          if (fgRef.current) {
            fgRef.current.centerAt((n as any).x, (n as any).y, 600);
            fgRef.current.zoom(2.2, 600);
          }
        }}
        onNodeHover={(n: any) => setHoveredNodeId((n as any)?.id ?? null)}
        onBackgroundClick={() => {
          setHoveredNodeId(null);
        }}
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          const n = node as GraphNode;
          // Skip if simulation hasn't positioned this node yet
          if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;
          const score = Number.isFinite(n.strategic_score) ? n.strategic_score : 0;
          const baseR = Math.max(2, 4 + (score / 100) * 12);
          const color = NODE_COLORS[n.type] ?? "#71717a";
          const isHot = hotNodeIds.has(n.id);
          const isHovered = n.id === hoveredNodeId;
          const isSelected = selectedNode?.id === n.id;
          const isDimmed = hoveredNodeId && !neighborIds.has(n.id);

          const alpha = isDimmed ? 0.15 : 1;

          // Glow pulse para hotspots
          if (isHot && !isDimmed) {
            const pulseR = Math.max(baseR + 0.5, baseR + Math.sin(pulse) * 4 + 6);
            const grad = ctx.createRadialGradient(node.x, node.y, baseR, node.x, node.y, pulseR);
            grad.addColorStop(0, color.replace("hsl(", "hsla(").replace(")", ", 0.45)"));
            grad.addColorStop(1, color.replace("hsl(", "hsla(").replace(")", ", 0)"));
            ctx.beginPath();
            ctx.fillStyle = grad;
            ctx.arc(node.x, node.y, pulseR, 0, 2 * Math.PI);
            ctx.fill();
          }

          // Halo no hover/selected
          if (isHovered || isSelected) {
            ctx.beginPath();
            ctx.strokeStyle = "rgba(255,255,255,0.85)";
            ctx.lineWidth = 2 / globalScale;
            ctx.arc(node.x, node.y, baseR + 3, 0, 2 * Math.PI);
            ctx.stroke();
          }

          // Node core
          ctx.beginPath();
          ctx.fillStyle = color.replace("hsl(", "hsla(").replace(")", `, ${alpha})`);
          ctx.arc(node.x, node.y, baseR, 0, 2 * Math.PI);
          ctx.fill();

          // Borda fina
          ctx.beginPath();
          ctx.strokeStyle = `rgba(0,0,0,${alpha * 0.6})`;
          ctx.lineWidth = 1 / globalScale;
          ctx.arc(node.x, node.y, baseR, 0, 2 * Math.PI);
          ctx.stroke();

          // Label só em zoom maior ou em hover
          if (globalScale > 1.4 || isHovered || isSelected) {
            const fontSize = Math.min(11, 9 / globalScale + 4);
            ctx.font = `${isHovered || isSelected ? "bold " : ""}${fontSize}px Inter, system-ui`;
            ctx.fillStyle = isDimmed ? "rgba(161,161,170,0.3)" : "rgba(244,244,245,0.95)";
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            const label = n.label.length > 28 ? n.label.slice(0, 26) + "…" : n.label;
            ctx.fillText(label, node.x, node.y + baseR + 3);
          }
        }}
        nodePointerAreaPaint={(node: any, color, ctx) => {
          const n = node as GraphNode;
          if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;
          const score = Number.isFinite(n.strategic_score) ? n.strategic_score : 0;
          const baseR = Math.max(2, 4 + (score / 100) * 12 + 4);
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(node.x, node.y, baseR, 0, 2 * Math.PI);
          ctx.fill();
        }}
      />

      {/* Empty state */}
      {!isLoading && nodes.length === 0 && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className="text-center bg-zinc-950/80 border border-zinc-800 rounded-md p-6 backdrop-blur pointer-events-auto max-w-md">
            <div className="text-emerald-400 text-3xl mb-2">🧠</div>
            <div className="text-zinc-200 font-bold mb-1">Nenhuma conexão visível</div>
            <div className="text-zinc-500 text-xs">
              Reduza o peso mínimo, ative mais layers ou limpe filtros para ver a rede emergir.
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <GraphLegend />

      {/* Detail panel */}
      <NodeDetailPanel
        node={selectedNode}
        allNodes={nodes}
        allEdges={edges}
        onClose={() => setSelectedNode(null)}
        onFocus={(id) => {
          const target = nodes.find((n) => n.id === id) as any;
          if (target && fgRef.current) {
            fgRef.current.centerAt(target.x, target.y, 800);
            fgRef.current.zoom(2.5, 800);
          }
        }}
        onSelectNode={(id) => {
          const target = nodes.find((n) => n.id === id);
          if (target) {
            setSelectedNode(target);
            const t = target as any;
            if (fgRef.current) fgRef.current.centerAt(t.x, t.y, 600);
          }
        }}
      />
    </div>
  );
}
