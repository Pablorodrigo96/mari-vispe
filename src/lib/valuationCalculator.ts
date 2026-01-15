// Taxa SELIC atual (pode ser atualizada)
const SELIC_RATE = 0.15;

// Parâmetros por tipo de empresa
const companyParams: Record<string, { growth: number; invest: number; debtFactor: number }> = {
  traditional: { growth: 0.10, invest: 0.03, debtFactor: 0.05 },
  'new-economy': { growth: 0.15, invest: 0.05, debtFactor: 0.03 },
  startup: { growth: 0.25, invest: 0.08, debtFactor: 0.02 },
};

// Ajustes de taxa de desconto por recorrência
const recurrenceAdjustments: Record<string, number> = {
  none: 0.01,        // Penalidade - sem recorrência
  partial: 0,        // Neutro
  moderate: -0.0033, // Bônus moderado
  high: -0.01,       // Bônus alto
};

// Ajustes de taxa de desconto por dependência do fundador
const dependencyAdjustments: Record<string, number> = {
  totally: 0.03,      // Alta penalidade - totalmente dependente
  partially: 0.015,   // Média
  little: 0.005,      // Baixa
  independent: 0,     // Nenhuma - independente
};

// Ajuste por nível de dívida (baseado em % do faturamento)
function getDebtRiskAdjustment(debt: number, revenue: number): number {
  if (revenue === 0) return 0.03;
  const debtRatio = debt / revenue;
  
  if (debtRatio <= 0.1) return 0.01;      // Dívida baixa
  if (debtRatio <= 0.3) return 0.02;      // Dívida moderada
  if (debtRatio <= 0.5) return 0.03;      // Dívida alta
  return 0.04;                             // Dívida muito alta
}

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

export interface YearProjection {
  year: number;
  revenue: number;
  netProfit: number;
  reinvestment: number;
  debtService: number;
  fcf: number;
  presentValue: number;
}

export interface ValuationResult {
  valuation: number;
  valuationMin: number;
  valuationMax: number;
  discountRate: number;
  growthRate: number;
  perpetualGrowth: number;
  terminalValue: number;
  terminalValuePV: number;
  projections: YearProjection[];
  inputs: ValuationInputs;
  calculatedAt: Date;
}

export function calculateValuation(inputs: ValuationInputs): ValuationResult {
  const {
    annualRevenue,
    ebitdaPercentage,
    companyType,
    totalDebt,
    revenueRecurrence,
    founderDependency,
  } = inputs;

  // Converter margem de % para decimal
  const margin = ebitdaPercentage / 100;

  // Obter parâmetros do tipo de empresa
  const params = companyParams[companyType] || companyParams.traditional;
  const { growth, invest, debtFactor } = params;

  // 1. Calcular Taxa de Desconto
  let discountRate = SELIC_RATE + 0.017; // Base

  // Ajuste por risco de dívida
  discountRate += getDebtRiskAdjustment(totalDebt, annualRevenue);

  // Ajuste por dependência do fundador
  discountRate += dependencyAdjustments[founderDependency] || 0;

  // Ajuste por recorrência de receita
  discountRate += recurrenceAdjustments[revenueRecurrence] || 0;

  // 2. Loop de Projeção (3 anos)
  let valuation = 0;
  let currentRevenue = annualRevenue;
  const projections: YearProjection[] = [];
  let terminalValue = 0;
  let terminalValuePV = 0;
  const perpetualGrowth = 0.03; // 3% crescimento perpétuo

  for (let year = 1; year <= 3; year++) {
    // Crescer Faturamento
    currentRevenue = currentRevenue * (1 + growth);

    // Calcular Lucro
    const netProfit = currentRevenue * margin;

    // Deduções (Investimento + Fator Dívida)
    const reinvestment = currentRevenue * invest;
    const debtService = currentRevenue * debtFactor;

    // Fluxo de Caixa Livre
    const fcf = netProfit - reinvestment - debtService;

    // Valor Presente
    const presentValue = fcf / Math.pow(1 + discountRate, year);
    valuation += presentValue;

    projections.push({
      year,
      revenue: currentRevenue,
      netProfit,
      reinvestment,
      debtService,
      fcf,
      presentValue,
    });

    // Se for o ano 3, calcular Perpetuidade
    if (year === 3) {
      terminalValue = (fcf * (1 + perpetualGrowth)) / (discountRate - perpetualGrowth);
      terminalValuePV = terminalValue / Math.pow(1 + discountRate, year);
      valuation += terminalValuePV;
    }
  }

  // Range de ±15%
  const valuationMin = valuation * 0.85;
  const valuationMax = valuation * 1.15;

  return {
    valuation,
    valuationMin,
    valuationMax,
    discountRate,
    growthRate: growth,
    perpetualGrowth,
    terminalValue,
    terminalValuePV,
    projections,
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

// Helper para mapear companyType do form para o cálculo
export function mapCompanyType(formType: string): string {
  const mapping: Record<string, string> = {
    'Empresa Tradicional': 'traditional',
    'Empresa Nova Economia': 'new-economy',
    'Empresa Startup': 'startup',
  };
  return mapping[formType] || 'traditional';
}

// Helper para mapear recurrence do form para o cálculo
export function mapRecurrence(formRecurrence: string): string {
  const mapping: Record<string, string> = {
    none: 'none',
    partial: 'partial',
    moderate: 'moderate',
    high: 'high',
  };
  return mapping[formRecurrence] || 'partial';
}

// Helper para mapear dependency do form para o cálculo
export function mapDependency(formDependency: string): string {
  const mapping: Record<string, string> = {
    totally: 'totally',
    partially: 'partially',
    little: 'little',
    independent: 'independent',
  };
  return mapping[formDependency] || 'partially';
}
