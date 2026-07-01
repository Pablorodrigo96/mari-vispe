// Constantes compartilhadas do Equity Planner
export const DIMENSOES = [
  { key: "independencia_dono", label: "Independência do dono", hint: "Empresa roda 90 dias sem o dono? Relacionamentos e decisões fora da cabeça dele?" },
  { key: "qualidade_receita", label: "Qualidade da receita", hint: "Recorrência, contratos, previsibilidade, churn. Recorrente vale múltiplo maior." },
  { key: "margem", label: "Saúde da margem", hint: "Nível e trajetória do EBITDA. Margem subindo vale mais que margem caindo." },
  { key: "higiene_financeira", label: "Higiene financeira", hint: "Contabilidade gerencial separada de pessoal, números auditáveis." },
  { key: "concentracao", label: "Concentração", hint: "Cliente, fornecedor, produto, canal. Concentração = risco = desconto." },
  { key: "motor_comercial", label: "Motor comercial", hint: "Vendas repetíveis e previsíveis, com pipeline, CAC/LTV — ou é o dono vendendo?" },
  { key: "gestao", label: "Profundidade de gestão", hint: "Existe segundo nível de liderança ou tudo cabe a uma pessoa?" },
  { key: "processos", label: "Processos e sistemas", hint: "SOPs documentados vs. conhecimento tribal." },
  { key: "contingencias", label: "Contingências", hint: "Passivos trabalhistas, fiscais e processos — matam deal em DD." },
  { key: "narrativa", label: "Narrativa e TAM", hint: "Caminho de expansão crível que sustente múltiplo de crescimento." },
  { key: "atratividade", label: "Atratividade estratégica", hint: "Quantos compradores fortes se importam com este ativo?" },
  { key: "societario", label: "Estrutura societária", hint: "Societário limpo, IP/contratos no PJ, deal-ready." },
] as const;

export type DimensaoKey = typeof DIMENSOES[number]["key"];

// Grupos para UX (accordion no wizard). Cobrem as 12 dimensões, sem repetir.
export const DIMENSAO_GROUPS: {
  id: string;
  label: string;
  icon: "line-chart" | "settings" | "users" | "shield";
  keys: DimensaoKey[];
}[] = [
  { id: "financeiro", label: "Financeiro", icon: "line-chart",
    keys: ["qualidade_receita", "margem", "higiene_financeira"] },
  { id: "operacional", label: "Operacional", icon: "settings",
    keys: ["independencia_dono", "gestao", "processos"] },
  { id: "comercial", label: "Comercial & mercado", icon: "users",
    keys: ["motor_comercial", "concentracao", "narrativa", "atratividade"] },
  { id: "governanca", label: "Governança & risco", icon: "shield",
    keys: ["contingencias", "societario"] },
];

// Parser BRL: aceita "12.000.000", "12000000", "R$ 12 mi", "12,5", devolve número.
export function parseBrl(s: string | number | null | undefined): number {
  if (s === null || s === undefined) return 0;
  if (typeof s === "number") return s;
  const str = String(s).trim().toLowerCase().replace(/r\$\s*/g, "");
  if (!str) return 0;
  // sufixos mi / mil
  if (/\bmi\b|\bmilh(ão|oes|ões)/.test(str)) {
    const n = parseFloat(str.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", "."));
    return isFinite(n) ? n * 1_000_000 : 0;
  }
  if (/\bmil\b/.test(str)) {
    const n = parseFloat(str.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", "."));
    return isFinite(n) ? n * 1_000 : 0;
  }
  // formato pt-BR: 12.000.000,50 → 12000000.50
  const cleaned = str.replace(/\s/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const n = parseFloat(cleaned.replace(/[^\d.-]/g, ""));
  return isFinite(n) ? n : 0;
}

// Formatador de input BRL (mantém o dígito, insere pontos de milhar)
export function formatBrlInput(s: string): string {
  const digits = s.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("pt-BR");
}


export const ARQUETIPOS_LABEL: Record<string, string> = {
  servico_profissional: "Serviço Profissional",
  projeto_obra: "Projeto / Sob Encomenda",
  projeto_obra_estruturado: "Projeto Estruturado (escopo fechado)",
  recorrente: "Receita Recorrente / Assinatura",
  produto_ip: "Produto / IP Licenciável",
};

export const INICIATIVA_TIPO_LABEL: Record<string, { label: string; tone: "volt" | "amber" | "rose" | "slate" }> = {
  execucao: { label: "Execução", tone: "slate" },
  derisk: { label: "De-risking", tone: "amber" },
  migracao_arquetipo: { label: "Migração de modelo", tone: "volt" },
  reestruturacao_modelo: { label: "Reestruturação de modelo", tone: "volt" },
};

export const PORTE_OPTIONS = [
  { value: "micro", label: "Micro (até R$ 4.8M/ano)" },
  { value: "pequena", label: "Pequena (R$ 4.8M – R$ 30M/ano)" },
  { value: "media", label: "Média (R$ 30M – R$ 300M/ano)" },
  { value: "grande", label: "Grande (> R$ 300M/ano)" },
];

export const VEREDITO_LABEL: Record<string, { label: string; tone: "good" | "warn" | "bad" }> = {
  vendavel_hoje: { label: "Vendável hoje", tone: "good" },
  vendavel_6_12m: { label: "Vendável em 6–12 meses", tone: "warn" },
  vendavel_12_24m: { label: "Vendável em 12–24 meses", tone: "warn" },
  vendavel_em_meses: { label: "Vendável em alguns meses", tone: "warn" },
  inviavel: { label: "Inviável sem reestruturação", tone: "bad" },
  inviavel_sem_reestruturacao: { label: "Inviável sem reestruturação", tone: "bad" },
};

export function brl(n: number | null | undefined): string {
  const v = Number(n || 0);
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1).replace(".", ",")} mi`;
  if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toFixed(0)} mil`;
  return `R$ ${v.toLocaleString("pt-BR")}`;
}
