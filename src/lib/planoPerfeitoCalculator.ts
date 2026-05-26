// Plano Perfeito — motor NOVO que CONSUMA o motor de valuation existente.
// Não duplica nenhuma lógica de múltiplos.
import { calculateValuation, type ValuationInputs, type ValuationResult } from './valuationCalculator';

export interface PlanoPerfeitoInputs {
  metaValuation: number;     // R$
  prazoAnos: number;         // 1..15
  cac: number;               // R$ por cliente
  arpu: number;              // R$ por cliente/ano
  churnAnual?: number;       // 0..1, default 0.05
}

export type Viabilidade = 'green' | 'yellow' | 'red';

export interface PlanoPerfeitoResult {
  valuationAtual: number;
  valuationMeta: number;
  multiploReceita: number;
  prazoAnos: number;
  prazoMeses: number;

  gapValuation: number;
  receitaAtual: number;
  receitaAlvo: number;
  receitaAdicional: number;
  receitaMensalAtual: number;

  arpu: number;
  cac: number;
  churnAnual: number;

  clientesAtuais: number;
  clientesAlvo: number;
  clientesPerdidos: number;
  clientesNovosTotal: number;
  clientesPorMes: number;
  clientesPorAno: number;

  investimentoMensal: number;
  investimentoAnual: number;
  investimentoTotal: number;

  percentualDaReceita: number; // 0..n
  viabilidade: Viabilidade;
  viabilidadeMensagem: string;

  // Edge cases
  jaAcimaDaMeta: boolean;
  baseSuficiente: boolean;

  // Série mensal para gráfico
  serieMensal: Array<{
    mes: number;
    valuationProjetado: number;
    investimentoAcumulado: number;
  }>;

  // Referência ao valuation usado
  valuationBase: ValuationResult;
}

export function calcularPlanoPerfeito(
  valuationInputs: ValuationInputs,
  planoInputs: PlanoPerfeitoInputs,
): PlanoPerfeitoResult {
  // 1. Roda o motor existente (NÃO altera nada)
  const valuationBase = calculateValuation(valuationInputs);

  const V0 = valuationBase.mashupValue;
  const Vt = planoInputs.metaValuation;
  const prazoAnos = Math.max(1, Math.min(15, planoInputs.prazoAnos));
  const prazoMeses = prazoAnos * 12;
  const churnAnual = planoInputs.churnAnual ?? 0.05;
  const arpu = Math.max(0, planoInputs.arpu);
  const cac = Math.max(0, planoInputs.cac);

  // Múltiplo médio implícito (já calculado pelo motor)
  const multiploReceita = valuationBase.impliedMultiples.impliedRevMultiple
    || valuationBase.multiplesUsed.rev
    || 1;

  const receitaAtual = valuationBase.metrics.revenue;
  const receitaMensalAtual = receitaAtual / 12;
  const receitaAlvo = multiploReceita > 0 ? Vt / multiploReceita : 0;
  const receitaAdicional = receitaAlvo - receitaAtual;

  const gapValuation = Vt - V0;
  const jaAcimaDaMeta = gapValuation <= 0;

  const clientesAtuais = arpu > 0 ? receitaAtual / arpu : 0;
  const clientesAlvo   = arpu > 0 ? receitaAlvo / arpu  : 0;

  // Churn composto durante o período
  const clientesPerdidos = arpu > 0
    ? clientesAtuais * (1 - Math.pow(1 - churnAnual, prazoAnos))
    : 0;

  const clientesNovosTotal = Math.max(0, (clientesAlvo - clientesAtuais) + clientesPerdidos);
  const clientesPorMes = prazoMeses > 0 ? clientesNovosTotal / prazoMeses : 0;
  const clientesPorAno = clientesPorMes * 12;

  const baseSuficiente = !jaAcimaDaMeta && clientesNovosTotal <= 0;

  const investimentoMensal = clientesPorMes * cac;
  const investimentoAnual  = investimentoMensal * 12;
  const investimentoTotal  = investimentoMensal * prazoMeses;

  const percentualDaReceita = receitaMensalAtual > 0
    ? investimentoMensal / receitaMensalAtual
    : 0;

  // Semáforo
  let viabilidade: Viabilidade = 'green';
  let viabilidadeMensagem = 'Meta agressiva mas factível com sua estrutura atual.';
  if (jaAcimaDaMeta) {
    viabilidade = 'green';
    viabilidadeMensagem = 'Você já está acima da sua meta — defina uma meta maior.';
  } else if (baseSuficiente) {
    viabilidade = 'green';
    viabilidadeMensagem = 'Você já tem a base de clientes necessária. Foque em ticket médio e retenção.';
  } else if (receitaMensalAtual <= 0 || arpu <= 0) {
    viabilidade = 'yellow';
    viabilidadeMensagem = 'Sem receita atual ou ARPU informado — análise de viabilidade limitada.';
  } else if (percentualDaReceita > 0.6) {
    viabilidade = 'red';
    viabilidadeMensagem = 'O investimento necessário ultrapassa sua geração de caixa. Recomendamos captação externa, alongamento do prazo ou revisão da meta.';
  } else if (percentualDaReceita >= 0.3) {
    viabilidade = 'yellow';
    viabilidadeMensagem = 'Meta exige reinvestimento intenso. Considere captação ou ajuste no prazo.';
  }

  // Série mensal (crescimento linear do valuation entre V0 e Vt)
  const serieMensal = Array.from({ length: prazoMeses + 1 }, (_, mes) => {
    const progresso = prazoMeses > 0 ? mes / prazoMeses : 1;
    return {
      mes,
      valuationProjetado: V0 + gapValuation * progresso,
      investimentoAcumulado: investimentoMensal * mes,
    };
  });

  return {
    valuationAtual: V0,
    valuationMeta: Vt,
    multiploReceita,
    prazoAnos,
    prazoMeses,
    gapValuation,
    receitaAtual,
    receitaAlvo,
    receitaAdicional,
    receitaMensalAtual,
    arpu,
    cac,
    churnAnual,
    clientesAtuais,
    clientesAlvo,
    clientesPerdidos,
    clientesNovosTotal,
    clientesPorMes,
    clientesPorAno,
    investimentoMensal,
    investimentoAnual,
    investimentoTotal,
    percentualDaReceita,
    viabilidade,
    viabilidadeMensagem,
    jaAcimaDaMeta,
    baseSuficiente,
    serieMensal,
    valuationBase,
  };
}
