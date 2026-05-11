/**
 * JarvisGraph3D — render 3D imersivo do Strategic Graph.
 *
 * Reusa as queries e o builder do StrategicGraph (2D); só troca a camada visual.
 * Esferas com glow aditivo, anéis orbitais para buyers/platforms, partículas
 * direcionais com regra anti-ruído, câmera animada no clique, freeze após
 * estabilização.
 */

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Settings2, X, RotateCcw, Activity, ClipboardCopy } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import ForceGraph3D, { type ForceGraphMethods } from "react-force-graph-3d";
import {
  Group,
  Mesh,
  SphereGeometry,
  RingGeometry,
  MeshBasicMaterial,
  Color,
  AdditiveBlending,
  DoubleSide,
  type Object3D,
} from "three";
import { forceCollide, forceManyBody, forceRadial, forceLink } from "d3-force-3d";
import SpriteText from "three-spritetext";
import { useGhostSynapses } from "./useGhostSynapses";
import { useSolarFlares } from "./useSolarFlares";
import { useQueries, useQuery } from "@tanstack/react-query";
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

// "Ativar tudo" usa estes conjuntos cheios.
const ALL_NODE_TYPES = new Set([
  "seller",
  "buyer_strategic",
  "buyer_financial",
  "thesis",
  "platform",
  "asset",
  "strategy",
]);
const ALL_LAYERS = new Set<LayerKey>([
  "ma_direct",
  "rollup",
  "operational",
  "commercial",
  "arbitrage",
  "capital",
  "thesis",
]);

// Defaults agora abrem com TUDO ligado para o globo nascer cheio.
const DEFAULT_NODE_TYPES = new Set(ALL_NODE_TYPES);
const DEFAULT_LAYERS = new Set<LayerKey>(ALL_LAYERS);

const endpointId = (v: any): string =>
  typeof v === "string" ? v : v?.id ?? String(v ?? "");

