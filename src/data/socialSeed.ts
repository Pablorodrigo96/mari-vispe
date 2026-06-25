// Seeds mockados para a camada social da Mari.
// Quando houver tokens reais no banco, eles entram no feed primeiro;
// estes seeds aparecem como cards "exemplo" para garantir feed denso desde o dia 1.

import type {
  CompanyMini, StoryItem, FeedPost, DiarioEntry,
  ScoreEixo, CompanyTimeline, Comment,
} from "@/types/social";
import { photos, sectorPhoto } from "@/lib/investirPhotos";

export const seedCompanies: CompanyMini[] = [
  {
    id: "seed-1", symbol: "PADSAOJ", name: "Padaria São José",
    sector: "Alimentação", city: "Curitiba/PR",
    cover: photos.padaria, avatar: photos.padaria,
    founder: "Mariana Lopes",
  },
  {
    id: "seed-2", symbol: "MECTECH", name: "MecTech Auto Center",
    sector: "Serviços", city: "Campinas/SP",
    cover: photos.oficina, avatar: photos.oficina,
    founder: "Rafael Andrade",
  },
  {
    id: "seed-3", symbol: "BRTECH", name: "Brasiltech Soluções",
    sector: "Tecnologia", city: "Florianópolis/SC",
    cover: photos.tech, avatar: photos.tech,
    founder: "Camila Ferreira",
  },
  {
    id: "seed-4", symbol: "AGROVALE", name: "AgroVale Cooperativa",
    sector: "Agro", city: "Rio Verde/GO",
    cover: photos.industria, avatar: photos.industria,
    founder: "João Mendes",
  },
  {
    id: "seed-5", symbol: "FITPRO", name: "FitPro Studios",
    sector: "Academias", city: "Belo Horizonte/MG",
    cover: photos.servicos, avatar: photos.servicos,
    founder: "Bia Carvalho",
  },
  {
    id: "seed-6", symbol: "CLINIVIDA", name: "Clínica Vida+",
    sector: "Clínicas", city: "Porto Alegre/RS",
    cover: photos.varejo, avatar: photos.varejo,
    founder: "Dr. Eduardo Lima",
  },
];

export function makeStoriesSeed(): StoryItem[] {
  type Base = Omit<StoryItem, "id" | "slides"> & { slides: StoryItem["slides"] };
  const base: Base[] = [
    {
      company: seedCompanies[0], actor: "founder",
      founderName: "Mariana Lopes", founderAvatar: photos.padaria,
      media: photos.padaria, kind: "milestone",
      title: "Inauguração da 2ª unidade", body: "Abrimos hoje em Boa Vista 🎉",
      createdAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
      slides: [
        { media: photos.padaria, kind: "milestone", title: "Hoje a gente abre a 2ª padaria 🎉",
          body: "Boa Vista, Curitiba. Pão fresco saindo a partir das 6h." },
        { media: photos.padaria, kind: "indicator", title: "Mês fechou +41%",
          indicator: { label: "Receita", value: "R$ 310k", delta: "+41%" } },
        { media: photos.padaria, kind: "text", title: "Obrigada quem segue desde a 1ª unidade 💛",
          body: "Sem vocês acompanhando, nada disso teria sentido." },
      ],
    },
    {
      company: seedCompanies[1], actor: "company",
      media: photos.oficina, kind: "photo",
      title: "Bastidor: nova prensa hidráulica",
      createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      slides: [
        { media: photos.oficina, kind: "photo", title: "Chegou a prensa nova", body: "Capacidade da oficina dobra." },
        { media: photos.oficina, kind: "indicator", title: "Tempo médio caiu",
          indicator: { label: "Entrega", value: "2,8 dias", delta: "-46%" } },
      ],
    },
    {
      company: seedCompanies[2], actor: "founder",
      founderName: "Camila Ferreira", founderAvatar: photos.tech,
      media: photos.tech, kind: "milestone",
      title: "Fechamos contrato com 3 prefeituras",
      createdAt: new Date(Date.now() - 1000 * 60 * 200).toISOString(),
      slides: [
        { media: photos.tech, kind: "milestone", title: "3 prefeituras assinaram hoje",
          body: "Digitalização da saúde pública no Sul." },
        { media: photos.tech, kind: "indicator", title: "Receita recorrente nova",
          indicator: { label: "MRR", value: "R$ 410k", delta: "+24%" } },
      ],
    },
    {
      company: seedCompanies[3], actor: "company",
      media: photos.industria, kind: "photo",
      title: "Colheita batendo recorde",
      createdAt: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
      slides: [
        { media: photos.industria, kind: "photo", title: "Safra 2026 começou",
          body: "Plantio adiantado e clima favorável." },
        { media: photos.industria, kind: "indicator", title: "12% acima do plano",
          indicator: { label: "Receita safra", value: "R$ 14,2M", delta: "+12%" } },
      ],
    },
    {
      company: seedCompanies[4], actor: "founder",
      founderName: "Bia Carvalho", founderAvatar: photos.servicos,
      media: photos.servicos, kind: "milestone",
      title: "2.000 alunos ativos esta semana",
      createdAt: new Date(Date.now() - 1000 * 60 * 410).toISOString(),
      slides: [
        { media: photos.servicos, kind: "indicator", title: "Marca dos 2 mil alunos",
          indicator: { label: "Alunos ativos", value: "2.040", delta: "+8%" } },
        { media: photos.servicos, kind: "text", title: "Live amanhã 19h",
          body: "Falar do novo modelo de franquia e responder perguntas." },
      ],
    },
    {
      company: seedCompanies[5], actor: "company",
      media: photos.varejo, kind: "photo",
      title: "Nova ala pediátrica aberta",
      createdAt: new Date(Date.now() - 1000 * 60 * 500).toISOString(),
      slides: [
        { media: photos.varejo, kind: "photo", title: "Pediatria inaugurada",
          body: "+4 consultórios, +2 pediatras na equipe." },
      ],
    },
  ];
  return base.map((s, i) => ({ ...s, id: `story-${i}` }));
}

