export interface SimulatorInputs {
  amount: number;
  monthlyRevenue: string;
  sector: string;
  companyAge: string;
  objective: string;
}

export interface ScoringResult {
  score: number;
  scoreLabel: string;
  rateRange: string;
  termMonths: string;
  equityRange: string;
  instruments: string[];
  isEquity: boolean;
}

const revenueToNumber: Record<string, number> = {
  'ate-50k': 25000,
  '50k-200k': 125000,
  '200k-500k': 350000,
  '500k-1m': 750000,
  'acima-1m': 1500000,
};

const premiumSectors = ['tech', 'telecom', 'health', 'energy'];

export function calculateCapitalScore(inputs: SimulatorInputs): ScoringResult {
  const isEquity = inputs.objective === 'socio';
  let score = 60; // Base otimista (era 50)

  // Revenue vs Amount ratio — thresholds mais generosos
  const revenue = revenueToNumber[inputs.monthlyRevenue] || 50000;
  const annualRevenue = revenue * 12;
  const ratio = annualRevenue / inputs.amount;
  if (ratio > 3) score += 20;
  else if (ratio > 2) score += 15;
  else if (ratio > 1) score += 10;
  else score -= 5;

  // Company age
  switch (inputs.companyAge) {
    case '10+': score += 15; break;
    case '5-10': score += 12; break;
    case '3-5': score += 8; break;
    case '1-3': score += 3; break;
    case '<1': score -= 5; break;
  }

  // Sector bonus
  if (premiumSectors.includes(inputs.sector)) score += 5;

  // Objective
  if (inputs.objective === 'giro') score += 5;
  else if (inputs.objective === 'refinanciamento') score += 2;

  // Clamp
  score = Math.max(10, Math.min(100, score));

  // Rate & instruments based on score
  let rateRange: string;
  let termMonths: string;
  let equityRange: string;
  let instruments: string[];

  if (score > 80) {
    rateRange = '1,2% — 1,8% a.m.';
    termMonths = '12 a 48 meses';
    equityRange = '5% — 15%';
    instruments = isEquity
      ? ['Venture Capital', 'Private Equity', 'Investidor Estratégico']
      : ['Linha BNDES', 'Crédito Garantido', 'Antecipação de Recebíveis'];
  } else if (score > 60) {
    rateRange = '1,8% — 2,8% a.m.';
    termMonths = '6 a 36 meses';
    equityRange = '15% — 30%';
    instruments = isEquity
      ? ['Investidor Anjo', 'Equity Crowdfunding', 'Aceleradora']
      : ['Capital de Giro PJ', 'Financiamento PME', 'Nota Comercial'];
  } else {
    rateRange = '2,8% — 4,5% a.m.';
    termMonths = '3 a 24 meses';
    equityRange = '25% — 45%';
    instruments = isEquity
      ? ['Investidor Anjo', 'Peer-to-Peer Equity', 'Aceleradora Seed']
      : ['Microcrédito', 'Peer-to-Peer Lending', 'Fintech de Crédito'];
  }

  const scoreLabel = score > 80 ? 'Excelente' : score > 60 ? 'Bom' : score > 40 ? 'Moderado' : 'Inicial';

  return { score, scoreLabel, rateRange, termMonths, equityRange, instruments, isEquity };
}

export function estimateBankCost(amount: number, months: number): number {
  const monthlyRate = 0.035;
  const totalPaid = amount * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1) * months;
  return totalPaid;
}

export function estimateVispeCost(amount: number, months: number, score: number): number {
  const baseRate = score > 80 ? 0.015 : score > 60 ? 0.023 : 0.033;
  const totalPaid = amount * (baseRate * Math.pow(1 + baseRate, months)) / (Math.pow(1 + baseRate, months) - 1) * months;
  return totalPaid;
}
