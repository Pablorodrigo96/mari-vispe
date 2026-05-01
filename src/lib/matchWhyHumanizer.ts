/**
 * Tradução das features do motor de matching para linguagem humana.
 * Usado pelo MatchWhyCard no modo "plain" (default).
 */

export type FeatureLevel = "perfect" | "good" | "partial" | "weak";

const LABEL_PT: Record<string, string> = {
  setor: "Setor",
  geografia: "Geografia",
  densidade_local: "Densidade local",
  tamanho: "Porte",
  timing: "Timing (mandato ativo)",
  financeiro: "Saúde financeira",
  tese: "Tese de investimento",
  recorrencia: "Receita recorrente",
  contratos_longos: "Contratos longos",
  verticalizacao: "Verticalização",
  regulatorio: "Barreira regulatória",
  semantic_fit: "Sinergia estratégica",
  seller_intent: "Sinal de venda",
  wave_pressure: "Pressão de mercado",
  horizonte: "Horizonte do comprador",
  governanca: "Governança",
  vertical_fit: "Aderência ao vertical",
};

const ICON: Record<string, string> = {
  setor: "🏭",
  geografia: "🌎",
  densidade_local: "📍",
  tamanho: "📐",
  timing: "⏱️",
  financeiro: "💰",
  tese: "🎯",
  recorrencia: "🔁",
  contratos_longos: "📜",
  verticalizacao: "🧱",
  regulatorio: "⚖️",
  semantic_fit: "🧬",
  seller_intent: "📞",
  wave_pressure: "📊",
  horizonte: "🗓️",
  governanca: "🏛️",
  vertical_fit: "🎯",
};

function levelFor(value: number): FeatureLevel {
  if (value >= 0.85) return "perfect";
  if (value >= 0.65) return "good";
  if (value >= 0.4) return "partial";
  return "weak";
}

const BADGE: Record<FeatureLevel, string> = {
  perfect: "MATCH PERFEITO",
  good: "ENCAIXA",
  partial: "PARCIAL",
  weak: "FRACO",
};

const BADGE_CLS: Record<FeatureLevel, string> = {
  perfect: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  good: "bg-[#D9F564]/20 text-[#D9F564] border-[#D9F564]/40",
  partial: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  weak: "bg-rose-500/15 text-rose-300 border-rose-500/40",
};

