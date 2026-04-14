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
  { key: 'capitalGainOptimized', label: 'Existe planejamento para minimizar o imposto sobre ganho de capital na venda da participação societária?', description: 'Sem otimização, até 34% do ganho pode ser tributado, reduzindo drasticamente o valor líquido recebido pelo vendedor.', penalty: 0.05, category: 'fiscal' },
  { key: 'taxPlanning', label: 'A empresa possui planejamento tributário atualizado considerando a reforma tributária?', description: 'Estruturas tributárias desatualizadas geram pagamento excessivo de impostos e reduzem a atratividade para compradores.', penalty: 0.05, category: 'fiscal' },
  // Financeiro
  { key: 'ebitdaControl', label: 'Sua empresa apura o EBITDA mensalmente com análise de margem operacional recorrente?', description: 'Sem controle de EBITDA, o comprador aplica desconto por falta de visibilidade sobre a real geração de caixa.', penalty: 0.07, category: 'financial' },
  { key: 'debtControlled', label: 'A relação dívida/EBITDA está abaixo de 3x e a estrutura de capital é equilibrada?', description: 'Endividamento alto reduz o Equity Value e afasta investidores que buscam empresas com balanço saudável.', penalty: 0.08, category: 'financial' },
  { key: 'chartOfAccounts', label: 'Existe plano de contas gerencial separado do contábil, com centros de custo?', description: 'Sem gerencial separado, o comprador não consegue analisar rentabilidade por unidade de negócio.', penalty: 0.04, category: 'financial' },
  { key: 'auditedBalance', label: 'As demonstrações financeiras dos últimos 3 anos foram auditadas por firma independente?', description: 'Balanço não auditado gera desconfiança e justifica pedidos de desconto de 15-30% na negociação.', penalty: 0.06, category: 'financial' },
  // Governança
  { key: 'controllerArea', label: 'Existe equipe ou responsável dedicado ao controle financeiro e reporting gerencial?', description: 'Sem controladoria, os números dependem do dono — isso é um risco crítico para qualquer comprador.', penalty: 0.05, category: 'governance' },
  { key: 'continuousMonitoring', label: 'Indicadores financeiros (KPIs) são acompanhados semanalmente via dashboards?', description: 'Falta de monitoramento indica gestão reativa — compradores penalizam empresas sem previsibilidade.', penalty: 0.04, category: 'governance' },
  { key: 'orgChartUpdated', label: 'A empresa possui organograma atualizado com papéis e responsabilidades definidos?', description: 'Organograma indefinido sinaliza dependência do fundador, reduzindo o valor de transação.', penalty: 0.03, category: 'governance' },
  // Operacional
  { key: 'salesMachine', label: 'O processo comercial é documentado com funil de vendas e métricas de conversão?', description: 'Sem máquina de vendas, a receita depende de esforço individual — isso reduz a previsibilidade e o múltiplo aplicado.', penalty: 0.05, category: 'operational' },
  { key: 'documentedProcesses', label: 'Os processos críticos da operação estão documentados (SOPs, fluxogramas)?', description: 'Processos na cabeça das pessoas = risco operacional alto e desconto no valuation.', penalty: 0.04, category: 'operational' },
  { key: 'fixedAssetsRegistered', label: 'Existe inventário e controle patrimonial de máquinas, equipamentos e imóveis?', description: 'Ativos não registrados não podem ser considerados no cálculo de valor da empresa.', penalty: 0.03, category: 'operational' },
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
