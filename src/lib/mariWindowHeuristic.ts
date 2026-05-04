// Pure heuristic for "janela de venda 12m" — no AI calls.
// Inputs are best-effort: any field can be null.

export interface WindowInput {
  uf?: string | null;
  cnaeSection?: string | null; // CNAE primary text or code prefix
  porte?: string | null; // RFB "porte" string
}

export interface WindowResult {
  base: number; // 0-100
  pessimista: number;
  otimista: number;
  reasons: { label: string; tone: "pos" | "neg" | "neutral" }[];
  abstain: boolean;
}

const STRONG_UFS = new Set(["SP", "RJ", "MG", "RS", "PR", "SC"]);

const HOT_SECTORS = [
  { match: /telecom|provedor|isp|internet|tecnolog|software|saas|ti |informát/i, label: "Setor aquecido (Tech/ISP)" },
  { match: /saúde|saude|cl[ií]nica|hospital|odonto/i, label: "Setor aquecido (Saúde)" },
  { match: /educa[çc]/i, label: "Setor aquecido (Educação)" },
  { match: /alimentos|aliment|bebida/i, label: "Setor consolidando (Alimentos)" },
];

export function computeWindow(input: WindowInput): WindowResult {
  // Janela 24 meses → base mais otimista (mais tempo = mais chance de match real)
  let base = 58;
  const reasons: WindowResult["reasons"] = [];
  let dataPoints = 0;

  if (input.uf) {
    dataPoints++;
    if (STRONG_UFS.has(input.uf.toUpperCase())) {
      base += 18;
      reasons.push({ label: `Praça forte de M&A (${input.uf.toUpperCase()})`, tone: "pos" });
    } else {
      base += 4;
      reasons.push({ label: `Mercado regional em consolidação (${input.uf.toUpperCase()})`, tone: "neutral" });
    }
  }

  if (input.cnaeSection) {
    dataPoints++;
    const hot = HOT_SECTORS.find((h) => h.match.test(input.cnaeSection!));
    if (hot) {
      base += 14;
      reasons.push({ label: hot.label, tone: "pos" });
    } else {
      base += 3;
      reasons.push({ label: "Setor com demanda ativa de compradores", tone: "neutral" });
    }
  }

  if (input.porte) {
    dataPoints++;
    const p = input.porte.toLowerCase();
    if (/m[eé]dia|grande|demais/i.test(p)) {
      base += 8;
      reasons.push({ label: "Porte atrativo para fundos e estratégicos", tone: "pos" });
    } else if (/mei|micro/i.test(p)) {
      base -= 4;
      reasons.push({ label: "Porte pequeno: foco em compradores estratégicos locais", tone: "neutral" });
    } else {
      base += 2;
      reasons.push({ label: `Porte ${input.porte} no radar de compradores`, tone: "pos" });
    }
  }

  base = Math.max(35, Math.min(95, base));
  const pessimista = Math.max(20, base - 12);
  const otimista = Math.min(98, base + 10);

  return {
    base,
    pessimista,
    otimista,
    reasons: reasons.slice(0, 3),
    abstain: dataPoints < 2,
  };
}

export function maskCnpj(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function isValidCnpj(value: string): boolean {
  return value.replace(/\D/g, "").length === 14;
}
