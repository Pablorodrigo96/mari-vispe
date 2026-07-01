// Tipos compartilhados do Equity Planner (Onda C — item 16)
// Fonte de verdade: RPC public.equity_assessment_full

export interface EPAssessment {
  id: string;
  user_id: string;
  company_id: string;
  ipe_composto: number | null;
  arquetipo_id: string | null;
  veredito_liquidez: string | null;
  summary: string | null;
  status: string;
  confianca_arquetipo: number | null;
  migracao_arquetipo_sugerida: Record<string, unknown> | null;
  archetype_classification: Record<string, unknown> | null;
  arquetipo_sugerido: string | null;
  raw_intake: Record<string, unknown> | null;
  promoted_mandate_id: string | null;
  promoted_at: string | null;
  rodada?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface EPDimScore {
  dimensao: string;
  score: number;
  peso: number;
  destruidor_top: boolean;
  evidencias: unknown;
}

export interface EPValuation {
  id: string;
  ebitda_contabil: number | null;
  ebitda_normalizado: number;
  addbacks: Record<string, unknown>;
  multiplo_aplicado: number;
  faixa_min: number;
  faixa_max: number;
  valor_atual: number;
  valor_alvo: number;
  valor_dcf: number | null;
  valor_sde: number | null;
  valor_triangulado: number | null;
  dcf_premissas: Record<string, unknown>;
}

export interface EPBridgeItem {
  parcela: string;
  descricao: string;
  delta_valor: number;
  ordem: number;
}

export interface EPInitiative {
  id: string;
  titulo: string;
  descricao: string | null;
  dimensao_alvo: string;
  delta_ipe: number;
  delta_valor: number;
  esforco: string;
  prazo_meses: number;
  sprint: number;
  status: string;
  tipo: string;
  prioridade: number;
}

export interface EPBuyer {
  id: string;
  arquetipo_comprador: string;
  nome_alvo: string | null;
  setor_alvo: string | null;
  tese_aquisicao: string | null;
  racional_premio: string | null;
  sinergias: string[] | null;
  exemplos_targets: string[] | null;
  premio_estimado_pct: number;
  premio_estimado_valor: number;
  selecionado: boolean;
  carta_convite: string | null;
}

export interface EPProgress {
  id: string;
  assessment_id: string | null;
  ipe: number;
  valor: number;
  valor_alvo: number | null;
  created_at: string;
  evento: string;
  dim_snapshot: Record<string, number> | null;
  top_destruidores: unknown[] | null;
  arquetipo_id: string | null;
  veredito_liquidez: string | null;
}

export interface EPDeepdiveRow {
  initiative_id: string;
  status: string;
  questions: unknown[] | null;
  answers: Record<string, string> | null;
}

export interface EPAssessmentFull {
  assessment: EPAssessment;
  company_porte: string | null;
  dim_scores: EPDimScore[];
  valuation: EPValuation | null;
  bridge: EPBridgeItem[];
  initiatives: EPInitiative[];
  buyers: EPBuyer[];
  progress_log: EPProgress[];
  deepdive: EPDeepdiveRow[];
  annual_plan: { plan?: unknown; [k: string]: unknown } | null;
  dim_benchmarks: Array<Record<string, unknown>>;
  comp_bench: Record<string, unknown> | null;
  market_scan: Record<string, unknown> | null;
}
