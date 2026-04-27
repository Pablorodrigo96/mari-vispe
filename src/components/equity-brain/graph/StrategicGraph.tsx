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

  // ---------- Pulso visual ESTÁTICO ----------
  // Removido o requestAnimationFrame contínuo que causava vibração visual.
  // pulse fica em valor fixo; halos/glow agora são estáticos.
  // (mantido para compatibilidade com o canvas painter)

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

  const edgeKey = (l: any) => {
    const sId = l.source.id ?? l.source;
    const tId = l.target.id ?? l.target;
    return `${sId}__${tId}__${l.edge_type}`;
  };

  // ---------- Idle edges: só top-60 mais fortes renderizam sem foco ----------
  const idleEdgeIds = useMemo(() => {
    const sorted = [...edges]
      .filter((e) => (e.weight ?? 0) >= 0.55)
      .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))
      .slice(0, 60);
    return new Set(sorted.map((e) => `${(e.source as any).id ?? e.source}__${(e.target as any).id ?? e.target}__${e.edge_type}`));
  }, [edges]);

  // ---------- FOCUS MODE: top-12 conexões mais fortes do nó selecionado ----------
  const TOP_FOCUS_EDGES = 12;
  const focusedEdgeIds = useMemo(() => {
    if (!selectedNode) return null;
    const focusId = selectedNode.id;
    const incident = edges.filter((e) => {
      const sId = (e.source as any).id ?? e.source;
      const tId = (e.target as any).id ?? e.target;
      return sId === focusId || tId === focusId;
    });
    const sorted = [...incident].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));
    const top = sorted.slice(0, TOP_FOCUS_EDGES);
    return new Set(top.map(edgeKey));
  }, [selectedNode, edges]);

  // Vizinhos visíveis no modo foco (apenas os que ainda têm aresta visível)
  const focusedNeighborIds = useMemo(() => {
    if (!focusedEdgeIds || !selectedNode) return null;
    const set = new Set<string>([selectedNode.id]);
    edges.forEach((e) => {
      if (!focusedEdgeIds.has(edgeKey(e))) return;
      const sId = (e.source as any).id ?? e.source;
      const tId = (e.target as any).id ?? e.target;
      set.add(sId);
      set.add(tId);
    });
    return set;
  }, [focusedEdgeIds, selectedNode, edges]);

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

  // ---------- Configurar forças d3 (espaçar nodes) ----------
  // Só roda 1x quando o dataset muda. Logo após o engine parar, congelamos os nós.
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg || !nodes.length) return;

    setStabilized(false);

    // Repulsão muito forte — explode o aglomerado inicial
    const chargeStrength = -900 - Math.min(600, nodes.length * 3);
    fg.d3Force("charge", forceManyBody().strength(chargeStrength).distanceMax(1800));

    // Anti-overlap escala com o raio (hubs grandes empurram mais)
    fg.d3Force(
      "collide",
      forceCollide<GraphNode>().radius((n) => getBaseRadius(n) * 2.6 + 24).strength(1),
    );

    // Links: fracos = longe; fortes = perto e ancoram clusters
    const linkForce: any = fg.d3Force("link");
    if (linkForce) {
      linkForce
        .distance((l: any) => 180 + (1 - (l.weight ?? 0.3)) * 320)
        .strength((l: any) => Math.max(0.05, (l.weight ?? 0.3) * 0.7));
    }

    // Força radial leve mantém o grafo enquadrado no viewport
    fg.d3Force("radial", forceRadial(0, 0, 0).strength(0.025));

    // Liberar fixações antigas (caso filtros tenham mudado o dataset)
    nodes.forEach((n: any) => {
      n.fx = undefined;
      n.fy = undefined;
    });
    fg.d3ReheatSimulation();

    // Hard freeze de segurança após 4s — caso o engine não pare sozinho
    const safety = window.setTimeout(() => {
      try {
        nodes.forEach((n: any) => {
          if (Number.isFinite(n.x) && Number.isFinite(n.y)) {
            n.fx = n.x;
            n.fy = n.y;
          }
        });
        (fgRef.current as any)?.pauseAnimation?.();
        setStabilized(true);
      } catch {}
    }, 4000);
    return () => window.clearTimeout(safety);
  }, [nodes, edges]);

  // ---------- Pulso de movimento removido: o grafo permanece congelado após estabilizar.
  // Toda sensação de "vida" é puramente visual (glow, partículas, anéis HUD). ----------

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
        className="absolute inset-0 pointer-events-none opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(56,189,248,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.5) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      {/* HUD: anéis concêntricos centrais estilo Jarvis */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.10]">
        <defs>
          <radialGradient id="hud-ring" cx="50%" cy="50%" r="50%">
            <stop offset="60%" stopColor="rgba(56,189,248,0)" />
            <stop offset="100%" stopColor="rgba(56,189,248,0.6)" />
          </radialGradient>
        </defs>
        <g style={{ transform: "translate(50%, 50%)" }}>
          <circle r="120" fill="none" stroke="rgba(56,189,248,0.5)" strokeDasharray="2 6" strokeWidth="0.6" />
          <circle r="240" fill="none" stroke="rgba(16,185,129,0.4)" strokeDasharray="3 10" strokeWidth="0.6" />
          <circle r="380" fill="none" stroke="rgba(56,189,248,0.3)" strokeDasharray="1 4" strokeWidth="0.5" />
          <circle r="540" fill="none" stroke="rgba(168,85,247,0.25)" strokeDasharray="4 14" strokeWidth="0.5" />
          <line x1="-700" y1="0" x2="700" y2="0" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
          <line x1="0" y1="-700" x2="0" y2="700" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
        </g>
      </svg>
      {/* Cantos HUD */}
      <div className="absolute top-2 left-2 w-6 h-6 border-l border-t border-cyan-500/30 pointer-events-none" />
      <div className="absolute top-2 right-2 w-6 h-6 border-r border-t border-cyan-500/30 pointer-events-none" />
      <div className="absolute bottom-2 left-2 w-6 h-6 border-l border-b border-cyan-500/30 pointer-events-none" />
      <div className="absolute bottom-2 right-2 w-6 h-6 border-r border-b border-cyan-500/30 pointer-events-none" />

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

      {/* Stats badge + status */}
      <div className="absolute top-3 right-3 z-10 bg-zinc-950/90 border border-cyan-900/40 rounded-md px-3 py-1.5 backdrop-blur shadow-[0_0_20px_rgba(56,189,248,0.08)]">
        <div className="text-[10px] text-zinc-400 font-mono flex items-center gap-2">
          <span className="text-emerald-400 font-bold">{nodes.length}</span> nodes ·{" "}
          <span className="text-cyan-400 font-bold">{edges.length}</span> edges ·{" "}
          <span className="text-rose-400 font-bold">{clusters.length}</span> clusters
          <span className="ml-2 flex items-center gap-1">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                stabilized ? "bg-emerald-400" : "bg-cyan-400 animate-pulse"
              }`}
            />
            <span className="text-[9px] uppercase tracking-wider text-zinc-500">
              {stabilized ? "Rede congelada" : "Tecendo rede…"}
            </span>
          </span>
        </div>
      </div>

      {/* Badge de modo foco — só quando há nó selecionado */}
      {selectedNode && focusedEdgeIds && (
        <div className="absolute top-14 right-3 z-10 bg-emerald-950/80 border border-emerald-700/60 rounded-md px-3 py-1.5 backdrop-blur shadow-[0_0_18px_rgba(16,185,129,0.18)] flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] uppercase tracking-wider text-emerald-300 font-bold">
            Modo foco
          </span>
          <span className="text-[10px] text-zinc-300 font-mono">
            {focusedEdgeIds.size} conexões fortes
          </span>
          <button
            onClick={() => setSelectedNode(null)}
            className="ml-1 text-[10px] text-zinc-400 hover:text-emerald-300 underline-offset-2 hover:underline"
          >
            limpar
          </button>
        </div>
      )}

      <ForceGraph2D
        ref={fgRef as any}
        graphData={{ nodes: nodes as any, links: edges as any }}
        width={size.w}
        height={size.h}
        backgroundColor="rgba(0,0,0,0)"
        cooldownTicks={120}
        cooldownTime={3500}
        d3AlphaDecay={0.06}
        d3VelocityDecay={0.7}
        warmupTicks={60}
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
          setStabilized(true);
          setRecalculating(false);
        }}
        enableNodeDrag={false}
        linkCurvature={(l: any) => 0.18 + (l.weight ?? 0) * 0.1}
        linkDirectionalParticles={(l: any) => {
          // Modo foco (selecionado): partículas só nas top-N
          if (focusedEdgeIds) {
            return focusedEdgeIds.has(edgeKey(l)) ? (l.weight >= 0.7 ? 3 : 2) : 0;
          }
          // Hover sem seleção: partículas em links que tocam o hover
          if (hoveredNodeId) {
            const sId = l.source.id ?? l.source;
            const tId = l.target.id ?? l.target;
            if (sId !== hoveredNodeId && tId !== hoveredNodeId) return 0;
            return l.weight >= 0.7 ? 3 : l.weight >= 0.5 ? 2 : 0;
          }
          return 0;
        }}
        linkDirectionalParticleWidth={(l: any) => 1.5 + (l.weight ?? 0) * 1.8}
        linkDirectionalParticleSpeed={() => 0.006}
        linkDirectionalParticleColor={(l: any) => EDGE_COLORS[l.edge_type] ?? "#52525b"}
        linkWidth={(l: any) => {
          const sId = l.source.id ?? l.source;
          const tId = l.target.id ?? l.target;
          // Modo FOCO: apenas top-N visíveis, fortes e brilhantes
          if (focusedEdgeIds) {
            return focusedEdgeIds.has(edgeKey(l)) ? (l.weight ?? 0.3) * 3 + 1 : 0.0001;
          }
          // Hover sem seleção: realça vizinhança
          if (hoveredNodeId) {
            const touches = sId === hoveredNodeId || tId === hoveredNodeId;
            if (touches) return (l.weight ?? 0.3) * 2.6 + 0.8;
            return 0.0001;
          }
          // Idle: só top-N renderiza fininho
          return idleEdgeIds.has(edgeKey(l)) ? 0.5 : 0.0001;
        }}
        linkColor={(l: any) => {
          const base = EDGE_COLORS[l.edge_type] ?? "#52525b";
          const sId = l.source.id ?? l.source;
          const tId = l.target.id ?? l.target;
          const toAlpha = (a: number) =>
            base.startsWith("hsl(")
              ? base.replace("hsl(", "hsla(").replace(")", `, ${a})`)
              : base;
          if (focusedEdgeIds) {
            return focusedEdgeIds.has(edgeKey(l)) ? toAlpha(0.95) : toAlpha(0);
          }
          if (hoveredNodeId) {
            const touches = sId === hoveredNodeId || tId === hoveredNodeId;
            if (touches) return toAlpha(0.95);
            return toAlpha(0.02);
          }
          return idleEdgeIds.has(edgeKey(l)) ? toAlpha(0.13) : toAlpha(0);
        }}
        onNodeClick={(n: any) => {
          setSelectedNode(n as GraphNode);
          // Center suavemente, sem zoom agressivo
          if (fgRef.current && Number.isFinite(n.x) && Number.isFinite(n.y)) {
            fgRef.current.centerAt(n.x, n.y, 700);
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
          // Modo foco (selecionado): só vizinhança visível; demais escurecidos
          // Sem seleção, hover usa neighborIds normalmente
          const focusActive = !!(hoveredNodeId || selectedNode);
          const visibleSet = focusedNeighborIds ?? (hoveredNodeId ? neighborIds : null);
          const isNeighbor = !!visibleSet && visibleSet.has(n.id) && !isHovered && !isSelected;
          const isDimmed = !!visibleSet && !visibleSet.has(n.id) && !isSelected;

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
          // Área de clique generosa para facilitar seleção mesmo de nodes pequenos
          const baseR = Math.max(16, getBaseRadius(n) + 14);
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
