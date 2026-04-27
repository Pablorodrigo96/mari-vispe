/**
 * Constrói o grafo estratégico cruzando companies × buyers × theses do Equity Brain.
 * Saída: { nodes, edges } pronto para react-force-graph-2d.
 *
 * Toda lógica é client-side (sem migrations) e memoizável por hash dos inputs.
 */

import { computeFinalWeight, computeConfidence, type ScoreBreakdown } from "./equityGraphScoring";

// ---------- Tipos ----------
export type NodeType =
  | "seller"
  | "buyer_strategic"
  | "buyer_financial"
  | "thesis"
  | "platform"
  | "asset"
  | "strategy";

export type EdgeType =
  | "buyer_acquires_seller"
  | "seller_acquires_seller"
  | "seller_merges_with_seller"
  | "buyer_funds_seller"
  | "platform_addon"
  | "strategic_synergy"
  | "cross_sell"
  | "cost_synergy"
  | "geographic_expansion"
  | "tech_stack_match"
  | "channel_synergy"
  | "valuation_arbitrage"
  | "capital_match"
  | "thesis_fit";

export interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  vertical?: string | null;
  uf?: string | null;
  municipio?: string | null;
  valuation_band?: string | null;
  strategic_score: number; // 0-100
  opportunity_stage?: string | null;
  metadata: Record<string, any>;
  // d3-force populates these:
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  edge_type: EdgeType;
  strategy: string;
  weight: number;
  confidence: number;
  explanation: string;
  scores: Partial<ScoreBreakdown> & Record<string, number>;
}

// ---------- Inputs vindos do Supabase ----------
export interface RawCompany {
  cnpj: string;
  razao_social?: string | null;
  nome_fantasia?: string | null;
  setor_ma?: string | null;
  uf?: string | null;
  municipio?: string | null;
  faturamento_estimado?: number | null;
  ebitda_estimado?: number | null;
  funcionarios_estimado?: number | null;
  ma_score?: number | null;
  cnae_descricao?: string | null;
  has_listing?: boolean | null;
  listing_id?: string | null;
}

export interface RawBuyer {
  id: string;
  nome: string;
  tipo?: string | null; // 'strategic' | 'pe' | 'vc' | 'family_office' | etc.
  ticket_min?: number | null;
  ticket_max?: number | null;
  setores_interesse?: string[] | null;
  ufs_interesse?: string[] | null;
  sinergias_chave?: string[] | null;
  deals_realizados?: number | null;
  prioridade_global?: number | null;
  vertical_principal?: string | null;
}

export interface RawThesis {
  thesis_key: string;
  display_name: string;
  category?: string | null;
  description?: string | null;
  required_signals?: string[] | null;
  active?: boolean;
}

export interface RawBuyerThesis {
  buyer_id: string;
  thesis_key: string;
  prioridade?: number | null;
  active?: boolean;
}

export interface RawMatch {
  cnpj: string;
  buyer_id: string;
  thesis_key: string;
  match_score?: number | null;
  setor_fit?: number | null;
  geografia_fit?: number | null;
  porte_fit?: number | null;
  tese_fit?: number | null;
  is_current?: boolean;
}

export interface BuilderInputs {
  companies: RawCompany[];
  buyers: RawBuyer[];
  theses: RawThesis[];
  buyerTheses: RawBuyerThesis[];
  matches: RawMatch[];
}

export interface BuildOptions {
  maxNodes?: number;          // default 400
  minWeight?: number;         // default 0.0
  minConfidence?: number;     // default 0.0
  enabledEdgeTypes?: Set<EdgeType>;
  ufFilter?: Set<string>;
  verticalFilter?: Set<string>;
  thesisFilter?: string | null;
  buyerFilter?: string | null;
}

