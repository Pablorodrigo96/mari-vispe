// Helpers para consolidar dados Anatel (snapshot único) + RFB.

export const PORTE_LIMITS = {
  ME: 360_000,
  EPP: 4_800_000,
} as const;

export const DEFAULT_TICKET_BRL = 90;

export function parseAcessos(v: unknown): number {
  if (v == null) return 0;
  const n = Number(String(v).replace(/[^\d-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function formatBRL(n: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);
}

export function formatNum(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("pt-BR").format(Number(n));
}

export function formatCnpj(cnpj: string): string {
  const c = String(cnpj).replace(/\D/g, "");
  if (c.length !== 14) return cnpj;
  return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`;
}

export type AnatelRow = Record<string, any>;

export interface AnatelAggregate {
  totalAcessos: number;
  tecnologias: { name: string; count: number; acessos: number }[];
  meiosAcesso: { name: string; acessos: number }[];
  faixaVelocidadePredominante: string | null;
  cidades: { cidade: string; estado: string; acessos: number; isSede: boolean }[];
  ufs: string[];
  nCidades: number;
  nUfs: number;
}

export function aggregateAnatel(
  rows: AnatelRow[],
  sede?: { uf?: string | null; municipio?: string | null },
): AnatelAggregate {
  const techMap = new Map<string, { count: number; acessos: number }>();
  const meioMap = new Map<string, number>();
  const faixaMap = new Map<string, number>();
  const cityMap = new Map<string, { cidade: string; estado: string; acessos: number }>();
  const ufSet = new Set<string>();
  let total = 0;

  for (const r of rows) {
    const a = parseAcessos(r.acessos);
    total += a;
    const tech = String(r.tecnologia ?? "—").trim() || "—";
    const t = techMap.get(tech) ?? { count: 0, acessos: 0 };
    t.count += 1; t.acessos += a; techMap.set(tech, t);
    const meio = String(r.meio_acesso ?? "—").trim() || "—";
    meioMap.set(meio, (meioMap.get(meio) ?? 0) + a);
    const faixa = String(r.faixa_velocidade ?? "—").trim() || "—";
    faixaMap.set(faixa, (faixaMap.get(faixa) ?? 0) + a);
    const cidade = String(r.cidade ?? "").trim();
    const estado = String(r.estado ?? "").trim().toUpperCase();
    if (cidade && estado) {
      const k = `${cidade}|${estado}`;
      const c = cityMap.get(k) ?? { cidade, estado, acessos: 0 };
      c.acessos += a;
      cityMap.set(k, c);
      ufSet.add(estado);
    }
  }

  const sedeUf = (sede?.uf ?? "").toUpperCase();
  const sedeMun = normalize(sede?.municipio ?? "");

  const cidades = Array.from(cityMap.values())
    .map((c) => ({ ...c, isSede: c.estado === sedeUf && normalize(c.cidade) === sedeMun }))
    .sort((a, b) => b.acessos - a.acessos);

  const tecnologias = Array.from(techMap.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.acessos - a.acessos);

  const meiosAcesso = Array.from(meioMap.entries())
    .map(([name, acessos]) => ({ name, acessos }))
    .sort((a, b) => b.acessos - a.acessos);

  const faixaPred = Array.from(faixaMap.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    totalAcessos: total,
    tecnologias,
    meiosAcesso,
    faixaVelocidadePredominante: faixaPred,
    cidades,
    ufs: Array.from(ufSet).sort(),
    nCidades: cidades.length,
    nUfs: ufSet.size,
  };
}

function normalize(s: string): string {
  return String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export interface CompanyProfileServer {
  total_acessos: number | string;
  n_cidades: number;
  n_ufs: number;
  tecnologias: { name: string; acessos: number | string }[];
  meios_acesso: { name: string; acessos: number | string }[];
  faixas: { name: string; acessos: number | string }[];
}

export function aggregateFromServer(
  p: CompanyProfileServer,
  cidadesAgg?: { cidade: string; estado: string; acessos: number; isSede?: boolean }[],
): AnatelAggregate {
  const num = (v: any) => Number(v ?? 0) || 0;
  const tecnologias = (p.tecnologias ?? []).map((t) => ({
    name: t.name, count: 0, acessos: num(t.acessos),
  }));
  const meiosAcesso = (p.meios_acesso ?? []).map((m) => ({
    name: m.name, acessos: num(m.acessos),
  }));
  const faixas = (p.faixas ?? []).slice().sort((a, b) => num(b.acessos) - num(a.acessos));
  const cidades = (cidadesAgg ?? []).map((c) => ({ ...c, isSede: !!c.isSede }));
  const ufs = Array.from(new Set(cidades.map((c) => c.estado))).sort();
  return {
    totalAcessos: num(p.total_acessos),
    tecnologias,
    meiosAcesso,
    faixaVelocidadePredominante: faixas[0]?.name ?? null,
    cidades,
    ufs,
    nCidades: p.n_cidades ?? cidades.length,
    nUfs: p.n_ufs ?? ufs.length,
  };
}

export type ExpansionStatus = "Local" | "Regional" | "Interestadual" | "Indefinido";

export function classifyExpansion(
  agg: AnatelAggregate,
  sede?: { uf?: string | null; municipio?: string | null },
): ExpansionStatus {
  if (!sede?.uf || !agg.cidades.length) return "Indefinido";
  const sedeUf = sede.uf.toUpperCase();
  const sedeMun = normalize(sede.municipio ?? "");
  const ufs = new Set(agg.cidades.map((c) => c.estado));
  if (ufs.size > 1 || !ufs.has(sedeUf)) return "Interestadual";
  // todas no mesmo estado
  const cidades = new Set(agg.cidades.map((c) => normalize(c.cidade)));
  if (cidades.size === 1 && cidades.has(sedeMun)) return "Local";
  return "Regional";
}

export function classifyPorte(porteRfb: string | null | undefined): "ME" | "EPP" | "DEMAIS" | null {
  if (!porteRfb) return null;
  const s = String(porteRfb).toUpperCase();
  if (s.includes("MICRO") || s.includes("ME") || s.includes("01")) return "ME";
  if (s.includes("PEQUENO") || s.includes("EPP") || s.includes("03")) return "EPP";
  if (s.includes("DEMAIS") || s.includes("05")) return "DEMAIS";
  return null;
}

export function porteLimit(p: ReturnType<typeof classifyPorte>): number | null {
  if (p === "ME") return PORTE_LIMITS.ME;
  if (p === "EPP") return PORTE_LIMITS.EPP;
  return null;
}
