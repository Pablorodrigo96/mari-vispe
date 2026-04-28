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
  seller_acquires_seller: "Possível Fusão (PME ↔ PME)",
  seller_merges_with_seller: "Fusão Estratégica (mesmo porte)",
  buyer_funds_seller: "Capital (Funding)",
  platform_addon: "Add-on → Consolidador",
  strategic_synergy: "Sinergia Estratégica",
  cross_sell: "Cross-sell (mesmo cliente)",
  cost_synergy: "Sinergia de Custo",
  geographic_expansion: "Expansão Geográfica",
  tech_stack_match: "Match Tecnológico",
  channel_synergy: "Sinergia de Canal",
  valuation_arbitrage: "Arbitragem de Valuation",
  capital_match: "Capital Match",
  thesis_fit: "Fit com Tese",
};

// ---------- Edge type → descrição prática (1 linha acionável) ----------
export const EDGE_DESCRIPTIONS: Record<string, string> = {
  buyer_acquires_seller: "Comprador estratégico ou financeiro com tese e ticket compatíveis para adquirir essa empresa.",
  seller_acquires_seller: "Duas PMEs que valem mais juntas que separadas — uma compra a outra para crescer (roll-up).",
  seller_merges_with_seller: "Empresas de porte parecido se fundem em uma só — divisão de equity entre os sócios.",
  buyer_funds_seller: "Investidor injeta capital (dívida ou equity) sem comprar o controle — funding para crescer.",
  platform_addon: "Empresa menor é absorvida por uma maior consolidadora da mesma vertical (add-on).",
  strategic_synergy: "Combinação que destrava valor para os dois lados (operacional + comercial + tecnológico).",
  cross_sell: "Vendem para o mesmo perfil de cliente (mesmo ICP) — uma pode oferecer o produto da outra.",
  cost_synergy: "Compartilham fornecedores, infra ou backoffice — fusão reduz custo unitário de ambos.",
  geographic_expansion: "Uma já opera onde a outra quer entrar — atalho para nova praça.",
  tech_stack_match: "Mesma stack ou tecnologia complementar — integração rápida e baixa fricção pós-deal.",
  channel_synergy: "Mesmo canal de distribuição (B2B distribuidor, varejo, e-commerce) — escala comercial.",
  valuation_arbitrage: "Empresa boa precificada baixo do mercado — janela de compra antes da concorrência.",
  capital_match: "Provedor de capital com tese, ticket e setor exatamente compatíveis com a necessidade.",
  thesis_fit: "Empresa encaixa no critério de uma tese ativa de investimento (sinais + métricas).",
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
