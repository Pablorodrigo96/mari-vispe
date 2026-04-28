/**
 * Portfolio Potential Scoring
 * --------------------------------
 * Para cada cliente (listing) da carteira do parceiro, calcula um score 0-100
 * de propensão para 5 serviços da Vispe e a receita esperada por serviço.
 *
 * As heurísticas são intencionalmente conservadoras e baseadas APENAS em
 * dados que já existem em `public.listings` (sem chamada extra).
 */

export interface PortfolioListing {
  id: string;
  title: string;
  category: string | null;
  asking_price: number | null;
  annual_revenue: number | null;
  annual_profit: number | null;
  equity_score: number | null;
  vdr_readiness: number | null;
}

export type ServiceKey = "cfo" | "ac" | "tributario" | "ma" | "capital";

export const SERVICE_META: Record<ServiceKey, {
  label: string;
  short: string;
  emoji: string;
  monthlyFee: number;          // BRL mensal recorrente
  oneOffSuccessFee?: (l: PortfolioListing) => number; // BRL one-off
  pitch: (l: PortfolioListing) => string;
}> = {
  cfo: {
    label: "CFO as a Service",
    short: "CFO",
    emoji: "📊",
    monthlyFee: 3000,
    pitch: (l) => `Olá! Notei que ${l.title} tem oportunidade de organizar a gestão financeira. Posso apresentar o serviço de CFO as a Service da Vispe?`,
  },
  ac: {
    label: "Aceleração Comercial",
    short: "AC",
    emoji: "🚀",
    monthlyFee: 5000,
    pitch: (l) => `Olá! ${l.title} tem porte para escalar vendas. Quer conhecer o programa de Aceleração Comercial da Vispe?`,
  },
  tributario: {
    label: "Consultoria Tributária",
    short: "Tributário",
    emoji: "⚖️",
    monthlyFee: 2000,
    pitch: (l) => `Olá! Identifiquei potencial de eficiência tributária em ${l.title}. Posso agendar uma análise gratuita?`,
  },
  ma: {
    label: "M&A (Sell-side)",
    short: "M&A",
    emoji: "💼",
    monthlyFee: 0, // só success fee
    oneOffSuccessFee: (l) => {
      const v = l.asking_price && l.asking_price > 0 ? l.asking_price : (l.annual_revenue ?? 0) * 1.5;
      return v * 0.05; // 5% success fee médio
    },
    pitch: (l) => `Olá! ${l.title} está pronta para o mercado de M&A. Quer conversar sobre estruturar a venda com a Vispe?`,
  },
  capital: {
    label: "Captação de Capital",
    short: "Capital",
    emoji: "💰",
    monthlyFee: 1500, // mandato de captação
    oneOffSuccessFee: (l) => {
      const v = (l.annual_revenue ?? 0) * 0.3; // 30% da receita = ticket médio de capital de giro
      return v * 0.01; // 1% success fee
    },
    pitch: (l) => `Olá! Posso apresentar opções de captação de dívida ou equity para ${l.title} via Vispe?`,
  },
};

/** Score 0-100 de propensão. */
export function scoreService(l: PortfolioListing, svc: ServiceKey): number {
  const rev = l.annual_revenue ?? 0;
  const score = l.equity_score ?? 0;
  const vdr = l.vdr_readiness ?? 0;

  switch (svc) {
    case "cfo": {
      // Empresas desorganizadas precisam de CFO.
      let s = 30;
      if (score < 60) s += 30;
      if (vdr < 50) s += 20;
      if (l.annual_profit == null || l.annual_profit === 0) s += 20;
      if (rev > 0 && rev < 1_000_000) s -= 20; // muito pequena, não tem budget
      if (rev > 30_000_000) s -= 10; // grande já tem CFO interno
      return clamp(s);
    }
    case "ac": {
      // Tem produto, falta crescer.
      let s = 20;
      if (rev >= 2_000_000 && rev <= 30_000_000) s += 40;
      if (score >= 50) s += 25;
      if (score >= 70) s += 15;
      if (rev < 1_000_000) s -= 30;
      return clamp(s);
    }
    case "tributario": {
      const heavySectors = ["industria", "saude", "varejo", "alimentos", "logistica", "industrial"];
      let s = 15;
      const cat = (l.category ?? "").toLowerCase();
      if (heavySectors.some((x) => cat.includes(x))) s += 35;
      if (rev >= 5_000_000) s += 30;
      if (rev >= 15_000_000) s += 15;
      if (rev < 2_000_000) s -= 20;
      return clamp(s);
    }
    case "ma": {
      // Pronto para vender.
      let s = 10;
      if (score >= 70) s += 35;
      if (vdr >= 70) s += 25;
      if (l.asking_price && l.asking_price > 0) s += 25;
      if (rev >= 5_000_000) s += 10;
      return clamp(s);
    }
    case "capital": {
      let s = 20;
      if (rev >= 3_000_000) s += 30;
      if (rev >= 10_000_000) s += 15;
      if (score >= 50) s += 20;
      if (l.asking_price && l.asking_price > 0) s -= 15; // já quer vender, não captar
      return clamp(s);
    }
  }
}

