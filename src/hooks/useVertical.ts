/**
 * Vertical pré-aplicado no cockpit Equity Brain.
 *
 * - Persiste a escolha em localStorage (`eb.vertical`).
 * - Em piloto, o default é `isp` (vertical inicial da Vispe).
 * - Páginas devem aplicar `cnaeFilter` em queries de `companies` /
 *   `opportunities_ready` quando ele tiver itens.
 */

import { useEffect, useState } from "react";

export type VerticalKey =
  | "all"
  | "isp"
  | "saas"
  | "saude"
  | "educacao"
  | "servicos_b2b"
  | "agro"
  | "infra_digital"
  | "varejo"
  | "industria"
  | "energia";

const LS_KEY = "eb.vertical";

export const VERTICAL_OPTIONS: Array<{ value: VerticalKey; label: string }> = [
  { value: "all", label: "Todos os verticais" },
  { value: "isp", label: "ISP / Telecom" },
  { value: "infra_digital", label: "Infra Digital / Data Center" },
  { value: "saas", label: "SaaS / Software B2B" },
  { value: "saude", label: "Saúde / Healthtech" },
  { value: "educacao", label: "Educação / Edtech" },
  { value: "servicos_b2b", label: "Serviços B2B / Facilities" },
  { value: "agro", label: "Agro / Distribuição" },
  { value: "varejo", label: "Varejo / Consumo" },
  { value: "industria", label: "Indústria" },
  { value: "energia", label: "Energia / Resíduos" },
];

// CNAEs principais do vertical ISP/Telecom.
export const ISP_CNAES: string[] = [
  "6110801", // Serviços de telefonia fixa comutada — STFC
  "6110802", // Serviços de redes de transporte de telecomunicações — SRTT
  "6190601", // Provedores de acesso às redes de comunicações
  "6190602", // Provedores de voz sobre protocolo Internet — VoIP
  "6190699", // Outras atividades de telecomunicações n.e.
  "6120501", // Telefonia móvel celular
  "6141800", // Operadoras de TV por assinatura por cabo
  "6142600", // Operadoras de TV por assinatura por micro-ondas
];

// CNAEs auxiliares para cada vertical (subset prático para filtragem inicial).
const SAAS_CNAES = ["6201500", "6202300", "6203100", "6204000", "6209100", "6311900", "6319400", "7020400"];
const SAUDE_CNAES = ["8610101", "8610102", "8630501", "8630502", "8630503", "8640201", "8640202", "8650001", "8690999"];
const EDUCACAO_CNAES = ["8513900", "8520100", "8531700", "8532500", "8533300", "8541400", "8542200", "8550302"];
const SERVICOS_B2B_CNAES = ["8011101", "8012900", "8020001", "8121400", "8129000", "8211300", "8230001", "5611201", "5620101"];
const AGRO_CNAES = ["4623108", "4623199", "4683400", "4684201", "4684202", "4691500", "0161003"];
const INFRA_DIGITAL_CNAES = ["6311900", "6319400", "6190699"];
const VAREJO_CNAES = ["4711301", "4711302", "4712100", "4729699", "4771701", "4789004", "4781400"];
const INDUSTRIA_CNAES = ["2710401", "2733300", "2740602", "2812700", "2829199", "2830908"];
const ENERGIA_CNAES = ["3511500", "3512300", "3514000", "3811400", "3812200", "3839499"];

const VERTICAL_TO_CNAES: Record<VerticalKey, string[]> = {
  all: [],
  isp: ISP_CNAES,
  saas: SAAS_CNAES,
  saude: SAUDE_CNAES,
  educacao: EDUCACAO_CNAES,
  servicos_b2b: SERVICOS_B2B_CNAES,
  agro: AGRO_CNAES,
  infra_digital: INFRA_DIGITAL_CNAES,
  varejo: VAREJO_CNAES,
  industria: INDUSTRIA_CNAES,
  energia: ENERGIA_CNAES,
};

const VALID_KEYS = new Set<VerticalKey>(VERTICAL_OPTIONS.map((o) => o.value));

function read(): VerticalKey {
  if (typeof window === "undefined") return "isp";
  try {
    const v = localStorage.getItem(LS_KEY) as VerticalKey | null;
    if (v && VALID_KEYS.has(v)) return v;
  } catch {
    /* noop */
  }
  return "isp"; // piloto: default ISP
}

/**
 * Subscribe simples para todos os hooks reagirem a uma única mudança
 * (sem context provider novo, mantém footprint baixo).
 */
const listeners = new Set<() => void>();
function notify() {
  for (const l of listeners) l();
}

export function useVertical() {
  const [vertical, setVerticalState] = useState<VerticalKey>(read);

  useEffect(() => {
    const update = () => setVerticalState(read());
    listeners.add(update);
    // outras abas
    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_KEY) update();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(update);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const setVertical = (next: VerticalKey) => {
    try {
      localStorage.setItem(LS_KEY, next);
    } catch {
      /* noop */
    }
    notify();
  };

  // Mapeia a chave do dropdown para o valor armazenado em
  // `equity_brain.buyers.vertical_principal`. Para `isp` o nome canônico no
  // banco é `telecom`.
  const buyerVerticalKey =
    vertical === "isp" ? "telecom" : vertical === "all" ? null : vertical;

  return {
    vertical,
    setVertical,
    cnaeFilter: VERTICAL_TO_CNAES[vertical],
    buyerVerticalKey,
    isAll: vertical === "all",
    isIsp: vertical === "isp",
  };
}
