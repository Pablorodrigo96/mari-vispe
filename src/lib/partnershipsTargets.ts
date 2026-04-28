// Constantes de meta para o cockpit do Head de Parcerias.
// Quando precisarmos de metas customizáveis por parceiro, criar tabela `partnership_targets`.
export const MONTHLY_REVENUE_TARGET_PER_PARTNER = 50000; // R$ por parceiro ativo / mês
export const SUCCESS_FEE_PCT = 0.03; // 3% sobre o asking_price
export const INACTIVE_DAYS = 60;
export const CUT_DAYS = 90;
export const ICP_EQUITY_THRESHOLD = 60;

export type PartnerStatus = "pending" | "active" | "suspended" | "disqualified";

export const PARTNER_STATUS_LABEL: Record<PartnerStatus, string> = {
  pending: "Pendente",
  active: "Ativo",
  suspended: "Suspenso",
  disqualified: "Desqualificado",
};

export const PARTNER_STATUS_BADGE: Record<
  PartnerStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "secondary",
  active: "default",
  suspended: "outline",
  disqualified: "destructive",
};
