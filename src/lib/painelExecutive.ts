// Helpers for the Painel Executivo
// Fonte única: valuation_history.result. Usa as MESMAS fórmulas do relatório
// (src/lib/diagnosticCalculator.ts) para garantir coerência entre /valuation e /painel.
import { VISPE_APPRECIATION_FACTOR } from './diagnosticCalculator';

export interface ValuationSnapshot {
  /** Quanto vale hoje. Igual ao True Value do relatório quando há diagnóstico; senão = Estimado. */
  valorAtual: number;
  /** Estimado puro de mercado (mashup dos múltiplos ou EV do DCF). */
  valorEstimado: number;
  /** Quanto pode valer em 2027 = Estimado × VISPE_APPRECIATION_FACTOR (1,78). */
  valorPotencial: number;
  /** Potencial − Atual. */
  gap: number;
  gapPct: number;
  /** % de perda aplicada pelo diagnóstico (0..1). 0 quando não há diagnóstico. */
  degradationPct: number;
  segment: string;
  ebitdaMargin?: number;
  ebitdaMarginPotential?: number;
  icLow: number;
  icHigh: number;
  icLowPot: number;
  icHighPot: number;
  method: 'multiples' | 'dcf';
  /** True quando o usuário respondeu o diagnóstico de degradação. */
  hasDiagnostic: boolean;
  createdAt: string;
}

const KNOWN_SEGMENTS = ['Varejo','Indústria','Serviços','Tecnologia','Saúde','Agronegócio','Construção','Telecom'];

export function normalizeSegment(raw?: string | null): string {
  if (!raw) return 'Outros';
  const s = raw.trim();
  const hit = KNOWN_SEGMENTS.find(k => k.toLowerCase() === s.toLowerCase());
  if (hit) return hit;
  if (/tele|isp|provedor/i.test(s)) return 'Telecom';
  if (/tech|software|saas|tecno/i.test(s)) return 'Tecnologia';
  if (/saude|saúde|clinic|hosp/i.test(s)) return 'Saúde';
  if (/agro/i.test(s)) return 'Agronegócio';
  if (/constr|imob/i.test(s)) return 'Construção';
  if (/varej|comerc|retail/i.test(s)) return 'Varejo';
  if (/indust|fabri/i.test(s)) return 'Indústria';
  if (/servi/i.test(s)) return 'Serviços';
  return 'Outros';
}

