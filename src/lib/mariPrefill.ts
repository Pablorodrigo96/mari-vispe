// Bridge entre /mari (calculadora pública) e /vender (wizard de anúncio).
// sessionStorage com TTL pra evitar prefill velho.

const KEY = "mari_prefill_v1";
const TTL_MS = 30 * 60 * 1000; // 30 min

export interface MariPrefill {
  cnpj: string;
  razaoSocial: string | null;
  uf: string | null;
  cidade: string | null;
  cnaeSection: string | null;
  porte: string | null;
  windowBase?: number;
  ts: number;
}

export function setMariPrefill(data: Omit<MariPrefill, "ts">): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...data, ts: Date.now() }));
  } catch (_) {
    /* noop */
  }
}

export function getMariPrefill(): MariPrefill | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MariPrefill;
    if (!parsed.ts || Date.now() - parsed.ts > TTL_MS) {
      sessionStorage.removeItem(KEY);
      return null;
    }
    return parsed;
  } catch (_) {
    return null;
  }
}

export function clearMariPrefill(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch (_) {
    /* noop */
  }
}

// Mapeia setor CNAE → category do wizard (12 categorias do projeto).
export function cnaeToCategory(cnaeSection: string | null | undefined): string {
  if (!cnaeSection) return "";
  const s = cnaeSection.toLowerCase();
  if (/(software|tecnolog|informática|sistema|t\.?i\.?)/.test(s)) return "tech";
  if (/(telecom|provedor|internet|sci|isp)/.test(s)) return "telecom";
  if (/(saúde|saude|clínica|clinica|hospital|médic|medic)/.test(s)) return "health";
  if (/(ensino|educa|escola|treinamento)/.test(s)) return "education";
  if (/(comércio|comercio|varejo|atacad)/.test(s)) return "commerce";
  if (/(restaurant|alimentaç|alimenta|food|bar|lanchonete|padaria)/.test(s)) return "food";
  if (/(transport|logíst|logist|frete)/.test(s)) return "logistics";
  if (/(indústri|industri|fabric|manufat)/.test(s)) return "industry";
  if (/(constru|engenhar|obra)/.test(s)) return "construction";
  if (/(energia|eletric|solar|gás|gas)/.test(s)) return "energy";
  if (/(agro|rural|pecuár|pecuar|fazenda)/.test(s)) return "agro";
  if (/(serviç|servic|consultor|advoca|contab)/.test(s)) return "services";
  return "";
}
