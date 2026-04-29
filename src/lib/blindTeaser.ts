/**
 * Helpers for the universal Blind Teaser layer.
 * Mantém UI consistente sempre que dados de uma empresa/listing
 * forem renderizados em modo cego para parceiros, buyers e franqueados.
 */

export function bucketRevenue(v: number | null | undefined): string {
  if (v == null) return "n/d";
  if (v < 2_000_000) return "<R$ 2M";
  if (v < 10_000_000) return "R$ 2-10M";
  if (v < 50_000_000) return "R$ 10-50M";
  if (v < 200_000_000) return "R$ 50-200M";
  return "R$ 200M+";
}

export function bucketEmployees(v: number | null | undefined): string {
  if (v == null) return "n/d";
  if (v < 10) return "<10";
  if (v < 50) return "10-50";
  if (v < 200) return "50-200";
  if (v < 1000) return "200-1k";
  return "1k+";
}

export function maskCnpjBlind(cnpj?: string | null): string {
  if (!cnpj) return "•• ••• •••/••••-••";
  return "•• ••• •••/••••-••";
}

/** Used as a fallback when a company has no codename yet. */
export function fallbackCodename(prefix: string | null | undefined, id: string): string {
  const p = (prefix || "GEN").toUpperCase().slice(0, 4);
  const tail = id.replace(/[^a-zA-Z0-9]/g, "").slice(-4).toUpperCase();
  return `MARI-${p}-${tail}`;
}

export const DISCLOSURE_REASONS = [
  { value: "buyer_interested", label: "Tenho um comprador interessado" },
  { value: "due_diligence", label: "Quero iniciar due diligence" },
  { value: "co_broker", label: "Co-broker / parceria de mandato" },
  { value: "client_match", label: "Match com cliente do meu portfólio" },
  { value: "other", label: "Outro motivo" },
] as const;
