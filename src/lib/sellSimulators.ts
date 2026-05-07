// Banco de perguntas e itens para os simuladores Investidor e Due Diligence.

export type InvestorCategory =
  | 'Produto/Serviço'
  | 'Mercado & Oportunidade'
  | 'Financeiro'
  | 'Clientes & Tração'
  | 'Equipe'
  | 'Estratégia & Visão';

export interface InvestorQuestion {
  id: string;
  category: InvestorCategory;
  question: string;
}

export const INVESTOR_QUESTIONS: InvestorQuestion[] = [
  { id: 'p1', category: 'Produto/Serviço', question: 'Qual é o seu diferencial competitivo principal em relação aos concorrentes?' },
  { id: 'p2', category: 'Produto/Serviço', question: 'Como seu produto/serviço resolve o problema do cliente de forma única?' },
  { id: 'p3', category: 'Produto/Serviço', question: 'Qual é o ciclo de vida típico do seu produto? Como você planeja a evolução?' },
  { id: 'm1', category: 'Mercado & Oportunidade', question: 'Qual é o tamanho total do mercado em que você atua (TAM)?' },
  { id: 'm2', category: 'Mercado & Oportunidade', question: 'Qual é seu público-alvo primário? Descreva o perfil demográfico e psicográfico.' },
  { id: 'm3', category: 'Mercado & Oportunidade', question: 'Qual é a taxa de crescimento do seu setor nos últimos 3 anos?' },
  { id: 'f1', category: 'Financeiro', question: 'Qual foi sua receita total no último ano e qual a margem bruta?' },
  { id: 'f2', category: 'Financeiro', question: 'Qual é sua projeção de receita para os próximos 2 anos?' },
  { id: 'f3', category: 'Financeiro', question: 'Qual é seu burn rate mensal (se startup) ou seu custo operacional?' },
  { id: 'f4', category: 'Financeiro', question: 'Qual é a sua estrutura de custos? Quanto gasta com pessoal, marketing e operacional?' },
  { id: 'c1', category: 'Clientes & Tração', question: 'Quantos clientes ativos você tem? Qual é o maior cliente (% da receita)?' },
  { id: 'c2', category: 'Clientes & Tração', question: 'Qual é sua taxa de churn mensal/anual? Como você a reduz?' },
  { id: 'c3', category: 'Clientes & Tração', question: 'Qual é o LTV do cliente e o CAC (custo de aquisição)?' },
  { id: 'e1', category: 'Equipe', question: 'Qual é a experiência da equipe fundadora? Já tiveram sucesso em negócios anteriores?' },
  { id: 'e2', category: 'Equipe', question: 'Qual é a estrutura atual da equipe? Quais são os principais gaps?' },
  { id: 's1', category: 'Estratégia & Visão', question: 'Como você planeja escalar a empresa nos próximos 5 anos?' },
  { id: 's2', category: 'Estratégia & Visão', question: 'Qual é sua principal estratégia de aquisição de clientes?' },
  { id: 's3', category: 'Estratégia & Visão', question: 'Qual capital você precisa levantar e como vai usar?' },
];

export type AnswerType = 'complete' | 'partial' | 'no_info';

export interface InvestorAnswer {
  question_id: string;
  type: AnswerType;
  text?: string;
}

export function scoreFromAnswers(answers: InvestorAnswer[]) {
  const complete = answers.filter(a => a.type === 'complete').length;
  const partial = answers.filter(a => a.type === 'partial').length;
  const noinfo = answers.filter(a => a.type === 'no_info').length;
  const score = complete * 10 + partial * 5;
  return { score, complete, partial, noinfo };
}

export function classifyInvestor(scoreFinal: number): {
  emoji: string; label: string; color: string;
} {
  if (scoreFinal <= 50) return { emoji: '🔴', label: 'Muito preocupante — investidor não confiaria', color: 'text-red-500' };
  if (scoreFinal <= 100) return { emoji: '🟠', label: 'Precisa de preparação — há gaps significativos', color: 'text-orange-500' };
  if (scoreFinal <= 150) return { emoji: '🟡', label: 'Bom começo — aumente sua preparação', color: 'text-yellow-500' };
  return { emoji: '🟢', label: 'Excelente — pronto para investidor', color: 'text-emerald-500' };
}

