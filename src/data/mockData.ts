// Mock data for DealFlow marketplace

export interface Business {
  id: string;
  title: string;
  category: string;
  subcategory: string;
  location: {
    city: string;
    state: string;
  };
  financials: {
    annualRevenue: number;
    netProfit: number;
    ebitda: number;
    askingPrice: number;
  };
  description: string;
  highlights: string[];
  badges: ('verified' | 'exclusive' | 'profitable' | 'new')[];
  images: string[];
  seller: {
    id: string;
    name: string;
    avatar?: string;
    rating: number;
    responseTime: string;
  };
  createdAt: string;
  views: number;
  favorites: number;
}

export const categories = [
  { id: 'tech', label: 'Tecnologia & SaaS', icon: '💻' },
  { id: 'commerce', label: 'Comércio & Varejo', icon: '🛒' },
  { id: 'industry', label: 'Indústria', icon: '🏭' },
  { id: 'services', label: 'Serviços', icon: '💼' },
  { id: 'food', label: 'Alimentação', icon: '🍽️' },
  { id: 'health', label: 'Saúde & Bem-estar', icon: '🏥' },
  { id: 'education', label: 'Educação', icon: '📚' },
  { id: 'logistics', label: 'Logística', icon: '🚚' },
];

export const states = [
  'São Paulo', 'Rio de Janeiro', 'Minas Gerais', 'Paraná', 'Santa Catarina',
  'Rio Grande do Sul', 'Bahia', 'Pernambuco', 'Ceará', 'Distrito Federal'
];

export const revenueRanges = [
  { id: 'r1', label: 'Até R$ 500 mil', min: 0, max: 500000 },
  { id: 'r2', label: 'R$ 500 mil - R$ 1 milhão', min: 500000, max: 1000000 },
  { id: 'r3', label: 'R$ 1 milhão - R$ 5 milhões', min: 1000000, max: 5000000 },
  { id: 'r4', label: 'R$ 5 milhões - R$ 20 milhões', min: 5000000, max: 20000000 },
  { id: 'r5', label: 'Acima de R$ 20 milhões', min: 20000000, max: Infinity },
];

export const priceRanges = [
  { id: 'p1', label: 'Até R$ 200 mil', min: 0, max: 200000 },
  { id: 'p2', label: 'R$ 200 mil - R$ 500 mil', min: 200000, max: 500000 },
  { id: 'p3', label: 'R$ 500 mil - R$ 1 milhão', min: 500000, max: 1000000 },
  { id: 'p4', label: 'R$ 1 milhão - R$ 5 milhões', min: 1000000, max: 5000000 },
  { id: 'p5', label: 'Acima de R$ 5 milhões', min: 5000000, max: Infinity },
];

