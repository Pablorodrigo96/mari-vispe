/**
 * DCF Calculator - Fluxo de Caixa Descontado
 * Implementação exata conforme especificação da planilha Excel
 */

// Constantes fixas
const SELIC_RATE = 0.15; // 15%
const SENSITIVITY_RANGE = 0.06; // ±6%
const TERMINAL_GROWTH = 0.045; // 4.5%

// Configurações por tipo de empresa
export const companyTypeConfig = {
  tradicional: {
    label: 'Empresa Tradicional',
    description: 'Produto validado, crescimento estável. Ideal para negócios consolidados que buscam segurança e constância nos resultados.',
    growthRate: 0.20, // 20%
    riskPremium: 0.0537, // 5.37%
    wacc: 0.2037, // 20.37%
    marginGrowth: false, // Margem constante
  },
  nova_economia: {
    label: 'Empresa Nova Economia',
    description: 'Produto em validação, foco em eficiência. Para negócios que usam canais digitais e buscam acelerar o crescimento com otimização operacional.',
    growthRate: 0.22, // 22%
    riskPremium: 0.0723, // 7.23%
    wacc: 0.2223, // 22.23%
    marginGrowth: true, // +1 p.p./ano
  },
  startup: {
    label: 'Startup',
    description: 'Fase de teste e escala acelerada. Para negócios inovadores focados em validar hipóteses e crescer exponencialmente, assumindo maior risco.',
    growthRate: 0.35, // 35%
    riskPremium: 0.1057, // 10.57%
    wacc: 0.2557, // 25.57%
    marginGrowth: true, // +1 p.p./ano
  },
} as const;

export type CompanyType = keyof typeof companyTypeConfig;

export interface DCFInputs {
  companyType: CompanyType;
  annualRevenue: number;
  ebitdaMargin: number; // Percentual (ex: 20 para 20%)
  netProfitMargin: number; // Percentual (ex: 15 para 15%)
  capex: number; // Investimentos anuais
  debtPayment: number; // Pagamento de dívidas anual
  // Dados do lead
  fullName: string;
  companyName: string;
  email: string;
  phone: string;
  segment: string;
}

export interface YearProjection {
  year: number;
  revenue: number;
  ebitdaMargin: number;
  ebitda: number;
  netProfitMargin: number;
  netProfit: number;
  fcff: number; // Free Cash Flow to Firm (baseado em Lucro Líquido)
  discountFactor: number;
  presentValue: number;
}

export interface DCFResult {
  // Valor principal
  enterpriseValue: number;
  
  // Range de sensibilidade (±6%)
  valueLow: number;
  valueHigh: number;
  
  // Projeções anuais
  projections: YearProjection[];
  
  // Valor terminal
  terminalValue: number;
  terminalValuePV: number;
  
  // Soma dos VPs dos FCFFs projetados
  sumProjectedPV: number;
  
  // Premissas utilizadas
  premises: {
    companyType: CompanyType;
    companyTypeLabel: string;
    growthRate: number;
    wacc: number;
    riskPremium: number;
    terminalGrowth: number;
    selicRate: number;
    marginGrowth: boolean;
  };
  
  // Inputs originais
  inputs: DCFInputs;
  calculatedAt: Date;
}

export function calculateDCF(inputs: DCFInputs): DCFResult {
  const {
    companyType,
    annualRevenue,
    ebitdaMargin,
    netProfitMargin,
    capex,
    debtPayment,
  } = inputs;

  const config = companyTypeConfig[companyType];
  const { growthRate, wacc, riskPremium, marginGrowth } = config;

  // Projetar 3 anos
  const projections: YearProjection[] = [];
  let revenue = annualRevenue;
  let currentEbitdaMargin = ebitdaMargin;
  let currentNetProfitMargin = netProfitMargin;

  for (let year = 1; year <= 3; year++) {
    // Calcular receita do ano
    revenue = year === 1 ? annualRevenue * (1 + growthRate) : revenue * (1 + growthRate);
    
    // Atualizar margens se empresa tiver crescimento de margem
    if (marginGrowth && year > 1) {
      currentEbitdaMargin += 1; // +1 p.p. por ano
      currentNetProfitMargin += 1; // +1 p.p. por ano
    } else if (marginGrowth && year === 1) {
      currentEbitdaMargin += 1; // +1 p.p. no primeiro ano também
      currentNetProfitMargin += 1; // +1 p.p. no primeiro ano também
    }
    
    // Calcular EBITDA (para exibição)
    const ebitda = revenue * (currentEbitdaMargin / 100);
    
    // Calcular Lucro Líquido
    const netProfit = revenue * (currentNetProfitMargin / 100);
    
    // Calcular FCFF (Free Cash Flow to Firm)
    // FCFF = Lucro Líquido - CapEx - Pagamento de Dívidas
    const fcff = netProfit - capex - debtPayment;
    
    // Fator de desconto
    const discountFactor = 1 / Math.pow(1 + wacc, year);
    
    // Valor presente
    const presentValue = fcff * discountFactor;

    projections.push({
      year,
      revenue,
      ebitdaMargin: currentEbitdaMargin,
      ebitda,
      netProfitMargin: currentNetProfitMargin,
      netProfit,
      fcff,
      discountFactor,
      presentValue,
    });
  }

  // Soma dos VPs dos FCFFs projetados
  const sumProjectedPV = projections.reduce((sum, p) => sum + p.presentValue, 0);

  // Valor Terminal (Perpetuity)
  // TV = FCFF_ano3 × (1 + g) / (WACC - g)
  const lastYearFCFF = projections[2].fcff;
  const terminalValue = (lastYearFCFF * (1 + TERMINAL_GROWTH)) / (wacc - TERMINAL_GROWTH);
  
  // VP do Valor Terminal (descontado 3 anos)
  const terminalValuePV = terminalValue / Math.pow(1 + wacc, 3);

  // Enterprise Value = Soma dos VPs + VP do Terminal Value
  const enterpriseValue = sumProjectedPV + terminalValuePV;

  // Range de sensibilidade
  const valueLow = enterpriseValue * (1 - SENSITIVITY_RANGE);
  const valueHigh = enterpriseValue * (1 + SENSITIVITY_RANGE);

  return {
    enterpriseValue,
    valueLow,
    valueHigh,
    projections,
    terminalValue,
    terminalValuePV,
    sumProjectedPV,
    premises: {
      companyType,
      companyTypeLabel: config.label,
      growthRate,
      wacc,
      riskPremium,
      terminalGrowth: TERMINAL_GROWTH,
      selicRate: SELIC_RATE,
      marginGrowth,
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