// ============ DUE DILIGENCE ============

export interface DDItem { id: string; label: string; critical?: boolean; }
export interface DDSector { id: string; name: string; items: DDItem[]; }

export const DD_SECTORS: DDSector[] = [
  {
    id: 'legal', name: 'Legal & Compliance',
    items: [
      { id: 'l1', label: 'Documento de constituição (Contrato Social/Estatuto)', critical: true },
      { id: 'l2', label: 'Registro na Junta Comercial atualizado' },
      { id: 'l3', label: 'Inscrição Municipal (Alvará de Funcionamento)' },
      { id: 'l4', label: 'Inscrição Estadual (ICMS)' },
      { id: 'l5', label: 'Inscrição Federal (CNPJ ativo)', critical: true },
      { id: 'l6', label: 'Registro de marcas e patentes (se aplicável)' },
      { id: 'l7', label: 'Política de Privacidade e LGPD implementada', critical: true },
      { id: 'l8', label: 'Termos de Serviço / Contrato padrão com clientes' },
      { id: 'l9', label: 'Conformidade com legislação trabalhista (CLT)' },
      { id: 'l10', label: 'Registro de propriedade intelectual' },
      { id: 'l11', label: 'Registro de domínio da marca e variações' },
      { id: 'l12', label: 'Certidões negativas de débitos (federal, estadual, municipal)', critical: true },
    ],
  },
  {
    id: 'financeiro', name: 'Financeiro',
    items: [
      { id: 'f1', label: 'Demonstrações financeiras dos últimos 3 anos (DRE)', critical: true },
      { id: 'f2', label: 'Balanço Patrimonial atualizado', critical: true },
      { id: 'f3', label: 'Fluxo de Caixa projetado (12 meses)' },
      { id: 'f4', label: 'Receitas segregadas por fonte/cliente' },
      { id: 'f5', label: 'Despesas categorizadas e documentadas' },
      { id: 'f6', label: 'Contas a Receber (aging report)' },
      { id: 'f7', label: 'Contas a Pagar (aging report)' },
      { id: 'f8', label: 'Endividamento detalhado (empréstimos, financiamentos)', critical: true },
      { id: 'f9', label: 'Análise de margem bruta e operacional' },
      { id: 'f10', label: 'Relatório de clientes vs. receita (concentração)' },
      { id: 'f11', label: 'Auditoria contábil (se faturamento > R$ 4,8M)', critical: true },
      { id: 'f12', label: 'Declaração de IR e impostos dos últimos 3 anos' },
      { id: 'f13', label: 'Folha de pagamento e encargos regularizados' },
      { id: 'f14', label: 'Provisões para riscos (contingências)' },
      { id: 'f15', label: 'Análise de rentabilidade por unidade/produto' },
    ],
  },
  {
    id: 'operacional', name: 'Operacional',
    items: [
      { id: 'o1', label: 'Mapa de processos da empresa' },
      { id: 'o2', label: 'Manual de operações detalhado' },
      { id: 'o3', label: 'Descrição de cargos e responsabilidades' },
      { id: 'o4', label: 'Cronograma de produção/serviços (capacidade)' },
      { id: 'o5', label: 'Fornecedores principais cadastrados' },
      { id: 'o6', label: 'Contratos com fornecedores estratégicos' },
      { id: 'o7', label: 'Certificações e conformidades operacionais' },
      { id: 'o8', label: 'Documentação de qualidade (ISO, etc.)' },
      { id: 'o9', label: 'Plano de contingência para interrupção' },
      { id: 'o10', label: 'Sistemas de TI e backups documentados' },
      { id: 'o11', label: 'Segurança física e cibernética implementada' },
      { id: 'o12', label: 'Plano de RH (contratações, treinamentos)' },
      { id: 'o13', label: 'Máquinas, equipamentos e inventário documentados' },
      { id: 'o14', label: 'SLA com clientes documentado' },
      { id: 'o15', label: 'Métricas operacionais (KPIs) históricos' },
      { id: 'o16', label: 'Análise de capacidade ociosa/utilização' },
      { id: 'o17', label: 'Cronograma de manutenção preventiva' },
      { id: 'o18', label: 'Documentação de propriedade de ativos' },
    ],
  },
  {
    id: 'comercial', name: 'Comercial & Marketing',
    items: [
      { id: 'c1', label: 'Estratégia de go-to-market documentada' },
      { id: 'c2', label: 'Análise de competidores' },
      { id: 'c3', label: 'Segmentação de clientes (personas)' },
      { id: 'c4', label: 'Histórico de clientes (aquisição, valor, status)' },
      { id: 'c5', label: 'Análise de churn (tempo médio do cliente)' },
      { id: 'c6', label: 'Campanhas de marketing (histórico de ROI)' },
      { id: 'c7', label: 'Origem de cada cliente (por canal)' },
      { id: 'c8', label: 'NPS / satisfação de clientes' },
      { id: 'c9', label: 'Contratos com top 10 clientes', critical: true },
      { id: 'c10', label: 'Análise de preço vs. mercado' },
      { id: 'c11', label: 'Plano comercial 12-24 meses' },
      { id: 'c12', label: 'Projeção de crescimento por segmento' },
      { id: 'c13', label: 'Documentação de parcerias estratégicas' },
      { id: 'c14', label: 'Dados de tráfego e conversão (se digital)' },
    ],
  },
  {
    id: 'rh', name: 'RH & Gestão de Pessoas',
    items: [
      { id: 'r1', label: 'Organograma atualizado' },
      { id: 'r2', label: 'Folha de pagamento dos últimos 12 meses' },
      { id: 'r3', label: 'Contratos de trabalho de todos os funcionários' },
      { id: 'r4', label: 'Registro de funcionários (carteira assinada)' },
      { id: 'r5', label: 'FGTS recolhido corretamente', critical: true },
      { id: 'r6', label: 'Documentação de benefícios' },
      { id: 'r7', label: 'Histórico de demissões e rescisões' },
      { id: 'r8', label: 'Certificações e qualificações da equipe' },
      { id: 'r9', label: 'Plano de desenvolvimento e treinamento' },
      { id: 'r10', label: 'Avaliações de desempenho' },
      { id: 'r11', label: 'Acordos de confidencialidade e não-concorrência' },
      { id: 'r12', label: 'Pesquisa de clima organizacional' },
    ],
  },
  {
    id: 'produto', name: 'Produto & Tecnologia',
    items: [
      { id: 't1', label: 'Roadmap de produto (6-12 meses)' },
      { id: 't2', label: 'Backlog de desenvolvimento priorizado' },
      { id: 't3', label: 'Documentação técnica do produto' },
      { id: 't4', label: 'Código-fonte versionado (Git) com histórico' },
      { id: 't5', label: 'Arquitetura de software documentada' },
      { id: 't6', label: 'Lista de tecnologias utilizadas' },
      { id: 't7', label: 'Testes automatizados e cobertura' },
      { id: 't8', label: 'Documentação de API (se aplicável)' },
      { id: 't9', label: 'Plano de segurança de dados e criptografia' },
      { id: 't10', label: 'Compliance LGPD (dados de clientes)', critical: true },
      { id: 't11', label: 'Métricas de performance (uptime, latência)' },
      { id: 't12', label: 'Feedback de usuários (bugs, features)' },
      { id: 't13', label: 'Plano de escalabilidade técnica' },
      { id: 't14', label: 'Documentação de débito técnico conhecido' },
      { id: 't15', label: 'Plano de deprecação de tecnologias antigas' },
      { id: 't16', label: 'Propriedade intelectual do código' },
    ],
  },
  {
    id: 'investimento', name: 'Financiamento & Investimento',
    items: [
      { id: 'i1', label: 'Histórico de rodadas de investimento' },
      { id: 'i2', label: 'Acionistas listados com % de participação', critical: true },
      { id: 'i3', label: 'Acordos de investimento (SAFE, nota conversível)' },
      { id: 'i4', label: 'Valuation histórico (rodadas anteriores)' },
      { id: 'i5', label: 'Deliberações de assembleia' },
      { id: 'i6', label: 'Certificado de registro de ações' },
      { id: 'i7', label: 'Plano de stock options' },
      { id: 'i8', label: 'Empréstimos pessoais de sócios à empresa' },
      { id: 'i9', label: 'Política de dividendos / retorno' },
      { id: 'i10', label: 'Projeção de burn rate e runway (se startup)' },
    ],
  },
  {
    id: 'riscos', name: 'Riscos & Contingência',
    items: [
      { id: 'x1', label: 'Litígios / ações judiciais em andamento', critical: true },
      { id: 'x2', label: 'Seguro de responsabilidade civil' },
      { id: 'x3', label: 'Seguro de propriedade (imóveis, equipamentos)' },
      { id: 'x4', label: 'Matriz de risco (impacto x probabilidade)' },
      { id: 'x5', label: 'Plano de continuidade de negócio (BCP)' },
      { id: 'x6', label: 'Dependências críticas (pessoas, sistemas)' },
      { id: 'x7', label: 'Relacionamento com agências reguladoras' },
      { id: 'x8', label: 'Passivos contingentes identificados', critical: true },
      { id: 'x9', label: 'Exposição cambial (se internacional)' },
      { id: 'x10', label: 'Penalidades / advertências recebidas' },
      { id: 'x11', label: 'Plano de mitigação de riscos estratégicos' },
    ],
  },
  {
    id: 'bi', name: 'Inteligência de Negócio',
    items: [
      { id: 'b1', label: 'Dashboard de KPIs (MRR, ARR, CAC, LTV)' },
      { id: 'b2', label: 'Análise mensal de performance vs. target' },
      { id: 'b3', label: 'Documentação de hipóteses de crescimento' },
      { id: 'b4', label: 'Evidência de execução de planos anteriores' },
      { id: 'b5', label: 'Análise de elasticidade de preço' },
      { id: 'b6', label: 'Cálculo de payback period' },
      { id: 'b7', label: 'Análise de cenários (otimista/realista/pessimista)' },
      { id: 'b8', label: 'Métricas de satisfação (NPS, CSAT)' },
      { id: 'b9', label: 'Documentação de aprendizados e pivôs' },
      { id: 'b10', label: 'Benchmarking com concorrentes' },
      { id: 'b11', label: 'Relatório de utilização de capital' },
      { id: 'b12', label: 'Projeção de break-even' },
      { id: 'b13', label: 'Documentação de moats competitivos' },
    ],
  },
];