export function makeFeedSeed(): FeedPost[] {
  const data: Omit<FeedPost, "id">[] = [
    {
      company: seedCompanies[0],
      kind: "expansion", category: "Expansão",
      headline: "Padaria São José abre 2ª unidade em Curitiba",
      resumoIA:
        "Mariana, fundadora, inaugurou hoje uma nova padaria no bairro Boa Vista. " +
        "Faturamento projetado da nova unidade: +R$ 90 mil/mês. Time cresce de 12 para 19 pessoas.",
      media: photos.padaria,
      metrics: [
        { label: "Receita mensal", value: "R$ 310k", delta: "+41%" },
        { label: "Unidades", value: "2", delta: "+1" },
        { label: "Funcionários", value: "19", delta: "+7" },
      ],
      comments: 38, followers: 1842, investors: 217,
      rodadaPct: 78,
      createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    },
    {
      company: seedCompanies[2],
      kind: "milestone", category: "Conquistas",
      headline: "Brasiltech assina contrato com 3 prefeituras",
      resumoIA:
        "Camila Ferreira anunciou hoje um pacote de 3 contratos com prefeituras do Sul para " +
        "digitalização da saúde pública. Receita recorrente nova: R$ 1,2M/ano.",
      media: photos.tech,
      metrics: [
        { label: "MRR", value: "R$ 410k", delta: "+24%" },
        { label: "Clientes", value: "47", delta: "+3" },
        { label: "NRR", value: "118%" },
      ],
      comments: 64, followers: 3210, investors: 489,
      rodadaPct: 92,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    },
    {
      company: seedCompanies[3],
      kind: "diario", category: "Resultados",
      headline: "AgroVale: safra fecha 12% acima do esperado",
      resumoIA:
        "Resultado da safra 2026 superou plano: 12% acima da projeção, com margem 31%. " +
        "Cooperativa amplia distribuição entre os sócios em maio.",
      media: photos.industria,
      metrics: [
        { label: "Receita", value: "R$ 14,2M", delta: "+12%" },
        { label: "Margem", value: "31%", delta: "+4 p.p." },
      ],
      comments: 22, followers: 980, investors: 144,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 9).toISOString(),
    },
    {
      company: seedCompanies[4],
      kind: "live", category: "Equipe",
      headline: "FitPro: live com a fundadora amanhã às 19h",
      resumoIA:
        "Bia abre os bastidores da expansão para 4 cidades. Apresenta números do mês, " +
        "responde perguntas da comunidade e revela o novo modelo de franquia.",
      media: photos.servicos,
      metrics: [
        { label: "Alunos ativos", value: "2.040", delta: "+8%" },
        { label: "Unidades", value: "5" },
      ],
      comments: 51, followers: 1502, investors: 311,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    },
    {
      company: seedCompanies[1],
      kind: "diario", category: "Equipe",
      headline: "MecTech contrata 4 mecânicos seniores",
      resumoIA:
        "Capacidade da oficina dobra com o reforço do time. Tempo médio de entrega de 5,2 dias para 2,8 dias.",
      media: photos.oficina,
      metrics: [
        { label: "Atendimentos/mês", value: "640", delta: "+30%" },
        { label: "NPS", value: "82" },
      ],
      comments: 14, followers: 612, investors: 92,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    },
  ];
  return data.map((p, i) => ({ ...p, id: `feed-${i}` }));
}

