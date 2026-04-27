import { useEffect, useMemo, useState, useCallback } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
} from "reactflow";
import dagre from "dagre";
import "reactflow/dist/style.css";
import { useQueries } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { scoreColor, formatBRL, tierFromScore, tierHslColor } from "@/lib/equityBrain";
import { Loader2 } from "lucide-react";

const NODE_W = 220;
const NODE_H = 80;
const THESIS_W = 160;
const THESIS_H = 50;

interface DealGraphProps {
  filterThesisKey?: string | null;
  filterBuyerId?: string | null;
  filterUfs?: string[];
}

// ---------- Custom Nodes ----------
function CompanyNode({ data, selected }: NodeProps<any>) {
  const dim = data.dimmed && !selected;
  const tier = tierFromScore(data.ma_score);
  return (
    <div
      className="rounded-lg border bg-zinc-900 transition-opacity"
      style={{
        width: NODE_W,
        opacity: dim ? 0.18 : 1,
        borderColor: tierHslColor(tier),
      }}
    >
      <Handle type="source" position={Position.Right} style={{ background: "#52525b" }} />
      <div className="px-3 py-2">
        <div className="text-zinc-100 text-xs font-semibold truncate" title={data.label}>
          {data.label}
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <span className={`text-[11px] font-bold ${scoreColor(data.ma_score)}`}>
            {Math.round(data.ma_score)}
          </span>
          <span className="text-[10px] text-zinc-500 truncate">{data.setor ?? "—"}</span>
        </div>
      </div>
    </div>
  );
}

function ThesisNode({ data, selected }: NodeProps<any>) {
  const dim = data.dimmed && !selected;
  return (
    <div
      className="rounded-full border border-emerald-900/60 bg-emerald-950/40 transition-opacity flex items-center justify-center"
      style={{ width: THESIS_W, height: THESIS_H, opacity: dim ? 0.18 : 1 }}
    >
      <Handle type="target" position={Position.Left} style={{ background: "#10b981" }} />
      <Handle type="source" position={Position.Right} style={{ background: "#10b981" }} />
      <div className="px-3 text-center">
        <div className="text-emerald-300 text-[11px] font-mono font-bold truncate">{data.label}</div>
        <div className="text-emerald-500/80 text-[9px] truncate">{data.display_name}</div>
      </div>
    </div>
  );
}

function BuyerNode({ data, selected }: NodeProps<any>) {
  const dim = data.dimmed && !selected;
  return (
    <div
      className="rounded-lg border border-zinc-800 bg-zinc-900 transition-opacity"
      style={{ width: NODE_W, opacity: dim ? 0.18 : 1 }}
    >
      <Handle type="target" position={Position.Left} style={{ background: "#52525b" }} />
      <div className="px-3 py-2">
        <div className="text-zinc-100 text-xs font-semibold truncate">{data.label}</div>
        <div className="flex items-center justify-between mt-1.5 gap-2">
          <span className="text-[10px] text-blue-400 uppercase">{data.tipo ?? "—"}</span>
          <span className="text-[10px] text-zinc-500 truncate">{data.ticket}</span>
        </div>
      </div>
    </div>
  );
}

const nodeTypes = { company: CompanyNode, thesis: ThesisNode, buyer: BuyerNode };

// ---------- Layout (dagre) ----------
function layoutGraph(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "LR", nodesep: 18, ranksep: 120 });
  g.setDefaultEdgeLabel(() => ({}));

  nodes.forEach((n) => {
    const w = n.type === "thesis" ? THESIS_W : NODE_W;
    const h = n.type === "thesis" ? THESIS_H : NODE_H;
    g.setNode(n.id, { width: w, height: h });
  });
  edges.forEach((e) => g.setEdge(e.source, e.target));

  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    const w = n.type === "thesis" ? THESIS_W : NODE_W;
    const h = n.type === "thesis" ? THESIS_H : NODE_H;
    return { ...n, position: { x: pos.x - w / 2, y: pos.y - h / 2 } };
  });
}

