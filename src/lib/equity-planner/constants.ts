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

export const ARQUETIPOS_LABEL: Record<string, string> = {
  servico_profissional: "Serviço Profissional",
  projeto_obra: "Projeto / Sob Encomenda",
  recorrente: "Receita Recorrente / Assinatura",
};

export const PORTE_OPTIONS = [
  { value: "micro", label: "Micro (até R$ 4.8M/ano)" },
  { value: "pequena", label: "Pequena (R$ 4.8M – R$ 30M/ano)" },
  { value: "media", label: "Média (R$ 30M – R$ 300M/ano)" },
  { value: "grande", label: "Grande (> R$ 300M/ano)" },
];

export const VEREDITO_LABEL: Record<string, { label: string; tone: "good" | "warn" | "bad" }> = {
  vendavel_hoje: { label: "Vendável hoje", tone: "good" },
  vendavel_em_meses: { label: "Vendável em alguns meses", tone: "warn" },
  inviavel: { label: "Inviável sem reestruturação", tone: "bad" },
};

export function brl(n: number | null | undefined): string {
  const v = Number(n || 0);
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1).replace(".", ",")} mi`;
  if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toFixed(0)} mil`;
  return `R$ ${v.toLocaleString("pt-BR")}`;
}