export function JarvisGraph3D() {
  const fgRef = useRef<ForceGraphMethods | undefined>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [isMobile, setIsMobile] = useState(false);

  // Filtros — espelham o 2D para consistência
  const [filterCollapsed, setFilterCollapsed] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 768,
  );
  const [selectedVerticals, setSelectedVerticals] = useState<Set<string>>(new Set());
  const [selectedUfs, setSelectedUfs] = useState<Set<string>>(new Set());
  const [selectedNodeTypes, setSelectedNodeTypes] = useState<Set<string>>(DEFAULT_NODE_TYPES);
  const [enabledLayers, setEnabledLayers] = useState<Set<LayerKey>>(DEFAULT_LAYERS);
  const [minWeight, setMinWeight] = useState(0.35);
  const [minConfidence, setMinConfidence] = useState(0.0);
  const [thesisFilter, setThesisFilter] = useState<string | null>(null);
  const [buyerFilter, setBuyerFilter] = useState<string | null>(null);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<JarvisNode | null>(null);

  // ---------- Deep-link via ?focus=<nodeId> ----------
  const [searchParams] = useSearchParams();
  const focusParam = searchParams.get("focus");
  const focusedOnceRef = useRef<string | null>(null);

  // Quando chega com ?focus=, ligamos todos os tipos/camadas para que o nó
  // E suas conexões diretas (vizinhos) apareçam no grafo.
  useEffect(() => {
    if (!focusParam) return;
    setSelectedNodeTypes(new Set(ALL_NODE_TYPES));
    setEnabledLayers(new Set(ALL_LAYERS));
    const [prefix, ...rest] = focusParam.split(":");
    const id = rest.join(":");
    if (prefix === "buyer" && id) setBuyerFilter(id);
  }, [focusParam]);

  // ---------- Visual prefs (ajustes de fundo, persistidos em localStorage) ----------
  // Defaults LEVES — abre o painel rápido; usuário aumenta efeitos quando quiser.
  const VISUAL_DEFAULTS = {
    glow: 0,
    scanlines: 0,
    vignette: 0,
    brightness: 10,
    curvatureMin: 0,
    curvatureRange: 0,
    linkSegments: 4,
    arcStyle: "quad" as "quad" | "sine",
  };
  // Valores ricos antigos — aplicados pelo botão "Ativar tudo".
  const VISUAL_FULL = {
    glow: 70,
    scanlines: 50,
    vignette: 60,
    brightness: 30,
    curvatureMin: 18,
    curvatureRange: 24,
    linkSegments: 12,
    arcStyle: "quad" as "quad" | "sine",
  };
  const [visualPrefs, setVisualPrefs] = useState(() => {
    try {
      const raw = localStorage.getItem("jarvis3d-visual-prefs");
      if (raw) return { ...VISUAL_DEFAULTS, ...JSON.parse(raw) };
    } catch {}
    return VISUAL_DEFAULTS;
  });
  const [visualPanelOpen, setVisualPanelOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem("jarvis3d-visual-prefs", JSON.stringify(visualPrefs));
    } catch {}
  }, [visualPrefs]);

  const glowFactor = visualPrefs.glow / 70;
  const vignetteFactor = visualPrefs.vignette / 60;
  const scanlineOpacity = visualPrefs.scanlines / 1000;
  const videoBrightnessVal = (visualPrefs.brightness / 100) * 0.6 + 0.05;

  // ---------- Diagnóstico (FPS, flare, log buffer) ----------
  const { toast } = useToast();
  const [fps, setFps] = useState(0);
  const [flareActive, setFlareActive] = useState(false);

  useEffect(() => {
    let raf = 0;
    let frames = 0;
    let last = performance.now();
    const tick = () => {
      frames++;
      const now = performance.now();
      if (now - last >= 1000) {
        setFps(Math.round((frames * 1000) / (now - last)));
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const logBufferRef = useRef<string[]>([]);
  useEffect(() => {
    const methods: Array<"log" | "info" | "warn" | "error"> = ["log", "info", "warn", "error"];
    const originals: Record<string, (...args: any[]) => void> = {};
    methods.forEach((m) => {
      originals[m] = (console as any)[m].bind(console);
      (console as any)[m] = (...args: any[]) => {
        try {
          const ts = new Date().toISOString().slice(11, 23);
          const line =
            `[${ts}] ${m.toUpperCase()} ` +
            args
              .map((a) => {
                if (typeof a === "string") return a;
                try { return JSON.stringify(a); } catch { return String(a); }
              })
              .join(" ");
          logBufferRef.current.push(line);
          if (logBufferRef.current.length > 200) logBufferRef.current.shift();
        } catch {}
        originals[m](...args);
      };
    });
    return () => {
      methods.forEach((m) => { (console as any)[m] = originals[m]; });
    };
  }, []);

  const handleCopyLogs = useCallback(async () => {
    const text = logBufferRef.current.join("\n") || "(buffer vazio)";
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Logs copiados", description: `${logBufferRef.current.length} linhas copiadas.` });
    } catch {
      toast({ title: "Falha ao copiar", description: "Permissão negada.", variant: "destructive" });
    }
  }, [toast]);

  // Resize — mede no mount, em rAF duplo (para pegar o layout do AppShell estabilizado),
  // depois via ResizeObserver. Também força refresh do ForceGraph quando o tamanho muda.
  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        const r = containerRef.current.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          setSize({ w: r.width, h: r.height });
        }
      }
      setIsMobile(window.innerWidth < 768);
    };
    // Mede agora, depois em rAF duplo (sidebar/topbar acomodando), depois com 100/300/600ms.
    update();
    requestAnimationFrame(() => requestAnimationFrame(update));
    const t1 = setTimeout(update, 100);
    const t2 = setTimeout(update, 300);
    const t3 = setTimeout(update, 600);
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
    };
  }, []);

  // Refresh ForceGraph quando o tamanho muda (corrige render cortado no primeiro abrir).
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      try { fgRef.current?.refresh?.(); } catch { /* noop */ }
    });
    return () => cancelAnimationFrame(id);
  }, [size.w, size.h]);

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
            .limit(3000);
          return (data ?? []) as any[];
        },
      },
      {
        queryKey: ["sg", "scored"],
        queryFn: async () => {
          const { data } = await supabase
            .from("eb_companies_scored" as any)
            .select("cnpj,ma_score")
            .limit(3000);
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
            .limit(1000);
          return (data ?? []) as any[];
        },
      },
    ],
  });

  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);
  const [companiesQ, scoredQ, buyersQ, thesesQ, btQ, matchesQ] = queries;

  // Cold sample da RFB (~2k CNPJs ativos aleatórios) — nuvem decorativa do globo.
  // Carregamento em paralelo, sem bloquear o loading principal.
  const coldQ = useQuery({
    queryKey: ["sg", "cold-sample-rfb"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("jarvis-cold-sample", {
        body: { limit: 2000 },
      });
      if (error) {
        console.warn("[Jarvis3D] cold-sample failed:", error);
        return [] as any[];
      }
      return (data?.points ?? []) as any[];
    },
    staleTime: 1000 * 60 * 30, // 30min — base RFB muda devagar
    retry: 1,
  });

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
        maxNodes: 1800,
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

    const live = adaptToJarvisGraph(finalNodes, filteredEdges);

    // ---------- Merge cold sample (RFB) — pontos cinzas decorativos ----------
    // Posicionados em casca esférica externa via Fibonacci (distribuição uniforme),
    // pinados (fx/fy/fz) para não serem puxados pela simulação de força.
    const cold = coldQ.data ?? [];
    const liveIds = new Set(live.nodes.map((n) => n.id));
    const coldNodes: JarvisNode[] = [];
    const R_OUTER = 1400; // raio fixo da nuvem (independe do globo interno)
    const golden = Math.PI * (3 - Math.sqrt(5));
    const N = cold.length;
    for (let i = 0; i < N; i++) {
      const c = cold[i] as any;
      const id = `cold:${c.cnpj}`;
      if (liveIds.has(id)) continue;
      // Fibonacci sphere
      const y = 1 - (i / Math.max(1, N - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = golden * i;
      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;
      coldNodes.push({
        id,
        type: "seller_cold" as any,
        label: c.razao_social ?? c.cnpj ?? "",
        vertical: null as any,
        uf: c.uf ?? null,
        strategic_score: 0,
        metadata: { source: "rfb_cold", municipio: c.municipio, cnae: c.cnae_descricao } as any,
        degree: 0,
        strongDegree: 0,
        hot: false,
        heat: 0,
        visualRadius: 2.2,
        showLabel: false,
        strategicRole: "target" as any,
        isNeuron: false,
        displayColor: "hsl(220, 8%, 55%)",
        bigSellerRing: false,
        // posições pinadas
        x: x * R_OUTER, y: y * R_OUTER, z: z * R_OUTER,
        fx: x * R_OUTER, fy: y * R_OUTER, fz: z * R_OUTER,
      } as any);
    }

    return { nodes: [...live.nodes, ...coldNodes], links: live.links };
  }, [
    companiesQ.data, scoredQ.data, buyersQ.data, thesesQ.data, btQ.data, matchesQ.data,
    coldQ.data,
    minWeight, minConfidence, enabledEdgeTypes,
    selectedNodeTypes, selectedUfs, selectedVerticals, thesisFilter, buyerFilter,
  ]);

  // (log de render removido — estava forçando trabalho extra a cada frame)

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

  // ---------- Germinação progressiva ----------
  // Em vez de pinar os nós em uma casca esférica determinística, deixamos a
  // simulação de força do d3 montar o globo organicamente: nós nascem na origem
  // (0,0,0) e os links entram aos poucos, expandindo a estrutura via forceManyBody
  // (repulsão), forceLink (mola) e forceRadial (puxa todos para a casca esférica).
  const sphereRadiusRef = useRef(900);
  const [visibleLinkCount, setVisibleLinkCount] = useState(0);

  // 1. Posicionamento inicial: nós "vivos" nascem na origem; nós cold já vêm
  //    pinados em casca Fibonacci e DEVEM preservar fx/fy/fz.
  useEffect(() => {
    if (!graphData.nodes.length) return;
    graphData.nodes.forEach((n: any) => {
      if (n.type === "seller_cold") return; // já posicionado e pinado
      n.x = (Math.random() - 0.5) * 0.5;
      n.y = (Math.random() - 0.5) * 0.5;
      n.z = (Math.random() - 0.5) * 0.5;
      delete n.fx; delete n.fy; delete n.fz;
      n.vx = 0; n.vy = 0; n.vz = 0;
    });
  }, [graphData.nodes]);

  // 2. Configura forças d3 (charge + link + collide + radial) e ativa a simulação.
  useEffect(() => {
    const fg = fgRef.current as any;
    if (!fg || !graphData.nodes.length) return;

    // N "vivo" para dimensionar o globo (ignora cold que é só decoração externa)
    const N = graphData.nodes.filter((n: any) => n.type !== "seller_cold").length;
    const R = Math.max(1200, Math.min(3600, 900 + N * 4.5));
    sphereRadiusRef.current = R;

    let raf = 0;
    raf = requestAnimationFrame(() => {
      try {
        fg.d3Force?.("charge", forceManyBody().strength(-340).distanceMax(R * 1.8));
        fg.d3Force?.(
          "link",
          forceLink()
            .id((d: any) => d.id)
            .distance((l: any) => 110 + (1 - (l.weight ?? 0.5)) * 160)
            .strength(0.35),
        );
        fg.d3Force?.(
          "collide",
          forceCollide((n: any) => (n.visualRadius ?? 6) + 14),
        );
        fg.d3Force?.("radial", forceRadial(R, 0, 0, 0).strength(0.22));
        fg.d3Force?.("center", null);
        fg.d3Force?.("seller-spread", null);

        // Damping/viscosidade — crescimento controlado, sem explodir
        fg.d3VelocityDecay?.(0.50);
        fg.d3AlphaDecay?.(0.010);
        fg.d3AlphaTarget?.(0.05); // mantém vivo durante a germinação
        fg.cooldownTicks?.(Infinity);
        fg.refresh?.();
      } catch (e) {
        console.error("[JarvisGraph3D] force config falhou:", e);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [graphData.nodes]);

  // 3. Germinação removida — todos os links já entram juntos (sem setState a cada 70ms).
  useEffect(() => {
    setVisibleLinkCount(graphData.links.length);
  }, [graphData.links.length]);

  // 4. Congela a simulação rapidamente após o build para liberar CPU.
  useEffect(() => {
    const fg = fgRef.current as any;
    if (!fg || !graphData.nodes.length) return;
    const t = window.setTimeout(() => {
      try { fg.d3AlphaTarget?.(0); fg.cooldownTicks?.(0); fg.refresh?.(); } catch {}
    }, 3500);
    return () => window.clearTimeout(t);
  }, [graphData.nodes.length, graphData.links.length]);

  // displayLinks: todos os links visíveis
  const displayLinks = graphData.links;

  // ---------- Auto-orbit da câmera (o globo "gira") ----------
  // Em vez de rotacionar 350 nós a cada frame, orbitamos a câmera ao redor da
  // origem. Pausa quando o usuário interage (clica nó, abre painel, foco deep-link).
  const orbitPausedRef = useRef(false);
  const orbitInteractUntilRef = useRef(0);
  useEffect(() => {
    orbitPausedRef.current = !!selectedNode || !!focusParam;
  }, [selectedNode, focusParam]);

  // Pausa o orbit por 6s quando o usuário interage com o canvas (drag/wheel/touch)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const bump = () => {
      orbitInteractUntilRef.current = performance.now() + 6000;
    };
    el.addEventListener("mousedown", bump);
    el.addEventListener("wheel", bump, { passive: true });
    el.addEventListener("touchstart", bump, { passive: true });
    return () => {
      el.removeEventListener("mousedown", bump);
      el.removeEventListener("wheel", bump);
      el.removeEventListener("touchstart", bump);
    };
  }, []);

  useEffect(() => {
    if (!graphData.nodes.length) return;
    let raf = 0;
    const start = performance.now();
    const speed = 0.00009; // ~70s por volta (mais imersivo com globo cheio)
    const loop = () => {
      const fg = fgRef.current as any;
      const now = performance.now();
      const interacting = now < orbitInteractUntilRef.current;
      if (fg && !orbitPausedRef.current && !interacting) {
        const R = sphereRadiusRef.current;
        const camR = R * 3.6; // afasta mais — leitura de "planeta girando"
        const a = (now - start) * speed;
        try {
          fg.cameraPosition?.(
            {
              x: Math.sin(a) * camR,
              y: Math.cos(a * 0.3) * R * 0.18,
              z: Math.cos(a) * camR,
            },
            { x: 0, y: 0, z: 0 },
            0,
          );
        } catch {}
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [graphData.nodes.length]);

  // ---------- Sinapses fantasmas + Solar flares: DESLIGADAS por padrão (caras em FPS) ----------
  // Mantemos os hooks no código mas com enabled=false; podem voltar via toggle futuro.
  useGhostSynapses(fgRef, graphData.nodes, false);
  useSolarFlares(fgRef, graphData.nodes, false, setFlareActive);

  // ---------- Auto-focus em ?focus=<id> ----------
  useEffect(() => {
    if (!focusParam) return;
    if (focusedOnceRef.current === focusParam) return;
    if (!graphData.nodes.length) return;
    const node = graphData.nodes.find((n: any) => n.id === focusParam);
    if (!node) {
      // ainda pode aparecer em rebuild seguinte; só notifica se já estabilizou
      return;
    }
    focusedOnceRef.current = focusParam;
    // espera a simulação posicionar o nó antes de centralizar a câmera
    const timer = window.setTimeout(() => {
      setSelectedNode(node as JarvisNode);
      const fg = fgRef.current as any;
      const n: any = node;
      if (!fg) return;
      const dist = 320;
      const distRatio = 1 + dist / Math.hypot(n.x ?? 1, n.y ?? 1, n.z ?? 1);
      fg.cameraPosition?.(
        {
          x: (n.x ?? 0) * distRatio,
          y: (n.y ?? 0) * distRatio,
          z: (n.z ?? 0) * distRatio,
        },
        n,
        1400,
      );
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [focusParam, graphData.nodes]);


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
  // Geometria/material compartilhados para a nuvem fria (2k+ pontos).
  // Sem cache, cada um aloca 2 esferas (24x24 segs) + material = morte de FPS.
  const coldGeoRef = useRef<SphereGeometry | null>(null);
  const coldMatRef = useRef<MeshBasicMaterial | null>(null);
  if (!coldGeoRef.current) {
    coldGeoRef.current = new SphereGeometry(3.0, 8, 8);
    coldMatRef.current = new MeshBasicMaterial({
      color: new Color("hsl(220, 18%, 72%)"),
      transparent: true,
      opacity: 0.78,
    });
  }

  const buildNodeObject = (node: any): Object3D => {
    const n = node as JarvisNode;

    // Fast path para nós da base fria (decorativos, sem hover/label/glow).
    if ((n as any).type === "seller_cold") {
      return new Mesh(coldGeoRef.current!, coldMatRef.current!);
    }

    const group = new Group();
    const fallback = NODE_COLORS[n.type] ?? "#71717a";
    let baseColor: Color;
    try {
      baseColor = new Color(n.displayColor ?? fallback);
      // Detecta NaN no resultado do parse
      if (!Number.isFinite(baseColor.r) || !Number.isFinite(baseColor.g) || !Number.isFinite(baseColor.b)) {
        baseColor = new Color(fallback);
      }
    } catch {
      baseColor = new Color(fallback);
    }
    const radius = n.visualRadius ?? 6;
    const dimmed =
      focusId !== null && focusNeighborIds && !focusNeighborIds.has(n.id);

    // Núcleo (segmentos reduzidos de 24→14: visual igual, ~3x menos triângulos)
    const sphere = new Mesh(
      new SphereGeometry(radius, 14, 14),
      new MeshBasicMaterial({
        color: baseColor,
        transparent: true,
        opacity: dimmed ? 0.18 : 0.95,
      }),
    );
    group.add(sphere);

    // Profundidade: nós no "fundo" da esfera ficam mais sutis (efeito globo 3D)
    const R = sphereRadiusRef.current || 900;
    const nz = (node as any).z ?? 0;
    const zNorm = Math.max(0, Math.min(1, (nz + R) / (2 * R))); // 0=fundo, 1=frente
    const depthFade = 0.45 + 0.55 * zNorm;

    // Núcleo — opacidade modulada por Z
    (sphere.material as MeshBasicMaterial).opacity = dimmed ? 0.18 : 0.35 + 0.6 * zNorm;

    // Glow aditivo
    const glow = new Mesh(
      new SphereGeometry(radius * 1.55, 24, 24),
      new MeshBasicMaterial({
        color: baseColor,
        transparent: true,
        opacity: dimmed ? 0.02 : (0.05 + n.heat * 0.18) * glowFactor * depthFade,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    );
    group.add(glow);

    // Anéis orbitais para buyers estratégicos / platforms / strategy
    if (
      !dimmed &&
      (n.type === "buyer_strategic" || n.type === "platform" || n.type === "strategy")
    ) {
      const ringGeo = new RingGeometry(radius * 2.05, radius * 2.2, 64);
      const ringMat = new MeshBasicMaterial({
        color: baseColor,
        transparent: true,
        opacity: 0.22 * glowFactor,
        side: DoubleSide,
        blending: AdditiveBlending,
        depthWrite: false,
      });
      const ring = new Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      group.add(ring);

      // Segundo anel (platform tem dois)
      if (n.type === "platform") {
        const ring2 = new Mesh(
          new RingGeometry(radius * 2.7, radius * 2.85, 64),
          ringMat.clone(),
        );
        ring2.rotation.x = Math.PI / 2.4;
        ring2.rotation.y = Math.PI / 4;
        group.add(ring2);
      }
    }

    // Halo capital para buyer financial
    if (!dimmed && n.type === "buyer_financial") {
      const halo = new Mesh(
        new SphereGeometry(radius * 2.0, 16, 16),
        new MeshBasicMaterial({
          color: baseColor,
          transparent: true,
          opacity: 0.04 * glowFactor,
          blending: AdditiveBlending,
          depthWrite: false,
        }),
      );
      group.add(halo);
    }

    // Anel dourado para mega-sellers (R$50M+) — destaque de porte
    if (!dimmed && n.type === "seller" && n.bigSellerRing) {
      const goldRing = new Mesh(
        new RingGeometry(radius * 2.3, radius * 2.55, 64),
        new MeshBasicMaterial({
          color: new Color("hsl(45, 100%, 60%)"),
          transparent: true,
          opacity: 0.4 * glowFactor,
          side: DoubleSide,
          blending: AdditiveBlending,
          depthWrite: false,
        }),
      );
      goldRing.rotation.x = Math.PI / 2;
      group.add(goldRing);
    }

    // Label
    const isFocused = focusId === n.id;
    if (n.showLabel || isFocused) {
      const label = new SpriteText(
        n.label.length > 26 ? n.label.slice(0, 26) + "…" : n.label,
      );
      label.color = isFocused ? "#a7f3d0" : "#e5e7eb";
      label.textHeight = isFocused ? 6 : 4.2;
      label.backgroundColor = "rgba(0,0,0,0.85)";
      label.borderColor = isFocused ? "#10b981" : "rgba(16,185,129,0.35)";
      label.borderWidth = 0.4;
      label.padding = 2;
      label.borderRadius = 2;
      (label as unknown as Object3D).position.y = radius + 7;
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
      return involved ? 0.95 : 0.025;
    }
    return (link.weight ?? 0) >= 0.55 ? 0.45 : 0.025;
  };

  const isGoldLink = (l: any): boolean =>
    l?.edge_type === "seller_acquires_seller" ||
    l?.edge_type === "seller_merges_with_seller";

  const linkWidthFn = (link: any) => {
    const w = link.weight ?? 0.5;
    const sId = endpointId(link.source);
    const tId = endpointId(link.target);
    const focused = focusId && (sId === focusId || tId === focusId);
    // Restaurado para valores "magros" anteriores
    let base = 0.25 + w * 1.6;
    if (isGoldLink(link)) base *= 1.4;
    return focused ? base * 2.2 : base;
  };

  const shouldShowParticles = (link: any): boolean => {
    const sId = endpointId(link.source);
    const tId = endpointId(link.target);
    if (focusId && (sId === focusId || tId === focusId)) return true;
    if (isGoldLink(link)) return true; // gold sempre vivo
    if ((link.weight ?? 0) >= 0.75) return true;
    return ALWAYS_LIVE_EDGE_TYPES.has(link.edge_type);
  };

  // ---------- Reset (volta ao modo LEVE) ----------
  const handleReset = () => {
    setSelectedVerticals(new Set());
    setSelectedUfs(new Set());
    setSelectedNodeTypes(new Set(DEFAULT_NODE_TYPES));
    setEnabledLayers(new Set(DEFAULT_LAYERS));
    setMinWeight(0.35);
    setMinConfidence(0);
    setThesisFilter(null);
    setBuyerFilter(null);
    setVisualPrefs(VISUAL_DEFAULTS);
  };

  // ---------- Ativar tudo (modo CHEIO) ----------
  const handleEnableAll = () => {
    setSelectedNodeTypes(new Set(ALL_NODE_TYPES));
    setEnabledLayers(new Set(ALL_LAYERS));
    setVisualPrefs(VISUAL_FULL);
  };

  // ---------- Mobile auto-tune (não bloqueia mais — globo roda no celular) ----------
  const mobileTunedRef = useRef(false);
  useEffect(() => {
    if (!isMobile || mobileTunedRef.current) return;
    mobileTunedRef.current = true;
    // Defaults leves para abrir já com algo visível mas barato.
    setSelectedNodeTypes(new Set(["seller", "buyer_strategic", "platform"]));
    setEnabledLayers(new Set(["ma_direct", "rollup"] as LayerKey[]));
  }, [isMobile]);

  // DPR cap universal — devicePixelRatio alto (Retina/HiDPI) detona FPS no WebGL.
  // Cap em 1.25 (desktop) e 1.5 (mobile) mantém visual aceitável e dobra o FPS.
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        const renderer = (fgRef.current as any)?.renderer?.();
        if (renderer && typeof renderer.setPixelRatio === "function") {
          const cap = isMobile ? 1.5 : 1.25;
          renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cap));
        }
      } catch {}
    }, 400);
    return () => clearTimeout(id);
  }, [isMobile, size.w, size.h]);

  if (isError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-zinc-950">
        <div className="text-rose-400 text-sm">Erro ao carregar dados do grafo.</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-3 text-emerald-300 text-xs font-mono uppercase tracking-widest">
          <Loader2 className="h-6 w-6 animate-spin" />
          Sincronizando cérebro…
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden bg-zinc-950"
      style={{ touchAction: "none" }}
    >
      {!isMobile && (
      <video
        className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
        src="/videos/jarvis-bg.mp4"
        poster="/videos/jarvis-bg-poster.jpg"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        style={{
          filter: `brightness(${videoBrightnessVal}) saturate(0.5) hue-rotate(60deg)`,
          mixBlendMode: "luminosity",
        }}
      />
      )}
      {/* Vinheta radial — escurece bordas, mantém centro respirando */}
      <div
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{
          background: `radial-gradient(ellipse at center, rgba(6,7,10,${(0.35 * vignetteFactor).toFixed(3)}) 0%, rgba(6,7,10,${Math.min(0.95, 0.65 * vignetteFactor + 0.1).toFixed(3)}) 55%, rgba(6,7,10,${Math.min(0.99, 0.92 * vignetteFactor + 0.05).toFixed(3)}) 100%)`,
        }}
      />
      {/* Nebulosa radial — sutil, dá profundidade */}
      <div
        className="absolute inset-0 pointer-events-none z-[1] opacity-50"
        style={{
          background:
            "radial-gradient(circle at 25% 35%, rgba(16,185,129,0.12) 0%, transparent 45%), radial-gradient(circle at 78% 25%, rgba(56,189,248,0.10) 0%, transparent 50%), radial-gradient(circle at 65% 80%, rgba(244,63,94,0.06) 0%, transparent 45%), radial-gradient(circle at 30% 75%, rgba(168,85,247,0.07) 0%, transparent 50%)",
        }}
      />
      {/* Scanlines horizontais — textura de monitor cockpit */}
      <div
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{
          opacity: scanlineOpacity,
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(16,185,129,0.6) 0px, rgba(16,185,129,0.6) 1px, transparent 1px, transparent 3px)",
        }}
      />
      {/* Grid HUD */}
      <div
        className="absolute inset-0 pointer-events-none z-[1] opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(56,189,248,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.6) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      {/* Corner brackets ao estilo Jarvis/HUD militar */}
      <div className="absolute inset-0 pointer-events-none z-[5]">
        <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-emerald-400/70" />
        <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-emerald-400/70" />
        <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-emerald-400/70" />
        <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-emerald-400/70" />
      </div>

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

      {/* HUD topo direito — estilo Iron Man com brackets em L */}
      <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-2 pointer-events-none">
        <div className="relative px-3 py-1.5 bg-zinc-950/80 backdrop-blur-md">
          {/* L brackets */}
          <span className="absolute -top-px -left-px w-2.5 h-2.5 border-t border-l border-emerald-400" />
          <span className="absolute -top-px -right-px w-2.5 h-2.5 border-t border-r border-emerald-400" />
          <span className="absolute -bottom-px -left-px w-2.5 h-2.5 border-b border-l border-emerald-400" />
          <span className="absolute -bottom-px -right-px w-2.5 h-2.5 border-b border-r border-emerald-400" />
          <div className="flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
            </span>
            <span className="text-[10px] uppercase tracking-[0.25em] text-emerald-300 font-bold font-mono">
              Equity Brain · Jarvis
            </span>
          </div>
        </div>
        <div className="hidden sm:flex gap-1.5 text-[9px] font-mono uppercase tracking-wider">
          <div className="px-2 py-0.5 bg-zinc-950/70 border border-emerald-900/40 backdrop-blur-sm text-emerald-300">
            <span className="text-zinc-500">N</span> {graphData.nodes.length}
          </div>
          <div className="px-2 py-0.5 bg-zinc-950/70 border border-emerald-900/40 backdrop-blur-sm text-cyan-300">
            <span className="text-zinc-500">E</span> {graphData.links.length}
          </div>
          <div className="px-2 py-0.5 bg-zinc-950/70 border border-emerald-900/40 backdrop-blur-sm text-amber-300">
            <span className="text-zinc-500">SIG</span> {Math.round((graphData.links.filter(l => (l.weight ?? 0) >= 0.55).length / Math.max(1, graphData.links.length)) * 100)}%
          </div>
        </div>
        {/* Botão Ativar tudo — modo cheio */}
        <button
          onClick={handleEnableAll}
          className="pointer-events-auto mt-1 px-2.5 py-1 bg-emerald-950/70 border border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/80 hover:text-emerald-200 text-[10px] font-mono uppercase tracking-wider backdrop-blur-sm transition-colors"
          title="Liga todas as camadas, tipos de nó e efeitos visuais"
        >
          Ativar tudo
        </button>
      </div>

      {/* Empty state — quando nada está selecionado */}
      {!isLoading && enabledLayers.size === 0 && selectedNodeTypes.size === 0 && (
        <div className="absolute inset-0 z-[5] flex items-center justify-center pointer-events-none">
          <div className="max-w-md mx-4 px-6 py-5 bg-zinc-950/85 border border-emerald-900/50 backdrop-blur-md text-center pointer-events-auto">
            <div className="text-emerald-400 text-2xl mb-2">🧠</div>
            <div className="text-emerald-300 text-xs uppercase tracking-[0.2em] font-mono mb-2">
              Cérebro em standby
            </div>
            <p className="text-zinc-400 text-xs leading-relaxed mb-4">
              Para manter o desempenho, o Jarvis abre com tudo desligado. Selecione camadas e
              tipos de nó na barra lateral à esquerda — ou ative o modo cheio com um clique.
            </p>
            <button
              onClick={handleEnableAll}
              className="px-3 py-1.5 bg-emerald-600/20 border border-emerald-500/60 text-emerald-300 hover:bg-emerald-600/30 hover:text-emerald-200 text-[11px] font-mono uppercase tracking-wider transition-colors"
            >
              Ativar tudo
            </button>
          </div>
        </div>
      )}

      {/* Grafo 3D — canvas WebGL transparente sobre o vídeo de fundo.
          Apenas este canvas é afetado por zoom/rotação da câmera. */}
      <div className="absolute inset-0 z-[2]">
        <ForceGraph3D
          ref={fgRef as any}
          width={size.w}
          height={size.h}
          graphData={{ nodes: graphData.nodes, links: displayLinks } as any}
          backgroundColor="rgba(0,0,0,0)"
          showNavInfo={false}
          nodeRelSize={1}
          nodeThreeObject={buildNodeObject}
          nodeLabel={(n: any) =>
            `${n.label} · score ${Math.round(n.strategic_score ?? 0)} · ${n.degree ?? 0} conexões`
          }
          linkColor={(l: any) => EDGE_COLORS[l.edge_type] ?? "#71717a"}
          linkOpacity={linkOpacityFn as any}
          linkWidth={linkWidthFn}
          linkMaterial={(l: any) => {
            if (isGoldLink(l)) {
              const w = l.weight ?? 0.5;
              const sId = endpointId(l.source);
              const tId = endpointId(l.target);
              const op = focusId
                ? sId === focusId || tId === focusId
                  ? 0.95
                  : 0.4
                : 0.5 + w * 0.45;
              return new MeshBasicMaterial({
                color: new Color("hsl(45, 100%, 65%)"),
                transparent: true,
                opacity: op,
                blending: AdditiveBlending,
                depthWrite: false,
              });
            }
            return null as any;
          }}
          linkDirectionalParticles={(l: any) => {
            // Partículas custam GPU por link. Mantemos só nos casos focais.
            if (focusId) {
              const sId = endpointId((l as any).source);
              const tId = endpointId((l as any).target);
              if (sId === focusId || tId === focusId) return isGoldLink(l) ? 3 : 2;
              return 0;
            }
            if (isGoldLink(l)) return 2;
            return 0;
          }}
          linkDirectionalParticleWidth={(l: any) => {
            const base = 0.6 + (l.weight ?? 0.5) * 1.6;
            return isGoldLink(l) ? base * 1.6 : base;
          }}
          linkDirectionalParticleSpeed={(l: any) => 0.002 + (l.weight ?? 0.5) * 0.006}
          linkDirectionalParticleColor={(l: any) => {
            if (isGoldLink(l)) return "#fde68a";
            if (l.edge_type === "buyer_acquires_seller" || l.edge_type === "platform_addon") {
              return "#60a5fa";
            }
            return EDGE_COLORS[l.edge_type] ?? "#a3e635";
          }}
          linkCurvature={(l: any) => {
            const k = endpointId((l as any).source) + "|" + endpointId((l as any).target);
            let h = 0;
            for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) | 0;
            const minC = visualPrefs.curvatureMin / 100;
            const range = visualPrefs.curvatureRange / 100;
            return minC + ((Math.abs(h) % 100) / 100) * range;
          }}
          linkCurveRotation={(l: any) => {
            const sId = endpointId((l as any).source);
            const tId = endpointId((l as any).target);
            let h = 0;
            const k = sId + "|" + tId;
            for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) | 0;
            // Estilo "sine": modula a rotação com Math.sin no hash → padrão senoidal
            // (aproximação visual; força-graph só suporta Bézier quadrática nativa)
            if (visualPrefs.arcStyle === "sine") {
              return (Math.sin(h) + 1) * Math.PI;
            }
            return ((h % 360) / 360) * Math.PI * 2;
          }}
          linkResolution={visualPrefs.linkSegments}
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
          cooldownTicks={Infinity}
          d3VelocityDecay={0.55}
          d3AlphaDecay={0.012}
          warmupTicks={0}
        />
      </div>

      {/* Painel de ajustes visuais — calibra glow/scanlines/vinheta/brilho do fundo */}
      <div className="absolute bottom-3 right-3 z-20">
        {!visualPanelOpen ? (
          <button
            onClick={() => setVisualPanelOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-950/85 backdrop-blur-md border border-emerald-900/50 hover:border-emerald-500/70 text-emerald-300 text-[10px] uppercase tracking-wider font-mono transition-colors"
            title="Ajustes visuais do fundo"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Ajustes
          </button>
        ) : (
          <div className="relative w-64 bg-zinc-950/90 backdrop-blur-md border border-emerald-900/50 p-3 font-mono">
            <span className="absolute -top-px -left-px w-2.5 h-2.5 border-t border-l border-emerald-400" />
            <span className="absolute -top-px -right-px w-2.5 h-2.5 border-t border-r border-emerald-400" />
            <span className="absolute -bottom-px -left-px w-2.5 h-2.5 border-b border-l border-emerald-400" />
            <span className="absolute -bottom-px -right-px w-2.5 h-2.5 border-b border-r border-emerald-400" />

            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5 text-emerald-300 text-[10px] uppercase tracking-[0.2em] font-bold">
                <Settings2 className="h-3 w-3" />
                Ajustes visuais
              </div>
              <button
                onClick={() => setVisualPanelOpen(false)}
                className="text-zinc-500 hover:text-emerald-300 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {[
              { key: "glow" as const, label: "Glow nós" },
              { key: "scanlines" as const, label: "Scanlines" },
              { key: "vignette" as const, label: "Vinheta" },
              { key: "brightness" as const, label: "Brilho vídeo" },
            ].map(({ key, label }) => (
              <div key={key} className="mb-2.5 last:mb-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] uppercase tracking-wider text-zinc-400">{label}</span>
                  <span className="text-[10px] text-emerald-300 tabular-nums">{visualPrefs[key]}</span>
                </div>
                <Slider
                  value={[visualPrefs[key]]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(v) => setVisualPrefs((p) => ({ ...p, [key]: v[0] }))}
                  className="[&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_[role=slider]]:border-emerald-400 [&_.bg-primary]:bg-emerald-500 [&_.bg-secondary]:bg-zinc-800"
                />
              </div>
            ))}

            {/* Controles de arco */}
            <div className="mt-3 pt-2.5 border-t border-emerald-900/40">
              <div className="text-[9px] uppercase tracking-wider text-emerald-400/80 mb-2 font-bold">Arcos</div>
              {[
                { key: "curvatureMin" as const, label: "Curvatura min", min: 0, max: 80 },
                { key: "curvatureRange" as const, label: "Amplitude", min: 0, max: 60 },
                { key: "linkSegments" as const, label: "Segmentos", min: 4, max: 24 },
              ].map(({ key, label, min, max }) => (
                <div key={key} className="mb-2 last:mb-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] uppercase tracking-wider text-zinc-400">{label}</span>
                    <span className="text-[10px] text-emerald-300 tabular-nums">{visualPrefs[key] as number}</span>
                  </div>
                  <Slider
                    value={[visualPrefs[key] as number]}
                    min={min}
                    max={max}
                    step={1}
                    onValueChange={(v) => setVisualPrefs((p: any) => ({ ...p, [key]: v[0] }))}
                    className="[&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_[role=slider]]:border-emerald-400 [&_.bg-primary]:bg-emerald-500 [&_.bg-secondary]:bg-zinc-800"
                  />
                </div>
              ))}
              <div className="flex gap-1 mt-2">
                {(["quad", "sine"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setVisualPrefs((p: any) => ({ ...p, arcStyle: s }))}
                    className={`flex-1 px-2 py-1 text-[9px] uppercase tracking-wider transition-colors border ${
                      visualPrefs.arcStyle === s
                        ? "bg-emerald-900/40 border-emerald-500/70 text-emerald-200"
                        : "bg-transparent border-emerald-900/50 text-zinc-400 hover:text-emerald-300"
                    }`}
                  >
                    {s === "quad" ? "Quadrática" : "Senoidal"}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setVisualPrefs(VISUAL_DEFAULTS)}
              className="mt-3 w-full flex items-center justify-center gap-1.5 px-2 py-1 bg-transparent border border-emerald-900/50 hover:border-emerald-500/70 text-emerald-300 text-[9px] uppercase tracking-wider transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              Restaurar padrões
            </button>
          </div>
        )}
      </div>

      {/* Overlay diagnóstico — FPS / nodes / links / flare ativo + copiar logs */}
      <div className="hidden sm:block absolute bottom-3 left-3 z-20 pointer-events-auto">
        <div className="relative bg-zinc-950/85 backdrop-blur-md border border-emerald-900/50 px-2.5 py-1.5 font-mono">
          <span className="absolute -top-px -left-px w-2 h-2 border-t border-l border-emerald-400" />
          <span className="absolute -top-px -right-px w-2 h-2 border-t border-r border-emerald-400" />
          <span className="absolute -bottom-px -left-px w-2 h-2 border-b border-l border-emerald-400" />
          <span className="absolute -bottom-px -right-px w-2 h-2 border-b border-r border-emerald-400" />
          <div className="flex items-center gap-2.5 text-[9px] uppercase tracking-wider">
            <div className="flex items-center gap-1 text-emerald-300">
              <Activity className="h-3 w-3" />
              <span className="tabular-nums">{fps}</span>
              <span className="text-zinc-500">fps</span>
            </div>
            <div className="text-zinc-400">
              <span className="text-zinc-500">N</span> <span className="text-emerald-300 tabular-nums">{graphData.nodes.length}</span>
            </div>
            <div className="text-zinc-400">
              <span className="text-zinc-500">E</span> <span className="text-cyan-300 tabular-nums">{graphData.links.length}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className={`h-1.5 w-1.5 rounded-full transition-colors ${flareActive ? "bg-amber-300 shadow-[0_0_6px_2px_rgba(252,211,77,0.7)]" : "bg-zinc-700"}`} />
              <span className={flareActive ? "text-amber-300" : "text-zinc-500"}>flare</span>
            </div>
            <button
              onClick={handleCopyLogs}
              className="flex items-center gap-1 px-1.5 py-0.5 border border-emerald-900/50 hover:border-emerald-500/70 text-emerald-300 hover:text-emerald-200 transition-colors"
              title="Copiar últimos 200 logs do console"
            >
              <ClipboardCopy className="h-3 w-3" />
              Logs
            </button>
          </div>
        </div>
      </div>

      {/* Legenda inferior */}
      <div className="hidden sm:block absolute bottom-3 left-1/2 -translate-x-1/2 z-10">
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