// ---------- Helpers ----------
function valuationBand(rev?: number | null): string {
  if (!rev || rev <= 0) return "—";
  if (rev >= 50_000_000) return "R$50M+";
  if (rev >= 10_000_000) return "R$10–50M";
  if (rev >= 5_000_000) return "R$5–10M";
  if (rev >= 1_000_000) return "R$1–5M";
  return "<R$1M";
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function intersect<T>(a?: T[] | null, b?: T[] | null): T[] {
  if (!a || !b) return [];
  const setB = new Set(b);
  return a.filter((x) => setB.has(x));
}

const ASSET_KEYWORDS = [
  "Base de clientes", "Licença ANATEL", "Canal indireto",
  "ERP próprio", "Tecnologia proprietária", "Time comercial",
  "Marca consolidada", "Operação 24/7",
];

// ---------- Main ----------
export function buildStrategicGraph(
  inputs: BuilderInputs,
  options: BuildOptions = {},
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const {
    maxNodes = 400,
    minWeight = 0,
    minConfidence = 0,
    enabledEdgeTypes,
    ufFilter,
    verticalFilter,
    thesisFilter,
    buyerFilter,
  } = options;

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const nodeIndex = new Map<string, GraphNode>();

  const addNode = (n: GraphNode) => {
    if (nodeIndex.has(n.id)) return;
    nodeIndex.set(n.id, n);
    nodes.push(n);
  };

  // ---------- Filtrar inputs ----------
  let companies = inputs.companies;
  if (ufFilter?.size) companies = companies.filter((c) => c.uf && ufFilter.has(c.uf));
  if (verticalFilter?.size) companies = companies.filter((c) => c.setor_ma && verticalFilter.has(c.setor_ma));

  let buyers = inputs.buyers;
  if (buyerFilter) buyers = buyers.filter((b) => b.id === buyerFilter);

  let theses = inputs.theses;
  if (thesisFilter) theses = theses.filter((t) => t.thesis_key === thesisFilter);

  // ---------- 1. Sellers ----------
  for (const c of companies.slice(0, maxNodes - 100)) {
    addNode({
      id: `seller:${c.cnpj}`,
      label: c.nome_fantasia || c.razao_social || c.cnpj,
      type: "seller",
      vertical: c.setor_ma,
      uf: c.uf,
      municipio: c.municipio,
      valuation_band: valuationBand(c.faturamento_estimado),
      strategic_score: Number(c.ma_score ?? 0),
      opportunity_stage: c.has_listing ? "listed" : "prospect",
      metadata: {
        cnpj: c.cnpj,
        faturamento: c.faturamento_estimado,
        ebitda: c.ebitda_estimado,
        funcionarios: c.funcionarios_estimado,
        cnae: c.cnae_descricao,
        listing_id: c.listing_id,
      },
    });
  }

  // ---------- 2. Buyers ----------
  for (const b of buyers) {
    const isFinancial = ["pe", "vc", "family_office", "fund", "financial"].includes(
      String(b.tipo ?? "").toLowerCase(),
    );
    addNode({
      id: `buyer:${b.id}`,
      label: b.nome,
      type: isFinancial ? "buyer_financial" : "buyer_strategic",
      vertical: b.vertical_principal,
      strategic_score: Math.min(
        100,
        (b.deals_realizados ?? 0) * 10 + (b.prioridade_global ?? 0) * 20,
      ),
      metadata: {
        ticket_min: b.ticket_min,
        ticket_max: b.ticket_max,
        setores: b.setores_interesse,
        ufs: b.ufs_interesse,
        sinergias: b.sinergias_chave,
        deals: b.deals_realizados,
        tipo: b.tipo,
      },
    });
  }

  // ---------- 3. Theses ----------
  for (const t of theses) {
    addNode({
      id: `thesis:${t.thesis_key}`,
      label: t.display_name,
      type: "thesis",
      strategic_score: 70,
      metadata: {
        thesis_key: t.thesis_key,
        category: t.category,
        description: t.description,
        required_signals: t.required_signals,
      },
    });
  }

  // ---------- 4. Platforms (buyers strategic com >=3 deals na mesma vertical) ----------
  const platformBuyers = inputs.buyers.filter(
    (b) => (b.deals_realizados ?? 0) >= 3 && b.vertical_principal,
  );
  for (const p of platformBuyers) {
    addNode({
      id: `platform:${p.id}`,
      label: `Plataforma ${p.nome}`,
      type: "platform",
      vertical: p.vertical_principal,
      strategic_score: Math.min(100, (p.deals_realizados ?? 0) * 8 + 40),
      metadata: { buyer_id: p.id, vertical: p.vertical_principal, deals: p.deals_realizados },
    });
  }

  // ---------- 5. Assets (derivados de sinergias_chave + cnae) ----------
  const assetMap = new Map<string, { count: number; refs: string[] }>();
  for (const b of inputs.buyers) {
    for (const s of b.sinergias_chave ?? []) {
      const key = s.trim();
      if (!key) continue;
      const cur = assetMap.get(key) ?? { count: 0, refs: [] };
      cur.count += 1;
      cur.refs.push(`buyer:${b.id}`);
      assetMap.set(key, cur);
    }
  }
  // assets only get added if mentioned by 2+ buyers (concentração relevante)
  for (const [name, info] of assetMap.entries()) {
    if (info.count < 2) continue;
    addNode({
      id: `asset:${name}`,
      label: name,
      type: "asset",
      strategic_score: Math.min(100, info.count * 15),
      metadata: { mentions: info.count, refs: info.refs },
    });
  }

  // ---------- 6. Strategies (a partir de theses.category) ----------
  const strategyMap = new Map<string, number>();
  for (const t of inputs.theses) {
    if (!t.category) continue;
    strategyMap.set(t.category, (strategyMap.get(t.category) ?? 0) + 1);
  }
  for (const [cat, count] of strategyMap.entries()) {
    addNode({
      id: `strategy:${cat}`,
      label: cat,
      type: "strategy",
      strategic_score: Math.min(100, count * 12 + 30),
      metadata: { category: cat, theses_count: count },
    });
  }

  // =======================================================
  // EDGES
  // =======================================================
  const pushEdge = (e: Omit<GraphEdge, "weight" | "confidence" | "id"> & {
    scores: Partial<ScoreBreakdown> & Record<string, number>;
  }) => {
    const w = computeFinalWeight(e.scores);
    const conf = computeConfidence(e.scores);
    if (w < minWeight || conf < minConfidence) return;
    if (enabledEdgeTypes && !enabledEdgeTypes.has(e.edge_type)) return;
    if (!nodeIndex.has(e.source) || !nodeIndex.has(e.target)) return;
    edges.push({
      ...e,
      id: `${e.edge_type}:${e.source}->${e.target}`,
      weight: w,
      confidence: conf,
    });
  };

  // ---------- (a) buyer_acquires_seller (do match table + heurística) ----------
  for (const m of inputs.matches) {
    if (!m.is_current) continue;
    const mScore = Number(m.match_score ?? 0) / 100;
    pushEdge({
      source: `buyer:${m.buyer_id}`,
      target: `seller:${m.cnpj}`,
      edge_type: "buyer_acquires_seller",
      strategy: "ma_direct",
      explanation: `Match score ${Math.round(Number(m.match_score ?? 0))} (setor ${Math.round(Number(m.setor_fit ?? 0) * 100)}% / geo ${Math.round(Number(m.geografia_fit ?? 0) * 100)}% / porte ${Math.round(Number(m.porte_fit ?? 0) * 100)}%).`,
      scores: {
        strategic_fit: clamp01(Number(m.tese_fit ?? mScore)),
        revenue_synergy: clamp01(Number(m.setor_fit ?? 0)),
        cost_synergy: clamp01(Number(m.geografia_fit ?? 0)),
        execution_ease: clamp01(Number(m.porte_fit ?? 0)),
        deal_urgency: 0.5,
      },
    });
  }

  // ---------- (b) Heurísticas para preencher quando matches estão vazios/curtos ----------
  // Cruzamento buyer × seller pelas listas de interesse do buyer
  for (const b of buyers) {
    const setores = new Set(b.setores_interesse ?? []);
    const ufs = new Set(b.ufs_interesse ?? []);
    if (!setores.size) continue;
    for (const c of companies) {
      if (!c.setor_ma || !setores.has(c.setor_ma)) continue;
      const sourceId = `buyer:${b.id}`;
      const targetId = `seller:${c.cnpj}`;
      if (!nodeIndex.has(sourceId) || !nodeIndex.has(targetId)) continue;

      const geoFit = ufs.size === 0 ? 0.5 : (c.uf && ufs.has(c.uf) ? 1 : 0.2);
      const ticketFit =
        b.ticket_min && b.ticket_max && c.faturamento_estimado
          ? c.faturamento_estimado >= b.ticket_min && c.faturamento_estimado <= b.ticket_max * 5
            ? 0.9
            : 0.4
          : 0.5;

      const isFinancial = ["pe", "vc", "family_office", "fund"].includes(
        String(b.tipo ?? "").toLowerCase(),
      );

      pushEdge({
        source: sourceId,
        target: targetId,
        edge_type: isFinancial ? "buyer_funds_seller" : "buyer_acquires_seller",
        strategy: isFinancial ? "capital_deploy" : "ma_direct",
        explanation: `${b.nome} declara interesse em ${c.setor_ma}${c.uf ? ` / ${c.uf}` : ""}. Ticket fit ${Math.round(ticketFit * 100)}%, geo fit ${Math.round(geoFit * 100)}%.`,
        scores: {
          strategic_fit: 0.7,
          revenue_synergy: 0.6,
          cost_synergy: geoFit * 0.7,
          financial_capacity: ticketFit,
          execution_ease: geoFit,
          deal_urgency: c.has_listing ? 0.8 : 0.4,
        },
      });

      // Capital match adicional para buyers financeiros
      if (isFinancial && ticketFit > 0.6) {
        pushEdge({
          source: sourceId,
          target: targetId,
          edge_type: "capital_match",
          strategy: "capital_deploy",
          explanation: `Ticket alvo ${b.ticket_min?.toLocaleString("pt-BR")}–${b.ticket_max?.toLocaleString("pt-BR")} BRL casa com receita estimada de ${c.faturamento_estimado?.toLocaleString("pt-BR")} BRL.`,
          scores: { financial_capacity: ticketFit, strategic_fit: 0.5 },
        });
      }
    }
  }

  // ---------- (c) seller_acquires_seller / seller_merges_with_seller ----------
  // Cruza pares de sellers da mesma vertical/UF
  const sellerNodes = nodes.filter((n) => n.type === "seller");
  for (let i = 0; i < sellerNodes.length; i++) {
    for (let j = i + 1; j < sellerNodes.length; j++) {
      const a = sellerNodes[i];
      const b = sellerNodes[j];
      if (!a.vertical || a.vertical !== b.vertical) continue;
      const sameUf = a.uf && a.uf === b.uf;
      const revA = Number(a.metadata.faturamento ?? 0);
      const revB = Number(b.metadata.faturamento ?? 0);
      if (!revA || !revB) continue;

      const ratio = Math.max(revA, revB) / Math.min(revA, revB);
      if (ratio >= 3) {
        // roll-up — o maior compra o menor
        const acquirer = revA > revB ? a : b;
        const target = revA > revB ? b : a;
        pushEdge({
          source: acquirer.id,
          target: target.id,
          edge_type: "seller_acquires_seller",
          strategy: "rollup_regional",
          explanation: `${acquirer.label} (R$${(Math.max(revA, revB) / 1e6).toFixed(1)}M) é ${ratio.toFixed(1)}x maior que ${target.label} — mesma vertical${sameUf ? " e UF" : ""}, candidato a roll-up.`,
          scores: {
            strategic_fit: 0.7,
            revenue_synergy: 0.65,
            cost_synergy: sameUf ? 0.85 : 0.4,
            financial_capacity: 0.6,
            execution_ease: sameUf ? 0.8 : 0.5,
            valuation_arbitrage: 0.5,
          },
        });
      } else if (ratio < 1.4 && sameUf) {
        // Fusão entre similares
        pushEdge({
          source: a.id,
          target: b.id,
          edge_type: "seller_merges_with_seller",
          strategy: "merger",
          explanation: `Receitas comparáveis (${(revA / 1e6).toFixed(1)}M × ${(revB / 1e6).toFixed(1)}M), mesma vertical e UF — candidato a fusão entre iguais.`,
          scores: {
            strategic_fit: 0.65,
            revenue_synergy: 0.7,
            cost_synergy: 0.85,
            execution_ease: 0.7,
          },
        });
      }

      // cost_synergy sempre que mesma vertical + mesma UF
      if (sameUf) {
        pushEdge({
          source: a.id,
          target: b.id,
          edge_type: "cost_synergy",
          strategy: "cost_optimization",
          explanation: `Mesma vertical (${a.vertical}) e mesma UF (${a.uf}) — overhead operacional compartilhável.`,
          scores: {
            cost_synergy: 0.8,
            execution_ease: 0.7,
            strategic_fit: 0.4,
          },
        });
      }
    }
  }

  // ---------- (d) thesis_fit ----------
  for (const t of theses) {
    const tNodeId = `thesis:${t.thesis_key}`;
    if (!nodeIndex.has(tNodeId)) continue;
    // thesis ↔ buyers via buyer_theses
    for (const bt of inputs.buyerTheses) {
      if (!bt.active || bt.thesis_key !== t.thesis_key) continue;
      const bId = `buyer:${bt.buyer_id}`;
      if (!nodeIndex.has(bId)) continue;
      const prio = clamp01((bt.prioridade ?? 1) / 5);
      pushEdge({
        source: tNodeId,
        target: bId,
        edge_type: "thesis_fit",
        strategy: "thesis_alignment",
        explanation: `Buyer alinhado à tese "${t.display_name}" com prioridade ${bt.prioridade ?? 1}.`,
        scores: { strategic_fit: 0.6 + prio * 0.4, deal_urgency: prio },
      });
    }
  }

  // ---------- (e) platform_addon ----------
  const platformNodes = nodes.filter((n) => n.type === "platform");
  for (const p of platformNodes) {
    if (!p.vertical) continue;
    for (const s of sellerNodes) {
      if (s.vertical !== p.vertical) continue;
      pushEdge({
        source: p.id,
        target: s.id,
        edge_type: "platform_addon",
        strategy: "buy_and_build",
        explanation: `${p.label} é plataforma consolidada em ${p.vertical} — ${s.label} pode ser adicionado como add-on.`,
        scores: {
          strategic_fit: 0.75,
          revenue_synergy: 0.6,
          cost_synergy: 0.7,
          execution_ease: 0.7,
        },
      });
    }
  }

  // ---------- (f) valuation_arbitrage (sellers com bom score sem listing ativo) ----------
  for (const s of sellerNodes) {
    if (s.opportunity_stage === "listed") continue;
    if (s.strategic_score < 60) continue;
    // Conecta com top thesis matching
    const t = theses[0];
    if (!t) break;
    const tNodeId = `thesis:${t.thesis_key}`;
    if (!nodeIndex.has(tNodeId)) continue;
    pushEdge({
      source: tNodeId,
      target: s.id,
      edge_type: "valuation_arbitrage",
      strategy: "undervalued",
      explanation: `${s.label} tem score ${s.strategic_score} mas não está listada — possível arbitragem de valuation.`,
      scores: {
        valuation_arbitrage: 0.85,
        strategic_fit: clamp01(s.strategic_score / 100),
        deal_urgency: 0.4,
      },
    });
  }

  // ---------- (g) strategic_synergy via assets ----------
  const assetNodes = nodes.filter((n) => n.type === "asset");
  for (const a of assetNodes) {
    const refs: string[] = a.metadata.refs ?? [];
    for (const r of refs) {
      if (!nodeIndex.has(r)) continue;
      pushEdge({
        source: a.id,
        target: r,
        edge_type: "strategic_synergy",
        strategy: "asset_share",
        explanation: `Compartilha o ativo estratégico "${a.label}".`,
        scores: { strategic_fit: 0.55, revenue_synergy: 0.4 },
      });
    }
  }

  // ---------- (h) geographic_expansion ----------
  for (const b of buyers) {
    const ufsHas = new Set(b.ufs_interesse ?? []);
    const ufsNotHas = new Set<string>();
    for (const c of companies) {
      if (c.uf && !ufsHas.has(c.uf)) ufsNotHas.add(c.uf);
    }
    // Conecta buyer a sellers em UFs onde ele AINDA NÃO declara interesse mas há vertical match
    for (const c of companies) {
      if (!c.uf || !c.setor_ma) continue;
      if (ufsHas.has(c.uf)) continue;
      const setores = new Set(b.setores_interesse ?? []);
      if (!setores.has(c.setor_ma)) continue;
      pushEdge({
        source: `buyer:${b.id}`,
        target: `seller:${c.cnpj}`,
        edge_type: "geographic_expansion",
        strategy: "geo_expansion",
        explanation: `${b.nome} ainda não atua em ${c.uf} — ${c.razao_social ?? c.cnpj} pode ser porta de entrada nessa UF.`,
        scores: {
          strategic_fit: 0.55,
          revenue_synergy: 0.5,
          execution_ease: 0.35,
          deal_urgency: 0.3,
        },
      });
    }
  }

  // ---------- Connect strategy nodes to thesis nodes ----------
  const strategyNodes = nodes.filter((n) => n.type === "strategy");
  for (const s of strategyNodes) {
    for (const t of theses) {
      if (t.category !== s.metadata.category) continue;
      const tId = `thesis:${t.thesis_key}`;
      if (!nodeIndex.has(tId)) continue;
      pushEdge({
        source: s.id,
        target: tId,
        edge_type: "thesis_fit",
        strategy: "strategy_grouping",
        explanation: `Tese "${t.display_name}" pertence à estratégia "${s.label}".`,
        scores: { strategic_fit: 0.6 },
      });
    }
  }

  return { nodes, edges };
}
