/**
 * Helpers compartilhados pelo cockpit Equity Brain.
 * Mantém o resto do código mais limpo e a UX consistente.
 */

export function maskCnpj(cnpj: string | null | undefined, isAdmin: boolean): string {
  if (!cnpj) return "—";
  const clean = cnpj.replace(/\D/g, "").padStart(14, "0");
  const formatted = `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8, 12)}-${clean.slice(12, 14)}`;
  if (isAdmin) return formatted;
  // 12.***.***./0001-XX
  return `${clean.slice(0, 2)}.***.***./${clean.slice(8, 12)}-${clean.slice(12, 14)}`;
}

export function scoreColor(score: number | null | undefined): string {
  const s = Number(score ?? 0);
  if (s >= 80) return "text-emerald-400";
  if (s >= 60) return "text-emerald-500";
  if (s >= 40) return "text-amber-400";
  if (s >= 20) return "text-amber-500";
  return "text-zinc-500";
}

export function scoreBg(score: number | null | undefined): string {
  const s = Number(score ?? 0);
  if (s >= 80) return "bg-emerald-500";
  if (s >= 60) return "bg-emerald-600";
  if (s >= 40) return "bg-amber-500";
  if (s >= 20) return "bg-amber-600";
  return "bg-zinc-700";
}

export function weightColor(weight: number | null | undefined): {
  bg: string; text: string; border: string;
} {
  const w = Number(weight ?? 0);
  if (w >= 0.7) return { bg: "bg-rose-950/40", text: "text-rose-300", border: "border-rose-900/60" };
  if (w >= 0.4) return { bg: "bg-amber-950/40", text: "text-amber-300", border: "border-amber-900/60" };
  return { bg: "bg-yellow-950/30", text: "text-yellow-300", border: "border-yellow-900/50" };
}

export function tierFor(maScore: number | null | undefined): "premium" | "strong" | "standard" {
  const s = Number(maScore ?? 0);
  if (s >= 80) return "premium";
  if (s >= 60) return "strong";
  return "standard";
}

export function tierLabel(tier: string): { label: string; cls: string } {
  switch (tier) {
    case "premium":  return { label: "Premium",  cls: "bg-emerald-950/60 text-emerald-300 border-emerald-900/60" };
    case "strong":   return { label: "Strong",   cls: "bg-blue-950/60 text-blue-300 border-blue-900/60" };
    default:         return { label: "Standard", cls: "bg-zinc-800 text-zinc-300 border-zinc-700" };
  }
}

export function formatBRL(value: number | null | undefined): string {
  if (value == null || isNaN(Number(value))) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency", currency: "BRL", maximumFractionDigits: 0,
  }).format(Number(value));
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null || isNaN(Number(value))) return "—";
  return new Intl.NumberFormat("pt-BR").format(Number(value));
}

export function relativeTime(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return `há ${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d2 = Math.floor(h / 24);
  if (d2 < 30) return `há ${d2}d`;
  const m = Math.floor(d2 / 30);
  if (m < 12) return `há ${m} mês${m > 1 ? "es" : ""}`;
  return `há ${Math.floor(m / 12)} ano${Math.floor(m / 12) > 1 ? "s" : ""}`;
}

export const OUTCOMES: { value: string; label: string; cls: string }[] = [
  { value: "no_answer",         label: "Sem resposta",           cls: "bg-zinc-800 text-zinc-300" },
  { value: "wrong_contact",     label: "Contato errado",         cls: "bg-zinc-800 text-zinc-300" },
  { value: "not_interested",    label: "Não interessado",        cls: "bg-rose-950/60 text-rose-300" },
  { value: "interested_later",  label: "Interesse futuro",       cls: "bg-amber-950/60 text-amber-300" },
  { value: "qualified",         label: "Qualificado",            cls: "bg-emerald-950/60 text-emerald-300" },
  { value: "meeting_scheduled", label: "Reunião agendada",       cls: "bg-blue-950/60 text-blue-300" },
  { value: "mandate_signed",    label: "Mandato assinado",       cls: "bg-emerald-700 text-white" },
  { value: "lost",              label: "Perdido",                cls: "bg-rose-900 text-rose-200" },
];

export const TIMING_OPTIONS = [
  { value: "agora",  label: "Agora" },
  { value: "6m",     label: "Em 6 meses" },
  { value: "12m+",   label: "Mais de 12 meses" },
  { value: "nao",    label: "Não pretende" },
];

export const DOR_OPTIONS = [
  { value: "sucessao",    label: "Sucessão" },
  { value: "crescimento", label: "Crescimento" },
  { value: "financeiro",  label: "Financeiro" },
  { value: "gestao",      label: "Gestão" },
  { value: "societario",  label: "Societário" },
  { value: "outra",       label: "Outra" },
];

export const UFS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT",
  "PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO",
];

export function eventIcon(eventType: string): string {
  if (eventType.includes("signal"))  return "🎯";
  if (eventType.includes("call"))    return "📞";
  if (eventType.includes("buyer"))   return "🤝";
  if (eventType.includes("opportunity")) return "💎";
  if (eventType.includes("score"))   return "📊";
  return "•";
}

export function eventDescription(eventType: string, entityId: string): string {
  const map: Record<string, string> = {
    "company.signal_added":   "Novo sinal detectado",
    "call.completed":         "Call registrada",
    "buyer.thesis_added":     "Nova tese de comprador",
    "opportunity.promoted":   "Oportunidade promovida",
  };
  const label = map[eventType] ?? eventType;
  return `${label} — ${entityId}`;
}