function clamp(n: number) { return Math.max(0, Math.min(100, Math.round(n))); }

export function scoreLevel(s: number): "alto" | "medio" | "baixo" {
  if (s >= 70) return "alto";
  if (s >= 40) return "medio";
  return "baixo";
}

/** Receita anual esperada por cliente para um serviço, ponderada pelo score. */
export function expectedAnnualRevenue(l: PortfolioListing, svc: ServiceKey): number {
  const meta = SERVICE_META[svc];
  const score = scoreService(l, svc);
  const probability = score / 100;
  const recurring = meta.monthlyFee * 12 * probability;
  const oneOff = (meta.oneOffSuccessFee?.(l) ?? 0) * probability;
  return recurring + oneOff;
}

export interface PortfolioAnalysis {
  total: number;                                // total de clientes
  byClient: Array<{
    listing: PortfolioListing;
    scores: Record<ServiceKey, number>;
    expectedRevenue: Record<ServiceKey, number>;
    totalExpectedRevenue: number;
    bestService: ServiceKey;
  }>;
  byService: Record<ServiceKey, { totalRevenue: number; hotClients: number }>;
  totalRecurring: number;       // soma de honorários recorrentes (CFO+AC+Tributário+Capital)
  totalSuccessFee: number;      // soma de fees one-off (M&A + Capital)
  totalRevenue: number;         // total geral
  topOpportunities: Array<{
    listing: PortfolioListing;
    service: ServiceKey;
    score: number;
    expectedRevenue: number;
  }>;
}

export function analyzePortfolio(listings: PortfolioListing[]): PortfolioAnalysis {
  const services: ServiceKey[] = ["cfo", "ac", "tributario", "ma", "capital"];
  const byService: PortfolioAnalysis["byService"] = {
    cfo: { totalRevenue: 0, hotClients: 0 },
    ac: { totalRevenue: 0, hotClients: 0 },
    tributario: { totalRevenue: 0, hotClients: 0 },
    ma: { totalRevenue: 0, hotClients: 0 },
    capital: { totalRevenue: 0, hotClients: 0 },
  };

  const byClient = listings.map((l) => {
    const scores = {} as Record<ServiceKey, number>;
    const expectedRevenue = {} as Record<ServiceKey, number>;
    let totalExpectedRevenue = 0;
    let bestService: ServiceKey = "cfo";
    let bestScore = -1;

    services.forEach((svc) => {
      const s = scoreService(l, svc);
      const r = expectedAnnualRevenue(l, svc);
      scores[svc] = s;
      expectedRevenue[svc] = r;
      totalExpectedRevenue += r;
      byService[svc].totalRevenue += r;
      if (s >= 70) byService[svc].hotClients += 1;
      if (s > bestScore) { bestScore = s; bestService = svc; }
    });

    return { listing: l, scores, expectedRevenue, totalExpectedRevenue, bestService };
  });

  // Top oportunidades = (cliente, serviço) com maior receita esperada
  const allOpps: PortfolioAnalysis["topOpportunities"] = [];
  byClient.forEach((c) => {
    services.forEach((svc) => {
      if (c.scores[svc] >= 60) {
        allOpps.push({ listing: c.listing, service: svc, score: c.scores[svc], expectedRevenue: c.expectedRevenue[svc] });
      }
    });
  });
  allOpps.sort((a, b) => b.expectedRevenue - a.expectedRevenue);
  const topOpportunities = allOpps.slice(0, 5);

  const totalRecurring = (["cfo", "ac", "tributario", "capital"] as ServiceKey[])
    .reduce((s, k) => s + byService[k].totalRevenue, 0)
    - (byClient.reduce((s, c) => s + (SERVICE_META.capital.oneOffSuccessFee?.(c.listing) ?? 0) * (c.scores.capital / 100), 0));
  const totalSuccessFee = byClient.reduce((s, c) => {
    const ma = (SERVICE_META.ma.oneOffSuccessFee?.(c.listing) ?? 0) * (c.scores.ma / 100);
    const cap = (SERVICE_META.capital.oneOffSuccessFee?.(c.listing) ?? 0) * (c.scores.capital / 100);
    return s + ma + cap;
  }, 0);
  const totalRevenue = Object.values(byService).reduce((s, v) => s + v.totalRevenue, 0);

  return {
    total: listings.length,
    byClient,
    byService,
    totalRecurring,
    totalSuccessFee,
    totalRevenue,
    topOpportunities,
  };
}