export const mockBusinesses: Business[] = [
  {
    id: '1',
    title: 'E-commerce de Moda Feminina Premium',
    category: 'commerce',
    subcategory: 'E-commerce',
    location: { city: 'São Paulo', state: 'São Paulo' },
    financials: {
      annualRevenue: 2400000,
      netProfit: 480000,
      ebitda: 520000,
      askingPrice: 1800000,
    },
    description: 'E-commerce consolidado no mercado de moda feminina premium com mais de 5 anos de operação. Base de clientes fidelizada e marca reconhecida.',
    highlights: ['Base de 15.000 clientes ativos', 'Margem líquida de 20%', 'Crescimento de 35% ao ano'],
    badges: ['verified', 'profitable'],
    images: [],
    seller: {
      id: 's1',
      name: 'Marina Silva',
      rating: 4.8,
      responseTime: '< 2 horas',
    },
    createdAt: '2024-01-10',
    views: 1234,
    favorites: 89,
  },
  {
    id: '2',
    title: 'SaaS de Gestão para Clínicas Médicas',
    category: 'tech',
    subcategory: 'SaaS',
    location: { city: 'Curitiba', state: 'Paraná' },
    financials: {
      annualRevenue: 1800000,
      netProfit: 720000,
      ebitda: 800000,
      askingPrice: 4000000,
    },
    description: 'Plataforma SaaS B2B para gestão de clínicas médicas com mais de 200 clientes ativos. Receita recorrente e baixo churn.',
    highlights: ['MRR de R$ 150k', 'Churn < 2%', '200+ clínicas ativas'],
    badges: ['verified', 'exclusive', 'profitable'],
    images: [],
    seller: {
      id: 's2',
      name: 'Tech Ventures',
      rating: 5.0,
      responseTime: '< 1 hora',
    },
    createdAt: '2024-01-08',
    views: 2567,
    favorites: 156,
  },
  {
    id: '3',
    title: 'Rede de Academias - 3 Unidades',
    category: 'health',
    subcategory: 'Fitness',
    location: { city: 'Rio de Janeiro', state: 'Rio de Janeiro' },
    financials: {
      annualRevenue: 3600000,
      netProfit: 540000,
      ebitda: 650000,
      askingPrice: 2500000,
    },
    description: 'Rede de academias premium com 3 unidades em bairros nobres do RJ. Equipamentos de última geração e equipe treinada.',
    highlights: ['4.500 alunos ativos', '3 unidades próprias', 'Contratos de longo prazo'],
    badges: ['verified', 'new'],
    images: [],
    seller: {
      id: 's3',
      name: 'Carlos Mendes',
      rating: 4.5,
      responseTime: '< 4 horas',
    },
    createdAt: '2024-01-12',
    views: 890,
    favorites: 67,
  },
  {
    id: '4',
    title: 'Fábrica de Alimentos Congelados',
    category: 'industry',
    subcategory: 'Alimentício',
    location: { city: 'Campinas', state: 'São Paulo' },
    financials: {
      annualRevenue: 8500000,
      netProfit: 1275000,
      ebitda: 1500000,
      askingPrice: 6000000,
    },
    description: 'Indústria de alimentos congelados com marca própria e contratos com grandes redes de supermercados. Capacidade produtiva para dobrar faturamento.',
    highlights: ['Contratos com 5 grandes redes', 'Certificação ANVISA', 'Capacidade ociosa de 50%'],
    badges: ['verified', 'exclusive', 'profitable'],
    images: [],
    seller: {
      id: 's4',
      name: 'Grupo Alimentar SA',
      rating: 4.9,
      responseTime: '< 24 horas',
    },
    createdAt: '2024-01-05',
    views: 3421,
    favorites: 234,
  },
  {
    id: '5',
    title: 'Escola de Idiomas - Franquia Master',
    category: 'education',
    subcategory: 'Cursos',
    location: { city: 'Belo Horizonte', state: 'Minas Gerais' },
    financials: {
      annualRevenue: 1200000,
      netProfit: 300000,
      ebitda: 350000,
      askingPrice: 900000,
    },
    description: 'Franquia master de escola de idiomas com território exclusivo em BH. Modelo de negócio validado e suporte da franqueadora.',
    highlights: ['800 alunos matriculados', 'Território exclusivo', 'Marca nacionalmente conhecida'],
    badges: ['verified', 'profitable'],
    images: [],
    seller: {
      id: 's5',
      name: 'Paulo Roberto',
      rating: 4.7,
      responseTime: '< 6 horas',
    },
    createdAt: '2024-01-09',
    views: 678,
    favorites: 45,
  },
  {
    id: '6',
    title: 'Restaurante Fine Dining - Jardins SP',
    category: 'food',
    subcategory: 'Restaurante',
    location: { city: 'São Paulo', state: 'São Paulo' },
    financials: {
      annualRevenue: 4200000,
      netProfit: 630000,
      ebitda: 750000,
      askingPrice: 3200000,
    },
    description: 'Restaurante fine dining premiado na região dos Jardins. Chef renomado e clientela fiel. Excelente localização com contrato de aluguel favorável.',
    highlights: ['Avaliação 4.9 no Google', 'Chef com estrela Michelin', 'Contrato de 10 anos'],
    badges: ['exclusive', 'profitable'],
    images: [],
    seller: {
      id: 's6',
      name: 'Gastronomia Holdings',
      rating: 4.6,
      responseTime: '< 12 horas',
    },
    createdAt: '2024-01-07',
    views: 1567,
    favorites: 123,
  },
  {
    id: '7',
    title: 'Transportadora Regional - Frota Própria',
    category: 'logistics',
    subcategory: 'Transporte',
    location: { city: 'Joinville', state: 'Santa Catarina' },
    financials: {
      annualRevenue: 5800000,
      netProfit: 580000,
      ebitda: 870000,
      askingPrice: 3500000,
    },
    description: 'Transportadora com frota própria de 25 caminhões e contratos fixos com indústrias da região Sul. Licenças e alvará regularizados.',
    highlights: ['25 caminhões próprios', 'Contratos de 3 anos', 'Zero passivo trabalhista'],
    badges: ['verified', 'profitable'],
    images: [],
    seller: {
      id: 's7',
      name: 'Logística Sul',
      rating: 4.4,
      responseTime: '< 8 horas',
    },
    createdAt: '2024-01-11',
    views: 445,
    favorites: 34,
  },
  {
    id: '8',
    title: 'Agência de Marketing Digital',
    category: 'services',
    subcategory: 'Marketing',
    location: { city: 'Florianópolis', state: 'Santa Catarina' },
    financials: {
      annualRevenue: 960000,
      netProfit: 336000,
      ebitda: 380000,
      askingPrice: 1200000,
    },
    description: 'Agência boutique de marketing digital com foco em e-commerces. Equipe enxuta e especializada, modelo 100% remoto.',
    highlights: ['35% margem líquida', 'Contratos recorrentes', 'Equipe 100% CLT'],
    badges: ['verified', 'new', 'profitable'],
    images: [],
    seller: {
      id: 's8',
      name: 'Digital Minds',
      rating: 4.8,
      responseTime: '< 3 horas',
    },
    createdAt: '2024-01-13',
    views: 789,
    favorites: 56,
  },
];

export const stats = {
  totalListings: 1234,
  totalTransactions: 567,
  totalVolume: 2500000000,
  averageTime: 45,
};
