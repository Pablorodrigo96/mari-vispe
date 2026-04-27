/**
 * Vertical pré-aplicado no cockpit Equity Brain.
 *
 * - Persiste a escolha em localStorage (`eb.vertical`).
 * - Em piloto, o default é `isp` (vertical inicial da Vispe).
 * - Páginas devem aplicar `cnaeFilter` em queries de `companies` /
 *   `opportunities_ready` quando ele tiver itens.
 */

import { useEffect, useState } from "react";

export type VerticalKey = "all" | "isp";

const LS_KEY = "eb.vertical";

export const VERTICAL_OPTIONS: Array<{ value: VerticalKey; label: string }> = [
  { value: "all", label: "Todos os verticais" },
  { value: "isp", label: "ISP / Telecom" },
];

// CNAEs principais do vertical ISP/Telecom.
export const ISP_CNAES: string[] = [
  "6110801", // Serviços de telefonia fixa comutada — STFC
  "6110802", // Serviços de redes de transporte de telecomunicações — SRTT
  "6190601", // Provedores de acesso às redes de comunicações
  "6190602", // Provedores de voz sobre protocolo Internet — VoIP
  "6190699", // Outras atividades de telecomunicações n.e.
  "6120501", // Telefonia móvel celular
  "6141800", // Operadoras de televisão por assinatura por cabo
  "6142600", // Operadoras de televisão por assinatura por micro-ondas
];

const VERTICAL_TO_CNAES: Record<VerticalKey, string[]> = {
  all: [],
  isp: ISP_CNAES,
};

function read(): VerticalKey {
  if (typeof window === "undefined") return "isp";
  try {
    const v = localStorage.getItem(LS_KEY) as VerticalKey | null;
    if (v === "all" || v === "isp") return v;
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

  return {
    vertical,
    setVertical,
    cnaeFilter: VERTICAL_TO_CNAES[vertical],
    isAll: vertical === "all",
    isIsp: vertical === "isp",
  };
}
