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
  let base = 35;
  const reasons: WindowResult["reasons"] = [];
  let dataPoints = 0;

  if (input.uf) {
    dataPoints++;
    if (STRONG_UFS.has(input.uf.toUpperCase())) {
      base += 15;
      reasons.push({ label: `Praça forte de M&A (${input.uf.toUpperCase()})`, tone: "pos" });
    } else {
      reasons.push({ label: `Mercado regional menos líquido (${input.uf.toUpperCase()})`, tone: "neutral" });
    }
  }

  if (input.cnaeSection) {
    dataPoints++;
    const hot = HOT_SECTORS.find((h) => h.match.test(input.cnaeSection!));
    if (hot) {
      base += 10;
      reasons.push({ label: hot.label, tone: "pos" });
    } else {
      reasons.push({ label: "Setor com demanda moderada de compradores", tone: "neutral" });
    }
  }

  if (input.porte) {
    dataPoints++;
    const p = input.porte.toLowerCase();
    if (/m[eé]dia|grande|demais/i.test(p)) {
      base += 5;
      reasons.push({ label: "Porte atrativo para fundos e estratégicos", tone: "pos" });
    } else if (/mei|micro/i.test(p)) {
      base -= 10;
      reasons.push({ label: "Porte pequeno reduz liquidez de compradores", tone: "neg" });
    } else {
      reasons.push({ label: `Porte declarado: ${input.porte}`, tone: "neutral" });
    }
  }

  base = Math.max(5, Math.min(92, base));
  const pessimista = Math.max(2, base - 15);
  const otimista = Math.min(96, base + 15);

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
