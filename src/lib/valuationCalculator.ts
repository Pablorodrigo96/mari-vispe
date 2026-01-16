// Múltiplos de Mercado - Mercado Brasileiro 2024/2025 (Valores únicos)
export const sectorMultiples: Record<string, { rev: number; ebitda: number; profit: number }> = {
  "SaaS": { rev: 6.0, ebitda: 16.0, profit: 32.5 },
  "Fintech": { rev: 7.0, ebitda: 20.0, profit: 40.0 },
  "E-commerce": { rev: 1.6, ebitda: 14.0, profit: 27.5 },
  "Saúde": { rev: 2.2, ebitda: 8.0, profit: 15.0 },
  "Agronegócio": { rev: 1.8, ebitda: 6.5, profit: 10.0 },
  "Educação": { rev: 1.6, ebitda: 6.8, profit: 12.5 },
  "Logística": { rev: 1.2, ebitda: 6.0, profit: 12.0 },
  "Indústria": { rev: 1.1, ebitda: 6.0, profit: 10.0 },
  "Varejo": { rev: 0.6, ebitda: 5.5, profit: 11.5 },
  "Serviços": { rev: 1.5, ebitda: 7.5, profit: 12.5 },
  "Outros": { rev: 1.2, ebitda: 6.2, profit: 8.2 }
};

export interface ValuationInputs {
  // Step 1 - Perfil
  companyType: string;
  segment: string;
  // Step 2 - Financeiro
  annualRevenue: number;
  ebitdaMargin: number; // Percentual
  netProfitMargin: number; // Percentual
  // Step 3 - Lead
  fullName: string;
  companyName: string;
  email: string;
  phone: string;
}

export interface ValuationResult {
  // Mashup Value (média dos métodos válidos)
  mashupValue: number;
  
  // Breakdown por método
  revenueValuation: number;
  ebitdaValuation: number;
  profitValuation: number;
  validMethods: number;
  
  // Múltiplos utilizados
  multiplesUsed: {
    segment: string;
    rev: number;
    ebitda: number;
    profit: number;
  };
  
  // Múltiplos implícitos baseados no Mashup Value
  impliedMultiples: {
    impliedRevMultiple: number;
    impliedEbitdaMultiple: number;
    impliedProfitMultiple: number;
  };
  
  // Métricas calculadas
  metrics: {
    revenue: number;
    ebitdaMargin: number;
    ebitda: number;
    netProfit: number;
  };
  
  // Inputs do usuário
  inputs: ValuationInputs;
  calculatedAt: Date;
}

// Normaliza o segmento para corresponder às chaves do sectorMultiples
function normalizeSegment(segment: string): string {
  if (sectorMultiples[segment]) {
    return segment;
  }
  
  const normalizedKey = Object.keys(sectorMultiples).find(
    key => key.toLowerCase() === segment.toLowerCase()
  );
  
  return normalizedKey || 'Outros';
}

export function calculateValuation(inputs: ValuationInputs): ValuationResult {
  const {
    annualRevenue,
    ebitdaMargin,
    netProfitMargin,
    segment,
  } = inputs;

  // 1. Normalizar e obter múltiplos do segmento
  const normalizedSegment = normalizeSegment(segment);
  const multiples = sectorMultiples[normalizedSegment];

  // 2. Calcular métricas financeiras
  const revenue = annualRevenue;
  const ebitda = revenue * (ebitdaMargin / 100);
  const netProfit = revenue * (netProfitMargin / 100);

  // 3. Calcular valuation por cada método
  const revenueValuation = revenue * multiples.rev;
  const ebitdaValuation = ebitda > 0 ? ebitda * multiples.ebitda : 0;
  const profitValuation = netProfit > 0 ? netProfit * multiples.profit : 0;

  // 4. Calcular Mashup Value (média dos métodos válidos)
  const validValues: number[] = [];
  if (revenueValuation > 0) validValues.push(revenueValuation);
  if (ebitdaValuation > 0) validValues.push(ebitdaValuation);
  if (profitValuation > 0) validValues.push(profitValuation);

  const validMethods = validValues.length;
  const mashupValue = validMethods > 0 
    ? validValues.reduce((sum, val) => sum + val, 0) / validMethods 
    : 0;

  // 5. Calcular múltiplos implícitos
  const impliedRevMultiple = revenue > 0 ? mashupValue / revenue : 0;
  const impliedEbitdaMultiple = ebitda > 0 ? mashupValue / ebitda : 0;
  const impliedProfitMultiple = netProfit > 0 ? mashupValue / netProfit : 0;

  return {
    mashupValue,
    revenueValuation,
    ebitdaValuation,
    profitValuation,
    validMethods,
    multiplesUsed: {
      segment: normalizedSegment,
      rev: multiples.rev,
      ebitda: multiples.ebitda,
      profit: multiples.profit,
    },
    impliedMultiples: {
      impliedRevMultiple,
      impliedEbitdaMultiple,
      impliedProfitMultiple,
    },
    metrics: {
      revenue,
      ebitdaMargin,
      ebitda,
      netProfit,
    },
    inputs,
    calculatedAt: new Date(),
  };
}

// Helper para converter string de moeda para número
export function parseCurrency(value: string): number {
  if (!value) return 0;
  const cleaned = value
    .replace(/R\$\s?/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  return parseFloat(cleaned) || 0;
}