export const seedDiario: DiarioEntry[] = [
  { id: "d1", category: "Conquistas", date: "Hoje",
    title: "Inauguração da 2ª unidade",
    body: "Abrimos em Boa Vista, com casa cheia e 320 pessoas no primeiro dia.",
    media: photos.padaria },
  { id: "d2", category: "Resultados", date: "Esta semana",
    title: "Receita +41% no mês",
    body: "Combinação de novo mix de produtos e melhoria no ticket médio." },
  { id: "d3", category: "Equipe", date: "Semana passada",
    title: "+7 contratações",
    body: "Padeiros, atendentes e gerente para a nova unidade." },
  { id: "d4", category: "Governança", date: "Há 2 semanas",
    title: "Auditoria contábil concluída",
    body: "Demonstrações revisadas por escritório independente, sem ressalvas." },
  { id: "d5", category: "Clientes", date: "Há 3 semanas",
    title: "Programa de fidelidade ativa 1.400 clientes",
    body: "Recorrência mensal subiu de 2,1 para 3,4 visitas/cliente." },
  { id: "d6", category: "Desafios", date: "Há 1 mês",
    title: "Custo do trigo +18%",
    body: "Reajuste parcial no preço final + renegociação com 2 fornecedores." },
];

export const seedScore: ScoreEixo[] = [
  { eixo: "Governança", valor: 84 },
  { eixo: "Saúde financeira", valor: 78 },
  { eixo: "Crescimento", valor: 91 },
  { eixo: "Transparência", valor: 88 },
  { eixo: "Comunicação", valor: 92 },
  { eixo: "Engajamento", valor: 86 },
  { eixo: "Histórico", valor: 72 },
  { eixo: "Compliance", valor: 95 },
  { eixo: "Atualização", valor: 89 },
];

export const seedTimeline: CompanyTimeline[] = [
  { date: "Mar/22", label: "Fundação" },
  { date: "Set/23", label: "Primeira unidade lucrativa" },
  { date: "Jan/24", label: "Auditoria contábil iniciada" },
  { date: "Jun/24", label: "Selo de governança Mari", highlight: true },
  { date: "Nov/24", label: "Entrada na Mari · valuation R$ 4,2M" },
  { date: "Abr/25", label: "Rodada aberta · R$ 800k", highlight: true },
  { date: "Hoje", label: "2ª unidade inaugurada", highlight: true },
];

export const seedComments: Comment[] = [
  { id: "c1", author: "Lucas P.", body: "Estou seguindo desde o início. Que felicidade ver crescendo!", createdAt: "2h" },
  { id: "c2", author: "Mariana (fundadora)", body: "Obrigada Lucas 💛 ainda tem muito vindo. Live na quarta!", isFounder: true, createdAt: "1h" },
  { id: "c3", author: "Ana C.", body: "Qual o ticket mínimo da rodada atual?", createdAt: "45min" },
  { id: "c4", author: "Mariana (fundadora)", body: "R$ 100, Ana 🙌 documentos completos na aba 'Rodada'.", isFounder: true, createdAt: "30min" },
];

export const sectorToCover = (sector?: string | null) => sectorPhoto(sector);