export function buildSnapshot(row: any): ValuationSnapshot | null {
  if (!row?.result) return null;
  const r = row.result;
  const isDcf = row.valuation_type === 'dcf' || row.valuation_type === 'dcf_single';
  const valorAtual = Number(isDcf ? (r.enterpriseValue ?? r.valueLow) : r.mashupValue) || 0;
  if (!valorAtual) return null;

  const lossPotential = Number(r?.lossMetrics?.potentialValue) || 0;
  const valorPotencial = lossPotential > valorAtual ? lossPotential : Math.round(valorAtual * 1.5);
export function buildSnapshot(row: any): ValuationSnapshot | null {
  if (!row?.result) return null;
  const r = row.result;
  const isDcf = row.valuation_type === 'dcf' || row.valuation_type === 'dcf_single';

  // 1) Valor Estimado: número neutro de mercado (mesmo do relatório)
  const valorEstimado = Number(isDcf ? (r.enterpriseValue ?? r.valueLow) : r.mashupValue) || 0;
  if (!valorEstimado) return null;

  // 2) Diagnóstico: usa o que o relatório salvou em lossMetrics (totalDegradation + trueValue)
  // Mesma fórmula de src/lib/diagnosticCalculator.ts (calculateTrueValue).
  const lm = r?.lossMetrics;
  const hasDiagnostic = !!(lm && (lm.trueValue || typeof lm.totalDegradation === 'number'));
  const degradationPct = hasDiagnostic ? Number(lm.totalDegradation) || 0 : 0;
  const trueValue = hasDiagnostic
    ? Number(lm.trueValue) || (valorEstimado * (1 - degradationPct))
    : valorEstimado;

  // 3) Valor Potencial 2027: SEMPRE Estimado × 1,78 (mesma constante do relatório).
  const valorPotencial = hasDiagnostic && Number(lm.potentialValue) > 0
    ? Number(lm.potentialValue)
    : Math.round(valorEstimado * VISPE_APPRECIATION_FACTOR);

  // 4) Gap derivado: nunca recalculado por outro caminho.
  const valorAtual = trueValue;
  const gap = valorPotencial - valorAtual;
  const gapPct = valorAtual ? (gap / valorAtual) * 100 : 0;

  const icLow = Number(isDcf ? r.valueLow : valorAtual * 0.9);
  const icHigh = Number(isDcf ? r.valueHigh : valorAtual * 1.1);

  return {
    valorAtual,
    valorEstimado,
    valorPotencial,
    gap,
    gapPct,
    degradationPct,
    segment: normalizeSegment(row.segment ?? r?.inputs?.segment),
    ebitdaMargin: r?.metrics?.ebitdaMargin ?? r?.inputs?.ebitdaMargin,
    ebitdaMarginPotential: r?.metrics?.ebitdaMargin ? Math.min(35, r.metrics.ebitdaMargin + 5) : undefined,
    icLow, icHigh,
    icLowPot: valorPotencial * 0.9,
    icHighPot: valorPotencial * 1.1,
    method: isDcf ? 'dcf' : 'multiples',
    hasDiagnostic,
    createdAt: row.created_at,
  };
}

export function brl(v: number, opts: { compact?: boolean } = {}): string {
  if (!isFinite(v)) return '—';
  if (opts.compact !== false) {
    if (Math.abs(v) >= 1_000_000_000) return `R$ ${(v / 1_000_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}B`;
    if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}M`;
    if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}k`;
  }
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

export interface Pillar {
  key: string;
  title: string;
  icon: string;
  problem: string[];
  todo: string[];
  impact: string[];
  investment: number;
  returnValue: number;
}

export function getPillars(snapshot: ValuationSnapshot): Pillar[] {
  // Distribute the gap across 4 pillars. Total returns ≈ gap.
  const gap = Math.max(snapshot.gap, snapshot.valorAtual * 0.5);
  const r1 = Math.round(gap * 0.27);
  const r2 = Math.round(gap * 0.31);
  const r3 = Math.round(gap * 0.22);
  const r4 = Math.round(gap * 0.20);

  return [
    {
      key: 'sales', title: 'Máquina de Vendas', icon: 'Cog',
      problem: ['Crescimento sem planejamento', 'Clientes saem quando muda gerente', 'Sem processo de retenção'],
      todo: ['Contratar gerente de contas dedicado', 'Documentar processos de onboarding', 'Programa de fidelização'],
      impact: ['Churn cai de 8% para 3% a.a.', 'LTV +40%', 'Múltiplo EV/Receita: 0,8x → 1,2x'],
      investment: 200000, returnValue: r1,
    },
    {
      key: 'control', title: 'Controladoria Profissional', icon: 'ClipboardCheck',
      problem: ['Contabilidade só faz o básico', 'Sem fluxo de caixa projetado', 'Sem análise de LTV/CAC'],
      todo: ['CFO part-time ou consultoria', 'Dashboard de KPIs mensais', 'Mapear unit economics completo'],
      impact: ['Comprador consegue prever fluxo', 'Risco percebido cai', 'EV/EBITDA: 4,0x → 5,5x'],
      investment: 150000, returnValue: r2,
    },
    {
      key: 'ma', title: 'Consultoria M&A + Tese', icon: 'Target',
      problem: ['Você não sabe se está caro/barato', 'Sem narrativa para o comprador', 'Sem pitch deck pronto'],
      todo: ['Contratar consultoria M&A especializada', 'Validar valuation com comparáveis', 'Construir tese estruturada'],
      impact: ['Reduz incerteza do comprador', 'Negocia de posição forte', 'Múltiplo +15-25% por clareza'],
      investment: 200000, returnValue: r3,
    },
    {
      key: 'growth', title: 'Crescimento Acelerado', icon: 'TrendingUp',
      problem: ['Crescimento de 12-15% a.a.', 'Concorrentes crescem 30%+', 'Sem plano de expansão claro'],
      todo: ['Campanha agressiva de aquisição', 'Expandir para estado vizinho', 'Adicionar serviço complementar'],
      impact: ['Faturamento +50% em 3 anos', 'Tese de crescimento valoriza múltiplo', 'Atrai PE / strategic buyers'],
      investment: 300000, returnValue: r4,
    },
  ];
}
