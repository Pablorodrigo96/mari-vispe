/**
 * Strategic Graph — render principal force-directed (estilo cérebro/knowledge graph).
 *
 * Substitui o ReactFlow + Dagre hierárquico por uma simulação física orgânica
 * com clusters emergentes, glow pulsante em hotspots, linhas curvas tipadas
 * e painel lateral de detalhes.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D, { type ForceGraphMethods } from "react-force-graph-2d";
import { forceCollide, forceManyBody, forceRadial } from "d3-force";
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
  const [stabilized, setStabilized] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  // Refs estáveis (sem causar re-render dos handlers)
  const hoveredRef = useRef<string | null>(null);
  const selectedRef = useRef<string | null>(null);
  useEffect(() => { hoveredRef.current = hoveredNodeId; }, [hoveredNodeId]);
  useEffect(() => { selectedRef.current = selectedNode?.id ?? null; }, [selectedNode]);

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

  // ---------- Pulse animation tick (30fps p/ economizar) ----------
  useEffect(() => {
    if (isMobile) return;
    let raf: number;
    let last = 0;
    const tick = (t: number) => {
      if (t - last > 33) {
        setPulse((p) => (p + 0.06) % (Math.PI * 2));
        last = t;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isMobile]);

  // Degree map (preenchido após edges existirem) — ref mutável p/ getBaseRadius
  const degreeMapRef = useRef<Map<string, number>>(new Map());

  // Helper: raio composto — score + log(grau) + bônus hot
  const getBaseRadius = (n: GraphNode) => {
    const score = Number.isFinite(n.strategic_score) ? n.strategic_score : 0;
    const deg = degreeMapRef.current.get(n.id) ?? 0;
    const scorePart = (score / 100) * 8;
    const degPart = Math.log(1 + deg) * 4;
    return Math.max(4, 3 + scorePart + degPart);
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

  // ---------- Degree map (todas as conexões, peso ≥ 0.4) ----------
  const degreeMap = useMemo(() => {
    const m = new Map<string, number>();
    edges.forEach((e) => {
      if ((e.weight ?? 0) < 0.4) return;
      const s = (e.source as any).id ?? e.source;
      const t = (e.target as any).id ?? e.target;
      m.set(s, (m.get(s) ?? 0) + 1);
      m.set(t, (m.get(t) ?? 0) + 1);
    });
    return m;
  }, [edges]);

  // Sincroniza ref p/ getBaseRadius (usado por d3 forces e canvas)
  useEffect(() => {
    degreeMapRef.current = degreeMap;
  }, [degreeMap]);

  // ---------- Idle edges: só top-80 mais fortes renderizam sem hover ----------
  const idleEdgeIds = useMemo(() => {
    const sorted = [...edges]
      .filter((e) => (e.weight ?? 0) >= 0.55)
      .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))
      .slice(0, 80);
    return new Set(sorted.map((e) => `${(e.source as any).id ?? e.source}__${(e.target as any).id ?? e.target}__${e.edge_type}`));
  }, [edges]);

  const edgeKey = (l: any) => {
    const sId = l.source.id ?? l.source;
    const tId = l.target.id ?? l.target;
    return `${sId}__${tId}__${l.edge_type}`;
  };

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

    // Repulsão muito forte — explode o aglomerado
    const chargeStrength = -700 - Math.min(400, nodes.length * 2);
    fg.d3Force("charge", forceManyBody().strength(chargeStrength).distanceMax(1400));

    // Anti-overlap escala com o raio (hubs grandes empurram mais)
    fg.d3Force(
      "collide",
      forceCollide<GraphNode>().radius((n) => getBaseRadius(n) * 2.2 + 18).strength(0.95),
    );

    // Links: fracos = longe e quase sem puxar; fortes = perto e ancoram clusters
    const linkForce: any = fg.d3Force("link");
    if (linkForce) {
      linkForce
        .distance((l: any) => 140 + (1 - (l.weight ?? 0.3)) * 240)
        .strength((l: any) => Math.max(0.05, (l.weight ?? 0.3) * 0.8));
    }

    // Força radial leve mantém o grafo enquadrado no viewport
    fg.d3Force("radial", forceRadial(0, 0, 0).strength(0.02));

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
    <div ref={containerRef} className="w-full h-full relative overflow-hidden" style={{ background: "#08090b" }}>
      {/* Background neural — múltiplos gradientes radiais sutis */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 20% 30%, rgba(16,185,129,0.07) 0%, transparent 45%), radial-gradient(circle at 80% 20%, rgba(56,189,248,0.06) 0%, transparent 50%), radial-gradient(circle at 65% 80%, rgba(244,63,94,0.05) 0%, transparent 45%), radial-gradient(circle at 30% 75%, rgba(168,85,247,0.04) 0%, transparent 50%)",
        }}
      />
      {/* Grid sutil estilo HUD */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
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
        cooldownTicks={150}
        cooldownTime={5000}
        d3AlphaDecay={0.04}
        d3VelocityDecay={0.55}
        warmupTicks={80}
        onEngineStop={() => {
          // Fixar nodes na posição final (sem mais drift)
          nodes.forEach((n: any) => {
            if (Number.isFinite(n.x) && Number.isFinite(n.y)) {
              n.fx = n.x;
              n.fy = n.y;
            }
          });
          // Enquadrar todo o grafo já parado
          fgRef.current?.zoomToFit(500, 80);
        }}
        enableNodeDrag={false}
        linkCurvature={(l: any) => 0.18 + (l.weight ?? 0) * 0.1}
        linkDirectionalParticles={(l: any) => {
          // Particles só quando há foco (hover/selected) e link toca o foco
          const focusId = hoveredNodeId ?? selectedNode?.id ?? null;
          if (!focusId) return 0;
          const sId = l.source.id ?? l.source;
          const tId = l.target.id ?? l.target;
          const touches = sId === focusId || tId === focusId;
          if (!touches) return 0;
          return l.weight >= 0.7 ? 3 : l.weight >= 0.5 ? 2 : 0;
        }}
        linkDirectionalParticleWidth={(l: any) => 1.5 + (l.weight ?? 0) * 1.8}
        linkDirectionalParticleSpeed={() => 0.006}
        linkDirectionalParticleColor={(l: any) => EDGE_COLORS[l.edge_type] ?? "#52525b"}
        linkWidth={(l: any) => {
          const focusId = hoveredNodeId ?? selectedNode?.id ?? null;
          const sId = l.source.id ?? l.source;
          const tId = l.target.id ?? l.target;
          const touches = focusId ? (sId === focusId || tId === focusId) : false;
          if (touches) return (l.weight ?? 0.3) * 2.6 + 0.8; // aceso
          if (focusId) return 0.0001; // outras somem
          // Idle: só top-N renderiza, e bem fininho
          return idleEdgeIds.has(edgeKey(l)) ? 0.5 : 0.0001;
        }}
        linkColor={(l: any) => {
          const base = EDGE_COLORS[l.edge_type] ?? "#52525b";
          const focusId = hoveredNodeId ?? selectedNode?.id ?? null;
          const sId = l.source.id ?? l.source;
          const tId = l.target.id ?? l.target;
          const touches = focusId ? (sId === focusId || tId === focusId) : false;
          const toAlpha = (a: number) =>
            base.startsWith("hsl(")
              ? base.replace("hsl(", "hsla(").replace(")", `, ${a})`)
              : base;
          if (touches) return toAlpha(0.95);
          if (focusId) return toAlpha(0.02);
          return idleEdgeIds.has(edgeKey(l)) ? toAlpha(0.13) : toAlpha(0);
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
          if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;
          const baseR = getBaseRadius(n);
          const color = NODE_COLORS[n.type] ?? "#71717a";
          const isHot = hotNodeIds.has(n.id);
          const isHovered = n.id === hoveredNodeId;
          const isSelected = selectedNode?.id === n.id;
          const focusActive = !!(hoveredNodeId || selectedNode);
          const isNeighbor = focusActive && neighborIds.has(n.id) && !isHovered && !isSelected;
          const isDimmed = focusActive && !neighborIds.has(n.id) && !isSelected;

          // Raio efetivo
          const r = isHovered || isSelected ? baseR * 1.7 : isNeighbor ? baseR * 1.25 : baseR;
          const alpha = isDimmed ? 0.18 : 1;

          const toHsla = (a: number) =>
            color.startsWith("hsl(")
              ? color.replace("hsl(", "hsla(").replace(")", `, ${a})`)
              : color;

          // ---- Glow externo difuso (neurônio respirando) ----
          if (isHot && !isDimmed) {
            const breath = Math.sin(pulse) * 0.5 + 0.5; // 0..1
            const outerR = r + 10 + breath * 8;
            try {
              const g2 = ctx.createRadialGradient(node.x, node.y, r, node.x, node.y, outerR);
              g2.addColorStop(0, toHsla(0.18 + breath * 0.15));
              g2.addColorStop(1, toHsla(0));
              ctx.beginPath();
              ctx.fillStyle = g2;
              ctx.arc(node.x, node.y, outerR, 0, 2 * Math.PI);
              ctx.fill();
            } catch {}
          }

          // ---- Glow do hover/selected (radial, cor do node) ----
          if ((isHovered || isSelected) && !isDimmed) {
            const haloR = r + 14;
            try {
              const g3 = ctx.createRadialGradient(node.x, node.y, r, node.x, node.y, haloR);
              g3.addColorStop(0, toHsla(0.55));
              g3.addColorStop(1, toHsla(0));
              ctx.beginPath();
              ctx.fillStyle = g3;
              ctx.arc(node.x, node.y, haloR, 0, 2 * Math.PI);
              ctx.fill();
            } catch {}
          }

          // ---- Glow interno sutil pra dar luminosidade ----
          if (!isDimmed) {
            try {
              const gi = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, r * 1.4);
              gi.addColorStop(0, toHsla(0.95));
              gi.addColorStop(0.7, toHsla(0.7));
              gi.addColorStop(1, toHsla(0));
              ctx.beginPath();
              ctx.fillStyle = gi;
              ctx.arc(node.x, node.y, r * 1.4, 0, 2 * Math.PI);
              ctx.fill();
            } catch {}
          } else {
            // Dimmed: só círculo plano (perf)
            ctx.beginPath();
            ctx.fillStyle = toHsla(alpha);
            ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
            ctx.fill();
          }

          // ---- Núcleo sólido ----
          ctx.beginPath();
          ctx.fillStyle = toHsla(alpha);
          ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
          ctx.fill();

          // Anel branco fino quando hover/selected
          if (isHovered || isSelected) {
            ctx.beginPath();
            ctx.strokeStyle = "rgba(255,255,255,0.9)";
            ctx.lineWidth = 1.8 / globalScale;
            ctx.arc(node.x, node.y, r + 2, 0, 2 * Math.PI);
            ctx.stroke();
          }

          // Label só em zoom maior, hover ou selected
          if (globalScale > 1.4 || isHovered || isSelected) {
            const fontSize = Math.min(11, 9 / globalScale + 4);
            ctx.font = `${isHovered || isSelected ? "bold " : ""}${fontSize}px Inter, system-ui`;
            ctx.fillStyle = isDimmed ? "rgba(161,161,170,0.3)" : "rgba(244,244,245,0.95)";
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            const label = n.label.length > 28 ? n.label.slice(0, 26) + "…" : n.label;
            ctx.fillText(label, node.x, node.y + r + 4);
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
