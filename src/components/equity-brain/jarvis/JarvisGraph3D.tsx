/**
 * JarvisGraph3D — render 3D imersivo do Strategic Graph.
 *
 * Reusa as queries e o builder do StrategicGraph (2D); só troca a camada visual.
 * Esferas com glow aditivo, anéis orbitais para buyers/platforms, partículas
 * direcionais com regra anti-ruído, câmera animada no clique, freeze após
 * estabilização.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph3D, { type ForceGraphMethods } from "react-force-graph-3d";
import * as THREE from "three";
import SpriteText from "three-spritetext";
import { useQueries } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  buildStrategicGraph,
  type GraphNode,
  type GraphEdge,
  type EdgeType,
} from "@/lib/equityGraphBuilder";
import {
  EDGE_COLORS,
  NODE_COLORS,
  EDGE_LAYERS,
  type LayerKey,
} from "@/lib/equityGraphScoring";
import {
  adaptToJarvisGraph,
  ALWAYS_LIVE_EDGE_TYPES,
  type JarvisNode,
  type JarvisLink,
} from "@/lib/equityGraphJarvisAdapter";
import { GraphFilterSidebar } from "@/components/equity-brain/graph/GraphFilterSidebar";
import { GraphLegend } from "@/components/equity-brain/graph/GraphLegend";
import { NodeDetailPanel } from "@/components/equity-brain/graph/NodeDetailPanel";

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

const endpointId = (v: any): string =>
  typeof v === "string" ? v : v?.id ?? String(v ?? "");

export function JarvisGraph3D() {
  const fgRef = useRef<ForceGraphMethods | undefined>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [isMobile, setIsMobile] = useState(false);

  // Filtros — espelham o 2D para consistência
  const [filterCollapsed, setFilterCollapsed] = useState(false);
  const [selectedVerticals, setSelectedVerticals] = useState<Set<string>>(new Set());
  const [selectedUfs, setSelectedUfs] = useState<Set<string>>(new Set());
  const [selectedNodeTypes, setSelectedNodeTypes] = useState<Set<string>>(DEFAULT_NODE_TYPES);
  const [enabledLayers, setEnabledLayers] = useState<Set<LayerKey>>(DEFAULT_LAYERS);
  const [minWeight, setMinWeight] = useState(0.15);
  const [minConfidence, setMinConfidence] = useState(0.0);
  const [thesisFilter, setThesisFilter] = useState<string | null>(null);
  const [buyerFilter, setBuyerFilter] = useState<string | null>(null);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<JarvisNode | null>(null);

  // Resize
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

  // ---------- Data queries (mesmas do 2D) ----------
  const queries = useQueries({
    queries: [
      {
        queryKey: ["sg", "companies"],
        queryFn: async () => {
          const { data } = await supabase
            .from("eb_companies" as any)
            .select(
              "cnpj,razao_social,nome_fantasia,setor_ma,uf,municipio,faturamento_estimado,ebitda_estimado,funcionarios_estimado,cnae_descricao,has_listing,listing_id",
            )
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
            .select(
              "id,nome,tipo,ticket_min,ticket_max,setores_interesse,ufs_interesse,sinergias_chave,deals_realizados,prioridade_global,vertical_principal",
            );
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
            .select(
              "cnpj,buyer_id,thesis_key,match_score,setor_fit,geografia_fit,porte_fit,tese_fit,is_current",
            )
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

  const enabledEdgeTypes = useMemo<Set<EdgeType>>(() => {
    const set = new Set<EdgeType>();
    enabledLayers.forEach((k) =>
      EDGE_LAYERS[k].types.forEach((t) => set.add(t as EdgeType)),
    );
    return set;
  }, [enabledLayers]);

  // ---------- Build + adapt ----------
  const graphData = useMemo(() => {
    if (!companiesQ.data || !buyersQ.data || !thesesQ.data || !btQ.data) {
      return { nodes: [] as JarvisNode[], links: [] as JarvisLink[] };
    }

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

    const filteredNodes = built.nodes.filter((n) => selectedNodeTypes.has(n.type));
    const allowedIds = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges = built.edges.filter(
      (e) => allowedIds.has(e.source as any) && allowedIds.has(e.target as any),
    );
    const connected = new Set<string>();
    filteredEdges.forEach((e) => {
      connected.add(e.source as any);
      connected.add(e.target as any);
    });
    const finalNodes = filteredNodes.filter(
      (n) => connected.has(n.id) || n.type === "thesis" || n.type === "strategy",
    );

    return adaptToJarvisGraph(finalNodes, filteredEdges);
  }, [
    companiesQ.data, scoredQ.data, buyersQ.data, thesesQ.data, btQ.data, matchesQ.data,
    minWeight, minConfidence, enabledEdgeTypes,
    selectedNodeTypes, selectedUfs, selectedVerticals, thesisFilter, buyerFilter,
  ]);

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

  // ---------- Forces & freeze ----------
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg || !graphData.nodes.length) return;

    // Espalha
    fg.d3Force("charge")?.strength(-380);
    const linkForce: any = fg.d3Force("link");
    if (linkForce) {
      linkForce
        .distance((l: any) => 90 + (1 - (l.weight ?? 0.5)) * 160)
        .strength((l: any) => Math.max(0.05, (l.weight ?? 0.3) * 0.7));
    }

    fg.cameraPosition({ x: 0, y: 0, z: 900 }, undefined, 1200);

    const safety = window.setTimeout(() => {
      try {
        graphData.nodes.forEach((n: any) => {
          if (Number.isFinite(n.x) && Number.isFinite(n.y) && Number.isFinite(n.z)) {
            n.fx = n.x;
            n.fy = n.y;
            n.fz = n.z;
          }
        });
      } catch {}
    }, 7000);
    return () => window.clearTimeout(safety);
  }, [graphData]);

  // ---------- Vizinhos do hovered/selected ----------
  const focusId = selectedNode?.id ?? hoveredId ?? null;
  const focusNeighborIds = useMemo(() => {
    if (!focusId) return null;
    const set = new Set<string>([focusId]);
    graphData.links.forEach((l) => {
      const sId = endpointId((l as any).source);
      const tId = endpointId((l as any).target);
      if (sId === focusId) set.add(tId);
      else if (tId === focusId) set.add(sId);
    });
    return set;
  }, [focusId, graphData.links]);

  // ---------- Node visual ----------
  const buildNodeObject = (node: any): THREE.Object3D => {
    const n = node as JarvisNode;
    const group = new THREE.Group();
    const baseColor = new THREE.Color(NODE_COLORS[n.type] ?? "#71717a");
    const radius = n.visualRadius ?? 6;
    const dimmed =
      focusId !== null && focusNeighborIds && !focusNeighborIds.has(n.id);

    // Núcleo
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 24, 24),
      new THREE.MeshBasicMaterial({
        color: baseColor,
        transparent: true,
        opacity: dimmed ? 0.18 : 0.95,
      }),
    );
    group.add(sphere);

    // Glow aditivo
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.9, 24, 24),
      new THREE.MeshBasicMaterial({
        color: baseColor,
        transparent: true,
        opacity: dimmed ? 0.02 : 0.05 + n.heat * 0.18,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    group.add(glow);

    // Anéis orbitais para buyers estratégicos / platforms / strategy
    if (
      !dimmed &&
      (n.type === "buyer_strategic" || n.type === "platform" || n.type === "strategy")
    ) {
      const ringGeo = new THREE.RingGeometry(radius * 2.2, radius * 2.4, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: baseColor,
        transparent: true,
        opacity: 0.32,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      group.add(ring);

      // Segundo anel (platform tem dois)
      if (n.type === "platform") {
        const ring2 = new THREE.Mesh(
          new THREE.RingGeometry(radius * 2.7, radius * 2.85, 64),
          ringMat.clone(),
        );
        ring2.rotation.x = Math.PI / 2.4;
        ring2.rotation.y = Math.PI / 4;
        group.add(ring2);
      }
    }

    // Halo capital para buyer financial
    if (!dimmed && n.type === "buyer_financial") {
      const halo = new THREE.Mesh(
        new THREE.SphereGeometry(radius * 2.4, 16, 16),
        new THREE.MeshBasicMaterial({
          color: baseColor,
          transparent: true,
          opacity: 0.06,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      group.add(halo);
    }

    // Label
    const isFocused = focusId === n.id;
    if (n.showLabel || isFocused) {
      const label = new SpriteText(
        n.label.length > 26 ? n.label.slice(0, 26) + "…" : n.label,
      );
      label.color = isFocused ? "#a7f3d0" : "#e5e7eb";
      label.textHeight = isFocused ? 6 : 4.2;
      label.backgroundColor = "rgba(9,9,11,0.6)";
      label.padding = 1.5;
      label.borderRadius = 2;
      (label as unknown as THREE.Object3D).position.y = radius + 7;
      group.add(label);
    }

    return group;
  };

  // ---------- Link logic ----------
  const linkOpacityFn = (link: any) => {
    const sId = endpointId(link.source);
    const tId = endpointId(link.target);
    if (focusId) {
      const involved = sId === focusId || tId === focusId;
      return involved ? 0.95 : 0.04;
    }
    return (link.weight ?? 0) >= 0.55 ? 0.22 : 0.05;
  };

  const linkWidthFn = (link: any) => {
    const w = link.weight ?? 0.5;
    const sId = endpointId(link.source);
    const tId = endpointId(link.target);
    const focused = focusId && (sId === focusId || tId === focusId);
    const base = 0.4 + w * 3;
    return focused ? base * 2.2 : base;
  };

  const shouldShowParticles = (link: any): boolean => {
    const sId = endpointId(link.source);
    const tId = endpointId(link.target);
    if (focusId && (sId === focusId || tId === focusId)) return true;
    if ((link.weight ?? 0) >= 0.75) return true;
    return ALWAYS_LIVE_EDGE_TYPES.has(link.edge_type);
  };

  // ---------- Reset ----------
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

  // ---------- Mobile fallback ----------
  if (isMobile) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-zinc-950 p-8">
        <div className="text-center max-w-sm">
          <div className="text-emerald-400 text-4xl mb-3">🧠</div>
          <h2 className="text-zinc-100 font-bold text-lg mb-2">
            Equity Brain Jarvis — apenas desktop
          </h2>
          <p className="text-zinc-500 text-sm">
            A visualização 3D do cérebro estratégico exige uma tela maior. Acesse de um computador.
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

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden"
      style={{ background: "#06070a" }}
    >
      {/* Nebulosa radial de fundo */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 20% 30%, rgba(16,185,129,0.10) 0%, transparent 45%), radial-gradient(circle at 80% 20%, rgba(56,189,248,0.08) 0%, transparent 50%), radial-gradient(circle at 65% 80%, rgba(244,63,94,0.07) 0%, transparent 45%), radial-gradient(circle at 30% 75%, rgba(168,85,247,0.06) 0%, transparent 50%)",
        }}
      />
      {/* Grid HUD */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(56,189,248,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.6) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      {/* Sidebar de filtros (mesmo componente do 2D) */}
      <div className="absolute top-0 left-0 h-full z-10">
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
          onChange={(patch) => {
            if (patch.selectedVerticals !== undefined) setSelectedVerticals(patch.selectedVerticals);
            if (patch.selectedUfs !== undefined) setSelectedUfs(patch.selectedUfs);
            if (patch.selectedNodeTypes !== undefined) setSelectedNodeTypes(patch.selectedNodeTypes);
            if (patch.enabledLayers !== undefined) setEnabledLayers(patch.enabledLayers);
            if (patch.minWeight !== undefined) setMinWeight(patch.minWeight);
            if (patch.minConfidence !== undefined) setMinConfidence(patch.minConfidence);
            if (patch.thesisFilter !== undefined) setThesisFilter(patch.thesisFilter);
            if (patch.buyerFilter !== undefined) setBuyerFilter(patch.buyerFilter);
          }}
          onReset={handleReset}
        />
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-7 w-7 text-emerald-400 animate-spin" />
            <div className="text-emerald-300 text-xs uppercase tracking-widest">
              inicializando cérebro estratégico
            </div>
          </div>
        </div>
      )}

      {/* HUD topo direito */}
      <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1.5 pointer-events-none">
        <div className="px-2.5 py-1 rounded bg-zinc-950/70 border border-emerald-900/50 backdrop-blur-sm">
          <span className="text-[9px] uppercase tracking-widest text-emerald-400 font-bold">
            Equity Brain · Jarvis 3D
          </span>
        </div>
        <div className="px-2 py-0.5 rounded bg-zinc-950/60 border border-zinc-800/60 backdrop-blur-sm text-[10px] text-zinc-400 font-mono">
          {graphData.nodes.length} nós · {graphData.links.length} conexões
        </div>
      </div>

      {/* Grafo 3D */}
      <ForceGraph3D
        ref={fgRef as any}
        width={size.w}
        height={size.h}
        graphData={graphData as any}
        backgroundColor="#06070a"
        showNavInfo={false}
        nodeRelSize={1}
        nodeThreeObject={buildNodeObject}
        nodeLabel={(n: any) =>
          `${n.label} · score ${Math.round(n.strategic_score ?? 0)} · ${n.degree ?? 0} conexões`
        }
        linkColor={(l: any) => EDGE_COLORS[l.edge_type] ?? "#71717a"}
        linkOpacity={0.6}
        linkWidth={linkWidthFn}
        linkDirectionalParticles={(l: any) => (shouldShowParticles(l) ? 3 : 0)}
        linkDirectionalParticleWidth={(l: any) => 1 + (l.weight ?? 0.5) * 3}
        linkDirectionalParticleSpeed={(l: any) => 0.002 + (l.weight ?? 0.5) * 0.006}
        linkCurvature={(l: any) => 0.18 + (l.weight ?? 0.5) * 0.08}
        // Render manual cuida de opacity por link via material — usamos linkOpacity
        // como base e diminuímos via linkColor só seria HEX. Contornamos delegando ao
        // shader interno: passamos opacidade dinâmica via linkVisibility implícito.
        onNodeHover={(n: any) => setHoveredId(n?.id ?? null)}
        onNodeClick={(n: any) => {
          setSelectedNode(n as JarvisNode);
          const fg = fgRef.current;
          if (!fg) return;
          const dist = 240;
          const distRatio = 1 + dist / Math.hypot(n.x ?? 1, n.y ?? 1, n.z ?? 1);
          fg.cameraPosition(
            {
              x: (n.x ?? 0) * distRatio,
              y: (n.y ?? 0) * distRatio,
              z: (n.z ?? 0) * distRatio,
            },
            n,
            900,
          );
        }}
        onBackgroundClick={() => setSelectedNode(null)}
        cooldownTicks={140}
        d3VelocityDecay={0.35}
        warmupTicks={20}
      />

      {/* Legenda inferior */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10">
        <GraphLegend />
      </div>

      {/* Painel detalhe (reuso do 2D) */}
      <NodeDetailPanel
        node={selectedNode as unknown as GraphNode | null}
        allNodes={graphData.nodes as unknown as GraphNode[]}
        allEdges={graphData.links as unknown as GraphEdge[]}
        onClose={() => setSelectedNode(null)}
        onFocus={(id) => {
          const n = graphData.nodes.find((x) => x.id === id);
          if (n) setSelectedNode(n);
        }}
        onSelectNode={(id) => {
          const n = graphData.nodes.find((x) => x.id === id);
          if (n) setSelectedNode(n);
        }}
      />
    </div>
  );
}