/** Frase humana por feature × nível. Inclui sugestão para "weak". */
function describe(feature: string, level: FeatureLevel): string {
  const M: Record<string, Record<FeatureLevel, string>> = {
    setor: {
      perfect: "Mesmo setor — encaixe direto.",
      good: "Setores próximos / subsetor compatível.",
      partial: "Setor adjacente. Exige tese clara para justificar.",
      weak: "Setor fora da tese do comprador. Provável descarte.",
    },
    geografia: {
      perfect: "UF dentro da região-alvo do comprador.",
      good: "UF vizinha ou comprador sem restrição forte.",
      partial: "Geografia distante — pode encarecer integração.",
      weak: "Fora da área de atuação do comprador.",
    },
    densidade_local: {
      perfect: "Setor muito aquecido nessa UF — vários compradores ativos.",
      good: "Boa concentração de compradores na região.",
      partial: "Demanda regional moderada.",
      weak: "Pouca demanda local nesse vertical.",
    },
    tamanho: {
      perfect: "Faturamento dentro do range exato do comprador.",
      good: "Porte adjacente — passa no filtro de ticket.",
      partial: "Porte fora do alvo padrão. Pode exigir ajuste de ticket.",
      weak: "Porte muito distante — vai bater em 'size_mismatch'.",
    },
    timing: {
      perfect: "Mandato ativo confirmado — pronto para abordagem.",
      good: "Sinais de timing favorável.",
      partial: "Sem confirmação de mandato. Faça call de descoberta.",
      weak: "Sem nenhum indício de mandato. Priorize nutrição antes de envolver buyer.",
    },
    financeiro: {
      perfect: "Sinais financeiros sólidos e recentes.",
      good: "Saúde financeira boa.",
      partial: "Dados financeiros parciais — peça documentação.",
      weak: "Faltam dados financeiros confiáveis. Pode derrubar p(close).",
    },
    tese: {
      perfect: "Empresa aciona quase todos os gatilhos da tese.",
      good: "Empresa aciona vários gatilhos da tese do comprador.",
      partial: "Aciona poucos gatilhos da tese — score mais genérico.",
      weak: "Não aciona a tese do buyer. Investigar narrativa.",
    },
    recorrencia: {
      perfect: "Receita altamente recorrente — múltiplo elevado.",
      good: "Boa parcela de receita recorrente.",
      partial: "Recorrência limitada.",
      weak: "Receita pontual — múltiplo tende a ser menor.",
    },
    contratos_longos: {
      perfect: "Contratos plurianuais com âncoras — risco baixo.",
      good: "Tem contratos longos relevantes.",
      partial: "Poucos contratos longos.",
      weak: "Sem contratos longos — risco percebido alto.",
    },
    verticalizacao: {
      perfect: "Operação totalmente verticalizada.",
      good: "Boa verticalização.",
      partial: "Verticalização parcial.",
      weak: "Operação fragmentada — atrai menos prêmio estratégico.",
    },
    regulatorio: {
      perfect: "Setor altamente regulado — barreira alta a favor.",
      good: "Maturidade regulatória boa.",
      partial: "Regulação intermediária.",
      weak: "Setor pouco regulado — sem barreira de entrada.",
    },
    semantic_fit: {
      perfect: "Sinergia estratégica altíssima (cultura/narrativa alinhadas).",
      good: "Boa sinergia estratégica.",
      partial: "Sinergia parcial.",
      weak: "Pouca sinergia estratégica perceptível.",
    },
    seller_intent: {
      perfect: "Vendedor declarou intenção clara de transacionar.",
      good: "Sinais consistentes de intenção de venda.",
      partial: "Sinais fracos de intenção. Sondar antes do teaser.",
      weak: "Vendedor não demonstrou intenção. Ligar antes de envolver buyer.",
    },
    wave_pressure: {
      perfect: "Mercado muito aquecido — agir rápido.",
      good: "Pressão de mercado favorável.",
      partial: "Atividade de M&A morna no setor × UF.",
      weak: "Mercado parado. Janela de fechamento mais longa.",
    },
    horizonte: {
      perfect: "Horizonte do comprador casa com maturidade da empresa.",
      good: "Horizonte compatível.",
      partial: "Pequeno descasamento de horizonte.",
      weak: "Horizonte do comprador incompatível com a empresa.",
    },
    governanca: {
      perfect: "Governança forte — board, controles, compliance.",
      good: "Governança adequada.",
      partial: "Governança em estruturação.",
      weak: "Governança fraca — derruba múltiplo. Considerar consultoria de equity gap.",
    },
    vertical_fit: {
      perfect: "Aderência total ao vertical da tese.",
      good: "Boa aderência ao vertical.",
      partial: "Aderência parcial ao vertical.",
      weak: "Vertical diferente — fit fraco.",
    },
  };
  return M[feature]?.[level] ?? "—";
}

export interface HumanizedFeature {
  feature: string;
  label: string;
  icon: string;
  value: number;
  contribution: number;
  level: FeatureLevel;
  badge: string;
  badgeCls: string;
  text: string;
  pullsDown: boolean;
}

export function humanize(
  contribs: Array<{ feature: string; value: number; weight: number; contribution: number }> | null | undefined,
): HumanizedFeature[] {
  if (!contribs || !Array.isArray(contribs)) return [];
  return contribs
    .filter((c) => c && typeof c.feature === "string")
    .map((c) => {
      const v = Number(c.value ?? 0);
      const lvl = levelFor(v);
      return {
        feature: c.feature,
        label: LABEL_PT[c.feature] ?? c.feature,
        icon: ICON[c.feature] ?? "•",
        value: v,
        contribution: Number(c.contribution ?? 0),
        level: lvl,
        badge: BADGE[lvl],
        badgeCls: BADGE_CLS[lvl],
        text: describe(c.feature, lvl),
        pullsDown: Number(c.contribution ?? 0) < 0,
      };
    })
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
}

/** Gera resumo de uma frase com os 2 pontos mais positivos e o pior ponto. */
export function summarize(items: HumanizedFeature[]): string {
  if (items.length === 0) return "";
  const tops = items.filter((i) => i.level === "perfect" || i.level === "good").slice(0, 2);
  const weak = items.find((i) => i.level === "weak");
  const a = tops.map((t) => t.label.toLowerCase()).join(" e ");
  if (a && weak) return `Forte em ${a}, mas ${weak.label.toLowerCase()} puxa o score pra baixo.`;
  if (a) return `Forte em ${a}.`;
  if (weak) return `Atenção: ${weak.label.toLowerCase()} é o ponto fraco.`;
  return "";
}