export const DD_TOTAL_ITEMS = DD_SECTORS.reduce((s, sec) => s + sec.items.length, 0);

export type DDAnswers = Record<string, Record<string, boolean>>; // sector_id -> item_id -> yes/no

export function ddYesCount(answers: DDAnswers): number {
  let yes = 0;
  for (const sec of DD_SECTORS) {
    const block = answers[sec.id] || {};
    for (const item of sec.items) {
      if (block[item.id] === true) yes++;
    }
  }
  return yes;
}

export function ddSectorProgress(answers: DDAnswers, sectorId: string) {
  const sec = DD_SECTORS.find(s => s.id === sectorId);
  if (!sec) return { yes: 0, total: 0, answered: 0 };
  const block = answers[sectorId] || {};
  let yes = 0, answered = 0;
  for (const item of sec.items) {
    if (block[item.id] === true) { yes++; answered++; }
    else if (block[item.id] === false) answered++;
  }
  return { yes, total: sec.items.length, answered };
}

export function ddClassify(pct: number) {
  if (pct <= 20) return { emoji: '🔴', label: 'Crítico — muitos gaps', color: 'text-red-500' };
  if (pct <= 50) return { emoji: '🟠', label: 'Insuficiente — comece a documentar', color: 'text-orange-500' };
  if (pct <= 75) return { emoji: '🟡', label: 'Bom — ainda há gaps', color: 'text-yellow-500' };
  return { emoji: '🟢', label: 'Excelente — bem preparado', color: 'text-emerald-500' };
}

export function sectorColor(pct: number) {
  if (pct <= 30) return 'bg-red-500';
  if (pct <= 60) return 'bg-orange-500';
  if (pct <= 80) return 'bg-yellow-500';
  return 'bg-emerald-500';
}
