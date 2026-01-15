// Múltiplos de Mercado - Mercado Brasileiro 2024/2025
export const marketMultiples: Record<string, { ev_revenue: [number, number]; ev_ebitda: [number, number]; pe_ratio: [number, number] }> = {
  "SaaS": { ev_revenue: [4.0, 8.0], ev_ebitda: [12.0, 20.0], pe_ratio: [25.0, 40.0] },
  "Fintech": { ev_revenue: [5.0, 9.0], ev_ebitda: [15.0, 25.0], pe_ratio: [30.0, 50.0] },
  "E-commerce": { ev_revenue: [0.8, 2.5], ev_ebitda: [10.0, 18.0], pe_ratio: [20.0, 35.0] },
  "Saúde": { ev_revenue: [1.5, 3.0], ev_ebitda: [6.0, 10.0], pe_ratio: [12.0, 18.0] },
  "Agronegócio": { ev_revenue: [1.0, 2.5], ev_ebitda: [5.0, 8.0], pe_ratio: [8.0, 12.0] },
  "Educação": { ev_revenue: [1.2, 2.0], ev_ebitda: [5.5, 8.0], pe_ratio: [10.0, 15.0] },
  "Logística": { ev_revenue: [0.9, 1.6], ev_ebitda: [4.5, 7.5], pe_ratio: [10.0, 14.0] },
  "Indústria": { ev_revenue: [0.8, 1.5], ev_ebitda: [5.0, 7.0], pe_ratio: [8.0, 12.0] },
  "Varejo": { ev_revenue: [0.3, 0.8], ev_ebitda: [4.0, 7.0], pe_ratio: [9.0, 14.0] },
  "Serviços": { ev_revenue: [1.0, 2.0], ev_ebitda: [6.0, 9.0], pe_ratio: [10.0, 15.0] },
  "Outros": { ev_revenue: [1.2, 1.2], ev_ebitda: [5.5, 7.0], pe_ratio: [7.5, 9.0] }
};

// Pesos para média ponderada
const WEIGHTS = {
  revenue: 0.30,  // 30% EV/Revenue
  ebitda: 0.40,   // 40% EV/EBITDA
  pe: 0.30,       // 30% P/E
};

export interface ValuationInputs {
  annualRevenue: number;
  ebitdaPercentage: number;
  companyType: string;
  totalDebt: number;
  tangibleAssets: number;
  revenueRecurrence: string;
  founderDependency: string;
  // Company info for report
  companyName: string;
  segment: string;
  fullName: string;
  state: string;
  city: string;
  foundingMonth: string;
  foundingYear: string;
  email: string;
  website: string;
}

export interface MethodBreakdown {
  min: number;
  max: number;
  avg: number;
  multipleMin: number;
  multipleMax: number;
}

export interface ValuationResult {
  valuation: number;
  valuationMin: number;
  valuationMax: number;
  // Breakdown por método
  evByRevenue: MethodBreakdown;
  evByEbitda: MethodBreakdown;
  evByPE: MethodBreakdown;
  // Múltiplos utilizados
  multiplesUsed: {
    segment: string;
    ev_revenue: [number, number];
    ev_ebitda: [number, number];
    pe_ratio: [number, number];
  };
  // Métricas calculadas
  metrics: {
    revenue: number;
    ebitda: number;
    netProfit: number;
    netDebt: number;
  };
  inputs: ValuationInputs;
  calculatedAt: Date;
}

// Normaliza o segmento para corresponder às chaves do marketMultiples
function normalizeSegment(segment: string): string {
  // Verifica se já é uma chave válida
  if (marketMultiples[segment]) {
    return segment;
  }
  
  // Tenta encontrar correspondência case-insensitive
  const normalizedKey = Object.keys(marketMultiples).find(
    key => key.toLowerCase() === segment.toLowerCase()
  );
  
  return normalizedKey || 'Outros';
}

