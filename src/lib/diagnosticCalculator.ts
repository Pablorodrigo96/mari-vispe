import { ValuationResult } from './valuationCalculator';

export interface DiagnosticAnswers {
  capitalGainOptimized: boolean;
  debtControlled: boolean;
  ebitdaControl: boolean;
  controllerArea: boolean;
  continuousMonitoring: boolean;
  chartOfAccounts: boolean;
  auditedBalance: boolean;
  taxPlanning: boolean;
  salesMachine: boolean;
  orgChartUpdated: boolean;
  documentedProcesses: boolean;
  fixedAssetsRegistered: boolean;
}

export interface DiagnosticItem {
  key: keyof DiagnosticAnswers;
  label: string;
  description: string;
  penalty: number; // e.g. 0.05 = 5%
  category: 'fiscal' | 'financial' | 'governance' | 'operational';
}

export const diagnosticItems: DiagnosticItem[] = [
  // Fiscal/Tributário
  { key: 'capitalGainOptimized', label: 'Ganho de capital otimizado', description: 'Planejamento tributário sobre ganho de capital na venda de participação societária', penalty: 0.05, category: 'fiscal' },
  { key: 'taxPlanning', label: 'Planejamento tributário atualizado', description: 'Considerando a reforma tributária e estrutura ideal de tributação', penalty: 0.05, category: 'fiscal' },
  // Financeiro
  { key: 'ebitdaControl', label: 'Controle de EBITDA', description: 'Apuração mensal e análise de margem operacional recorrente', penalty: 0.07, category: 'financial' },
  { key: 'debtControlled', label: 'Endividamento controlado', description: 'Relação dívida/EBITDA saudável e estrutura de capital equilibrada', penalty: 0.08, category: 'financial' },
  { key: 'chartOfAccounts', label: 'Plano de contas estruturado', description: 'Plano de contas gerencial separado do contábil, com centros de custo', penalty: 0.04, category: 'financial' },
  { key: 'auditedBalance', label: 'Balanço auditado', description: 'Demonstrações financeiras auditadas por firma independente', penalty: 0.06, category: 'financial' },
  // Governança
  { key: 'controllerArea', label: 'Área de controladoria', description: 'Equipe ou responsável dedicado ao controle financeiro e reporting', penalty: 0.05, category: 'governance' },
  { key: 'continuousMonitoring', label: 'Monitoramento contínuo de indicadores', description: 'Dashboards e KPIs acompanhados semanalmente/mensalmente', penalty: 0.04, category: 'governance' },
  { key: 'orgChartUpdated', label: 'Organograma atualizado', description: 'Estrutura hierárquica clara e atualizada, com papéis definidos', penalty: 0.03, category: 'governance' },
  // Operacional
  { key: 'salesMachine', label: 'Máquina de vendas estruturada', description: 'Processo comercial documentado, funil de vendas e métricas de conversão', penalty: 0.05, category: 'operational' },
  { key: 'documentedProcesses', label: 'Processos documentados', description: 'SOPs e fluxogramas dos processos críticos da operação', penalty: 0.04, category: 'operational' },
  { key: 'fixedAssetsRegistered', label: 'Ativo imobilizado registrado', description: 'Inventário e controle patrimonial de máquinas, equipamentos e imóveis', penalty: 0.03, category: 'operational' },
];

export const VISPE_APPRECIATION_FACTOR = 1.78;

export const categoryLabels: Record<string, string> = {
  fiscal: 'Fiscal / Tributário',
  financial: 'Financeiro',
  governance: 'Governança',
  operational: 'Operacional',
};

export const categoryIcons: Record<string, string> = {
  fiscal: '📋',
  financial: '💰',
  governance: '🏛️',
  operational: '⚙️',
};

export interface DegradationResult {
  estimatedValue: number;      // mashupValue
  potentialValue: number;      // mashupValue * 1.78
  trueValue: number;           // mashupValue * (1 - totalDegradation)
  totalDegradation: number;    // sum of penalties (0-1)
  gap: number;                 // potentialValue - trueValue
  gapPercent: number;          // gap / trueValue * 100
  itemBreakdown: { item: DiagnosticItem; answer: boolean; impact: number }[];
}

export function getDefaultAnswers(): DiagnosticAnswers {
  return {
    capitalGainOptimized: true,
    debtControlled: true,
    ebitdaControl: true,
    controllerArea: true,
    continuousMonitoring: true,
    chartOfAccounts: true,
    auditedBalance: true,
    taxPlanning: true,
    salesMachine: true,
    orgChartUpdated: true,
    documentedProcesses: true,
    fixedAssetsRegistered: true,
  };
}

export function calculateTrueValue(result: ValuationResult, answers: DiagnosticAnswers): DegradationResult {
  const mashupValue = result.mashupValue;
  const potentialValue = mashupValue * VISPE_APPRECIATION_FACTOR;

  const itemBreakdown = diagnosticItems.map((item) => {
    const answer = answers[item.key];
    const impact = answer ? 0 : item.penalty * mashupValue;
    return { item, answer, impact };
  });

  const totalDegradation = diagnosticItems.reduce((sum, item) => {
    return sum + (answers[item.key] ? 0 : item.penalty);
  }, 0);

  const trueValue = mashupValue * (1 - totalDegradation);
  const gap = potentialValue - trueValue;
  const gapPercent = trueValue > 0 ? (gap / trueValue) * 100 : 0;

  return {
    estimatedValue: mashupValue,
    potentialValue,
    trueValue,
    totalDegradation,
    gap,
    gapPercent,
    itemBreakdown,
  };
}

export interface TrueValueLossMetrics {
  monthlyLoss: number;
  annualLoss: number;
  recoverTimeMonths: number;
  gap: number;
  gapPercent: number;
  trueValue: number;
  potentialValue: number;
  leadScore: 'hot' | 'warm' | 'cold';
  leadScoreReason: string;
}

export function calculateTrueValueLossMetrics(result: ValuationResult, degradation: DegradationResult): TrueValueLossMetrics {
  const monthlyRevenue = result.metrics.revenue / 12;
  const gap = degradation.gap;

  // Monthly loss: 3% inefficiency on revenue + gap diluted over 36 months
  const monthlyLossFromRevenue = monthlyRevenue * 0.03;
  const monthlyLossFromGap = gap / 36;
  const monthlyLoss = (monthlyLossFromRevenue + monthlyLossFromGap) / 2;
  const annualLoss = monthlyLoss * 12;
  const recoverTimeMonths = monthlyLoss > 0 ? Math.round(gap / monthlyLoss) : 0;

  let leadScore: 'hot' | 'warm' | 'cold';
  let leadScoreReason: string;

  if (gap > 1_000_000 || monthlyRevenue > 500_000) {
    leadScore = 'hot';
    leadScoreReason = gap > 1_000_000
      ? `Gap acima de R$ 1M`
      : `Faturamento mensal acima de R$ 500k`;
  } else if (gap > 300_000 || monthlyRevenue > 150_000) {
    leadScore = 'warm';
    leadScoreReason = gap > 300_000
      ? `Gap acima de R$ 300k`
      : `Faturamento mensal acima de R$ 150k`;
  } else {
    leadScore = 'cold';
    leadScoreReason = 'Gap e faturamento abaixo dos limiares de qualificação';
  }

  return {
    monthlyLoss,
    annualLoss,
    recoverTimeMonths,
    gap,
    gapPercent: degradation.gapPercent,
    trueValue: degradation.trueValue,
    potentialValue: degradation.potentialValue,
    leadScore,
    leadScoreReason,
  };
}
