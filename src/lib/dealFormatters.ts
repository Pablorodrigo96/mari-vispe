export function brl(v: number | null | undefined, opts?: { compact?: boolean }) {
  if (v === null || v === undefined || isNaN(Number(v))) return "—";
  const n = Number(v);
  if (opts?.compact) {
    if (Math.abs(n) >= 1_000_000_000) return `R$ ${(n / 1_000_000_000).toFixed(1)}B`;
    if (Math.abs(n) >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)}M`;
    if (Math.abs(n) >= 1_000) return `R$ ${(n / 1_000).toFixed(0)}k`;
  }
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export const DEAL_TYPE_LABEL: Record<string, string> = {
  buyside: "Buyside",
  sellside: "Sellside",
  spa: "SPA",
  due_diligence: "Due Diligence",
  cisao: "Cisão",
  fusao: "Fusão",
  nbo: "NBO",
  match: "Match",
};

export const PIPELINE_STAGE_LABEL: Record<string, string> = {
  match: "Match",
  nbo: "NBO",
  due_diligence: "Due Diligence",
  spa: "SPA",
  closing: "Closing",
  closed: "Closed",
};

export const PIPELINE_STAGES = ["match", "nbo", "due_diligence", "spa", "closing", "closed"] as const;

export const OUTCOME_LABEL: Record<string, string> = {
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
  vencido: "Vencido",
  vendeu_sozinho: "Vendeu sozinho",
};

export const OUTCOME_COLOR: Record<string, string> = {
  em_andamento: "#10b981",
  concluido: "#22c55e",
  cancelado: "#ef4444",
  vencido: "#f97316",
  vendeu_sozinho: "#a855f7",
};

export const REGIAO_BY_UF: Record<string, string> = {
  AC: "Norte", AP: "Norte", AM: "Norte", PA: "Norte", RO: "Norte", RR: "Norte", TO: "Norte",
  AL: "Nordeste", BA: "Nordeste", CE: "Nordeste", MA: "Nordeste", PB: "Nordeste", PE: "Nordeste", PI: "Nordeste", RN: "Nordeste", SE: "Nordeste",
  DF: "Centro-oeste", GO: "Centro-oeste", MT: "Centro-oeste", MS: "Centro-oeste",
  ES: "Sudeste", MG: "Sudeste", RJ: "Sudeste", SP: "Sudeste",
  PR: "Sul", RS: "Sul", SC: "Sul",
};

export const ALL_UFS = Object.keys(REGIAO_BY_UF);

export const SETORES = [
  "Telecomunicações","Tecnologia","Saúde","Educação","Varejo","Indústria","Imobiliário",
  "Agronegócio","Energia","Serviços Financeiros","Construção Civil","Consultoria",
  "Mídias Sociais","Alimentação","Logística","Outros",
];