export function calculateValuation(inputs: ValuationInputs): ValuationResult {
  const {
    annualRevenue,
    ebitdaPercentage,
    totalDebt,
    tangibleAssets,
    segment,
  } = inputs;

  // 1. Normalizar e obter múltiplos do segmento
  const normalizedSegment = normalizeSegment(segment);
  const multiples = marketMultiples[normalizedSegment];

  // 2. Calcular métricas financeiras
  const revenue = annualRevenue;
  const ebitdaMargin = ebitdaPercentage / 100;
  const ebitda = revenue * ebitdaMargin;
  const netProfit = ebitda; // Usando EBITDA como proxy para lucro líquido
  const netDebt = totalDebt - (tangibleAssets * 0.5); // Dívida líquida ajustada

  // 3. Calcular EV por cada método
  const evByRevenue: MethodBreakdown = {
    min: revenue * multiples.ev_revenue[0],
    max: revenue * multiples.ev_revenue[1],
    avg: revenue * ((multiples.ev_revenue[0] + multiples.ev_revenue[1]) / 2),
    multipleMin: multiples.ev_revenue[0],
    multipleMax: multiples.ev_revenue[1],
  };

  const evByEbitda: MethodBreakdown = {
    min: ebitda * multiples.ev_ebitda[0],
    max: ebitda * multiples.ev_ebitda[1],
    avg: ebitda * ((multiples.ev_ebitda[0] + multiples.ev_ebitda[1]) / 2),
    multipleMin: multiples.ev_ebitda[0],
    multipleMax: multiples.ev_ebitda[1],
  };

  const evByPE: MethodBreakdown = {
    min: netProfit * multiples.pe_ratio[0],
    max: netProfit * multiples.pe_ratio[1],
    avg: netProfit * ((multiples.pe_ratio[0] + multiples.pe_ratio[1]) / 2),
    multipleMin: multiples.pe_ratio[0],
    multipleMax: multiples.pe_ratio[1],
  };

  // 4. Calcular média ponderada
  const valuationMin = 
    (evByRevenue.min * WEIGHTS.revenue) + 
    (evByEbitda.min * WEIGHTS.ebitda) + 
    (evByPE.min * WEIGHTS.pe);

  const valuationMax = 
    (evByRevenue.max * WEIGHTS.revenue) + 
    (evByEbitda.max * WEIGHTS.ebitda) + 
    (evByPE.max * WEIGHTS.pe);

  const valuation = (valuationMin + valuationMax) / 2;

  // 5. Ajustar por dívida líquida (EV → Equity Value)
  // Se netDebt é positivo, reduz o equity value
  // Se netDebt é negativo (mais caixa que dívida), aumenta o equity value
  const adjustedValuation = Math.max(0, valuation - netDebt);
  const adjustedMin = Math.max(0, valuationMin - netDebt);
  const adjustedMax = Math.max(0, valuationMax - netDebt);

  return {
    valuation: adjustedValuation,
    valuationMin: adjustedMin,
    valuationMax: adjustedMax,
    evByRevenue,
    evByEbitda,
    evByPE,
    multiplesUsed: {
      segment: normalizedSegment,
      ev_revenue: multiples.ev_revenue,
      ev_ebitda: multiples.ev_ebitda,
      pe_ratio: multiples.pe_ratio,
    },
    metrics: {
      revenue,
      ebitda,
      netProfit,
      netDebt,
    },
    inputs,
    calculatedAt: new Date(),
  };
}

// Helper para converter string de moeda para número
export function parseCurrency(value: string): number {
  if (!value) return 0;
  // Remove R$, pontos de milhar e converte vírgula em ponto
  const cleaned = value
    .replace(/R\$\s?/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  return parseFloat(cleaned) || 0;
}

// Helper para mapear companyType do form para o cálculo (mantido para compatibilidade)
export function mapCompanyType(formType: string): string {
  return formType;
}

// Helper para mapear recurrence do form para o cálculo (mantido para compatibilidade)
export function mapRecurrence(formRecurrence: string): string {
  return formRecurrence;
}

// Helper para mapear dependency do form para o cálculo (mantido para compatibilidade)
export function mapDependency(formDependency: string): string {
  return formDependency;
}
