/**
 * Equity Graph Scoring — fórmulas de peso e confidence das edges estratégicas.
 * Pesos expostos para tuning futuro sem precisar mexer no builder.
 */

export const SCORE_WEIGHTS = {
  strategic_fit: 0.25,
  revenue_synergy: 0.20,
  cost_synergy: 0.15,
  financial_capacity: 0.15,
  execution_ease: 0.10,
  deal_urgency: 0.10,
  valuation_arbitrage: 0.05,
} as const;

export type ScoreBreakdown = {
  strategic_fit: number;
  revenue_synergy: number;
  cost_synergy: number;
  financial_capacity: number;
  execution_ease: number;
  deal_urgency: number;
  valuation_arbitrage: number;
};

export function computeFinalWeight(s: Partial<ScoreBreakdown>): number {
  let total = 0;
  for (const [k, w] of Object.entries(SCORE_WEIGHTS)) {
    total += (s[k as keyof ScoreBreakdown] ?? 0) * w;
  }
  return Math.max(0, Math.min(1, total));
}

/** Confidence cresce conforme mais sinais existirem (não-zeros). */
export function computeConfidence(s: Partial<ScoreBreakdown>): number {
  const filled = Object.values(s).filter((v) => v != null && v > 0).length;
  return Math.min(1, 0.4 + filled * 0.1);
}

// ---------- Edge type → cor (HSL) ----------
export const EDGE_COLORS: Record<string, string> = {
  buyer_acquires_seller: "hsl(210, 100%, 62%)",   // azul Jarvis — consolidador estratégico
  seller_acquires_seller: "hsl(45, 100%, 55%)",   // ouro real reluzente — roll-up seller↔seller
  seller_merges_with_seller: "hsl(43, 100%, 52%)", // ouro intenso — fusão seller↔seller
  buyer_funds_seller: "hsl(217, 91%, 60%)",       // blue — capital
  platform_addon: "hsl(220, 95%, 65%)",           // azul-violeta — consolidação plataforma
  strategic_synergy: "hsl(330, 81%, 60%)",        // pink — sinergia
  cross_sell: "hsl(190, 90%, 55%)",               // cyan — cross-sell
  cost_synergy: "hsl(15, 90%, 55%)",              // orange — custo
  geographic_expansion: "hsl(140, 70%, 55%)",     // green — geo
  tech_stack_match: "hsl(195, 85%, 60%)",         // sky — tech
  channel_synergy: "hsl(260, 75%, 65%)",          // violet — canal
  valuation_arbitrage: "hsl(345, 90%, 60%)",      // rose — arbitragem
  capital_match: "hsl(225, 85%, 65%)",            // indigo — capital match
  thesis_fit: "hsl(170, 75%, 50%)",               // teal — tese
};

// ---------- Edge type → label PT-BR ----------
export const EDGE_LABELS: Record<string, string> = {
  buyer_acquires_seller: "Buyer adquire Seller",
  seller_acquires_seller: "Roll-up Seller→Seller",
  seller_merges_with_seller: "Fusão Seller↔Seller",
  buyer_funds_seller: "Capital (Funding)",
  platform_addon: "Add-on de Plataforma",
  strategic_synergy: "Sinergia Estratégica",
  cross_sell: "Cross-sell",
  cost_synergy: "Sinergia de Custo",
  geographic_expansion: "Expansão Geográfica",
  tech_stack_match: "Match Tecnológico",
  channel_synergy: "Sinergia de Canal",
  valuation_arbitrage: "Arbitragem de Valuation",
  capital_match: "Capital Match",
  thesis_fit: "Fit com Tese",
};

// ---------- Layers (agrupamento de edge_types) ----------
export const EDGE_LAYERS = {
  ma_direct: {
    label: "M&A Direto",
    icon: "🎯",
    types: ["buyer_acquires_seller"],
  },
  rollup: {
    label: "Roll-up Seller→Seller",
    icon: "🔄",
    types: ["seller_acquires_seller", "seller_merges_with_seller", "platform_addon"],
  },
  operational: {
    label: "Sinergia Operacional",
    icon: "⚙️",
    types: ["cost_synergy", "tech_stack_match"],
  },
  commercial: {
    label: "Sinergia Comercial",
    icon: "💼",
    types: ["cross_sell", "channel_synergy", "strategic_synergy"],
  },
  arbitrage: {
    label: "Arbitragem de Valuation",
    icon: "💸",
    types: ["valuation_arbitrage"],
  },
  capital: {
    label: "Capital / Funding",
    icon: "💰",
    types: ["buyer_funds_seller", "capital_match"],
  },
  thesis: {
    label: "Fit com Tese",
    icon: "🧠",
    types: ["thesis_fit", "geographic_expansion"],
  },
} as const;

export type LayerKey = keyof typeof EDGE_LAYERS;

// ---------- Node type → cor base ----------
export const NODE_COLORS: Record<string, string> = {
  seller: "hsl(160, 84%, 45%)",          // emerald
  buyer_strategic: "hsl(190, 90%, 55%)", // cyan
  buyer_financial: "hsl(217, 91%, 60%)", // blue
  thesis: "hsl(280, 65%, 60%)",          // violet
  platform: "hsl(38, 92%, 55%)",         // amber
  asset: "hsl(240, 5%, 65%)",            // zinc
  strategy: "hsl(345, 90%, 60%)",        // rose
};

export const NODE_LABELS: Record<string, string> = {
  seller: "Seller",
  buyer_strategic: "Buyer Estratégico",
  buyer_financial: "Buyer Financeiro",
  thesis: "Tese",
  platform: "Plataforma",
  asset: "Ativo",
  strategy: "Estratégia",
};
