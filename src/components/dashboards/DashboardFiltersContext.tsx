import { createContext, useContext, useMemo, useState, ReactNode } from "react";

export type DashboardPeriodo = "30d" | "90d" | "ano" | "tudo";

export interface DashboardFilters {
  periodo: DashboardPeriodo;
  executivos: string[]; // user_ids
  regioes: string[];
  ufs: string[];
}

export interface DashboardFiltersCtx extends DashboardFilters {
  setPeriodo: (p: DashboardPeriodo) => void;
  setExecutivos: (v: string[]) => void;
  setRegioes: (v: string[]) => void;
  setUfs: (v: string[]) => void;
  reset: () => void;
  /** ISO date for queries (`created_at >= sinceISO`), null = sem filtro temporal */
  sinceISO: string | null;
}

const DEFAULT: DashboardFilters = { periodo: "tudo", executivos: [], regioes: [], ufs: [] };

const Ctx = createContext<DashboardFiltersCtx | null>(null);

export function DashboardFiltersProvider({ children }: { children: ReactNode }) {
  const [periodo, setPeriodo] = useState<DashboardPeriodo>(DEFAULT.periodo);
  const [executivos, setExecutivos] = useState<string[]>(DEFAULT.executivos);
  const [regioes, setRegioes] = useState<string[]>(DEFAULT.regioes);
  const [ufs, setUfs] = useState<string[]>(DEFAULT.ufs);

  const sinceISO = useMemo(() => {
    if (periodo === "tudo") return null;
    const d = new Date();
    if (periodo === "30d") d.setDate(d.getDate() - 30);
    else if (periodo === "90d") d.setDate(d.getDate() - 90);
    else if (periodo === "ano") d.setMonth(0, 1);
    return d.toISOString();
  }, [periodo]);

  const value = useMemo<DashboardFiltersCtx>(() => ({
    periodo, executivos, regioes, ufs,
    setPeriodo, setExecutivos, setRegioes, setUfs,
    reset: () => { setPeriodo("tudo"); setExecutivos([]); setRegioes([]); setUfs([]); },
    sinceISO,
  }), [periodo, executivos, regioes, ufs, sinceISO]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDashboardFilters(): DashboardFiltersCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDashboardFilters must be used inside DashboardFiltersProvider");
  return ctx;
}