// ---------- Component ----------
export function DealGraph({ filterThesisKey, filterBuyerId, filterUfs }: DealGraphProps) {
  const [highlight, setHighlight] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const queries = useQueries({
    queries: [
      {
        queryKey: ["graph", "companies", filterUfs],
        queryFn: async () => {
          let q = supabase
            .schema("equity_brain" as any)
            .from("opportunities_ready" as any)
            .select("cnpj, razao_social, uf, setor_ma, ma_score")
            .order("ma_score", { ascending: false })
            .limit(50);
          if (filterUfs?.length) q = q.in("uf", filterUfs);
          const { data, error } = await q;
          if (error) throw error;
          return data as any[];
        },
      },
      {
        queryKey: ["graph", "theses"],
        queryFn: async () => {
          const { data, error } = await supabase
            .schema("equity_brain" as any)
            .from("investment_theses" as any)
            .select("thesis_key, display_name, category, active")
            .eq("active", true);
          if (error) throw error;
          return data as any[];
        },
      },
      {
        queryKey: ["graph", "buyers"],
        queryFn: async () => {
          const { data, error } = await supabase
            .schema("equity_brain" as any)
            .from("buyers" as any)
            .select("id, nome, tipo, ticket_min, ticket_max")
            .limit(30);
          if (error) throw error;
          return data as any[];
        },
      },
      {
        queryKey: ["graph", "buyer-theses"],
        queryFn: async () => {
          const { data, error } = await supabase
            .schema("equity_brain" as any)
            .from("buyer_theses" as any)
            .select("buyer_id, thesis_key, prioridade, active")
            .eq("active", true);
          if (error) throw error;
          return data as any[];
        },
      },
      {
        queryKey: ["graph", "matches"],
        queryFn: async () => {
          const { data, error } = await supabase
            .schema("equity_brain" as any)
            .from("matches" as any)
            .select("cnpj, buyer_id, thesis_key, match_score, is_current")
            .eq("is_current", true)
            .order("match_score", { ascending: false })
            .limit(150);
          if (error) throw error;
          return data as any[];
        },
      },
    ],
  });

  const [companiesQ, thesesQ, buyersQ, buyerThesesQ, matchesQ] = queries;
  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);

  const { nodes, edges } = useMemo(() => {
    if (!companiesQ.data || !thesesQ.data || !buyersQ.data || !matchesQ.data || !buyerThesesQ.data) {
      return { nodes: [] as Node[], edges: [] as Edge[] };
    }

    const matches = matchesQ.data;
    const buyerThesesData = buyerThesesQ.data;

    // 1. Quais CNPJs e buyers aparecem? Aplica filtros.
    const companyIds = new Set<string>(
      companiesQ.data.map((c: any) => c.cnpj),
    );
    const buyerIds = new Set<string>(buyersQ.data.map((b: any) => b.id));
    const thesisKeys = new Set<string>(thesesQ.data.map((t: any) => t.thesis_key));

    if (filterBuyerId) {
      // Mantemos só edges relevantes ao buyer escolhido
    }

    // 2. Edges empresa → tese (top thesis_key por cnpj via matches)
    const companyTopThesis = new Map<string, string>(); // cnpj -> thesis_key
    for (const m of matches) {
      if (!companyIds.has(m.cnpj)) continue;
      if (!thesisKeys.has(m.thesis_key)) continue;
      if (!companyTopThesis.has(m.cnpj)) companyTopThesis.set(m.cnpj, m.thesis_key);
    }

    // 3. Edges tese → buyer (de buyer_theses)
    const thesisBuyerEdges: Array<[string, string]> = [];
    for (const bt of buyerThesesData) {
      if (!buyerIds.has(bt.buyer_id) || !thesisKeys.has(bt.thesis_key)) continue;
      if (filterThesisKey && bt.thesis_key !== filterThesisKey) continue;
      if (filterBuyerId && bt.buyer_id !== filterBuyerId) continue;
      thesisBuyerEdges.push([bt.thesis_key, bt.buyer_id]);
    }

    // Apenas teses/buyers que têm conexão
    const usedTheses = new Set<string>([
      ...Array.from(companyTopThesis.values()),
      ...thesisBuyerEdges.map(([t]) => t),
    ]);
    const usedBuyers = new Set<string>(thesisBuyerEdges.map(([, b]) => b));

    // Direct matches empresa -> buyer (top 100 dos 150 carregados)
    const directEdges = matches
      .filter((m: any) => companyIds.has(m.cnpj) && buyerIds.has(m.buyer_id))
      .slice(0, 100);

    if (filterBuyerId) {
      directEdges.forEach((m: any) => {
        if (m.buyer_id === filterBuyerId) usedBuyers.add(m.buyer_id);
      });
    }

    // 4. Build nodes
    const ns: Node[] = [];
    companiesQ.data.forEach((c: any) => {
      ns.push({
        id: `c:${c.cnpj}`,
        type: "company",
        position: { x: 0, y: 0 },
        data: { label: c.razao_social ?? c.cnpj, ma_score: c.ma_score, setor: c.setor_ma },
      });
    });
    thesesQ.data.forEach((t: any) => {
      if (!usedTheses.has(t.thesis_key)) return;
      if (filterThesisKey && t.thesis_key !== filterThesisKey) return;
      ns.push({
        id: `t:${t.thesis_key}`,
        type: "thesis",
        position: { x: 0, y: 0 },
        data: { label: t.thesis_key, display_name: t.display_name },
      });
    });
    buyersQ.data.forEach((b: any) => {
      if (!usedBuyers.has(b.id)) return;
      const ticket =
        b.ticket_min || b.ticket_max
          ? `${formatBRL(b.ticket_min)}—${formatBRL(b.ticket_max)}`
          : "—";
      ns.push({
        id: `b:${b.id}`,
        type: "buyer",
        position: { x: 0, y: 0 },
        data: { label: b.nome, tipo: b.tipo, ticket },
      });
    });

    // 5. Build edges
    const es: Edge[] = [];
    companyTopThesis.forEach((thesisKey, cnpj) => {
      if (filterThesisKey && thesisKey !== filterThesisKey) return;
      es.push({
        id: `e:${cnpj}-${thesisKey}`,
        source: `c:${cnpj}`,
        target: `t:${thesisKey}`,
        animated: true,
        style: { stroke: "#52525b", strokeWidth: 1 },
      });
    });
    thesisBuyerEdges.forEach(([thesisKey, buyerId]) => {
      es.push({
        id: `e:${thesisKey}-${buyerId}`,
        source: `t:${thesisKey}`,
        target: `b:${buyerId}`,
        style: { stroke: "#10b981", strokeWidth: 2 },
      });
    });
    directEdges.forEach((m: any) => {
      const score = Number(m.match_score ?? 0);
      const stroke = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#71717a";
      es.push({
        id: `e:direct-${m.cnpj}-${m.buyer_id}`,
        source: `c:${m.cnpj}`,
        target: `b:${m.buyer_id}`,
        type: "default",
        style: { stroke, strokeWidth: 1, opacity: 0.55, strokeDasharray: "4 3" },
      });
    });

    // 6. Highlight: dim non-connected
    if (highlight) {
      const connected = new Set<string>([highlight]);
      es.forEach((e) => {
        if (e.source === highlight || e.target === highlight) {
          connected.add(e.source);
          connected.add(e.target);
        }
      });
      ns.forEach((n) => {
        if (!connected.has(n.id)) n.data = { ...n.data, dimmed: true };
      });
      es.forEach((e) => {
        if (!connected.has(e.source) || !connected.has(e.target)) {
          e.style = { ...e.style, opacity: 0.08 };
        }
      });
    }

    return { nodes: layoutGraph(ns, es), edges: es };
  }, [
    companiesQ.data,
    thesesQ.data,
    buyersQ.data,
    buyerThesesQ.data,
    matchesQ.data,
    highlight,
    filterThesisKey,
    filterBuyerId,
  ]);

  const handleNodeClick = useCallback((_: any, node: Node) => {
    setHighlight((cur) => (cur === node.id ? null : node.id));
  }, []);

  if (isMobile) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-zinc-950 p-8">
        <div className="text-center max-w-sm">
          <div className="text-emerald-400 text-4xl mb-3">🧠</div>
          <h2 className="text-zinc-100 font-bold text-lg mb-2">Grafo disponível apenas no desktop</h2>
          <p className="text-zinc-500 text-sm">
            A visualização das conexões entre empresas, teses e buyers exige uma tela maior. Acesse de um computador.
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
    <div className="w-full h-full bg-zinc-950 relative">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950/80">
          <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        onPaneClick={() => setHighlight(null)}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.2}
        maxZoom={2}
        onlyRenderVisibleElements
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#27272a" gap={24} />
        <Controls className="!bg-zinc-900 !border-zinc-800" showInteractive={false} />
        <MiniMap
          nodeColor={(n) =>
            n.type === "company" ? "#10b981" : n.type === "thesis" ? "#34d399" : "#3b82f6"
          }
          maskColor="rgba(0,0,0,0.6)"
          style={{ background: "#18181b", border: "1px solid #27272a" }}
        />
      </ReactFlow>
    </div>
  );
}
