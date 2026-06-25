export type CompanyMini = {
  id: string;
  symbol: string;
  name: string;
  sector?: string | null;
  cover?: string;
  avatar?: string;
  founder?: string;
  city?: string;
};

export type StorySlide = {
  media: string;
  kind: "photo" | "video" | "milestone" | "text" | "indicator" | "real_image" | "real_video" | "instagram_embed" | "auto";
  title: string;
  body?: string;
  indicator?: { label: string; value: string; delta?: string };
  /** Para slides reais importados pelo fundador */
  realSourceUrl?: string;
  /** Overlay narrativo dos stories auto-gerados */
  overlay?: {
    kpi_label?: string;
    kpi_value?: string;
    delta?: string;
    headline?: string;
    sub?: string;
  };
};

export type StoryItem = {
  id: string;
  company: CompanyMini;
  actor: "company" | "founder";
  founderName?: string;
  founderAvatar?: string;
  slides: StorySlide[];
  // legado (1 slide compat)
  media: string;
  kind: "photo" | "video" | "milestone" | "text" | "indicator" | "real_image" | "real_video" | "instagram_embed" | "auto";
  title: string;
  body?: string;
  ctaLabel?: string;
  createdAt: string;
  /** Marca quando slides vieram de import real (não-seed) — anel pulsante "AO VIVO" */
  isLive?: boolean;
  /** Stories auto-gerados por IA (5 slides, ticket R$50) */
  isAuto?: boolean;
};

export type FeedPost = {
  id: string;
  company: CompanyMini;
  kind: "diario" | "live" | "milestone" | "expansion";
  category: string;
  headline: string;
  resumoIA: string;
  media: string;
  metrics?: { label: string; value: string; delta?: string }[];
  comments: number;
  followers: number;
  investors: number;
  createdAt: string;
  rodadaPct?: number;
};

export type DiarioEntry = {
  id: string;
  category:
    | "Resultados"
    | "Expansão"
    | "Governança"
    | "Clientes"
    | "Equipe"
    | "Financeiro"
    | "Conquistas"
    | "Desafios";
  date: string;
  title: string;
  body: string;
  media?: string;
};

export type ScoreEixo = {
  eixo: string;
  valor: number; // 0-100
};

export type CompanyTimeline = {
  date: string;
  label: string;
  highlight?: boolean;
};

export type Comment = {
  id: string;
  author: string;
  avatar?: string;
  body: string;
  isFounder?: boolean;
  createdAt: string;
};

export const HUMAN_CATEGORIES = [
  { id: "restaurantes", label: "Restaurantes", emoji: "🍽️" },
  { id: "clinicas", label: "Clínicas", emoji: "🩺" },
  { id: "agro", label: "Agro", emoji: "🌾" },
  { id: "academias", label: "Academias", emoji: "🏋️" },
  { id: "industria", label: "Indústrias", emoji: "🏭" },
  { id: "construcao", label: "Construção", emoji: "🏗️" },
  { id: "franquias", label: "Franquias", emoji: "🛍️" },
  { id: "tecnologia", label: "Tecnologia", emoji: "💻" },
  { id: "educacao", label: "Educação", emoji: "📚" },
  { id: "logistica", label: "Logística", emoji: "🚚" },
] as const;
