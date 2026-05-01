import { useDashboardFilters, DashboardPeriodo } from "./DashboardFiltersContext";
import { X } from "lucide-react";

const PERIODOS: { v: DashboardPeriodo; l: string }[] = [
  { v: "30d", l: "30 dias" },
  { v: "90d", l: "90 dias" },
  { v: "ano", l: "Ano atual" },
  { v: "tudo", l: "Tudo" },
];

const REGIOES = ["Sudeste", "Sul", "Nordeste", "Norte", "Centro-Oeste", "Internacional"];

export function DashboardFilters() {
  const f = useDashboardFilters();
  const dirty = f.periodo !== "tudo" || f.executivos.length || f.regioes.length || f.ufs.length;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Período */}
      <div className="inline-flex items-center rounded border border-[#2A2A2A] bg-[#141414] overflow-hidden">
        {PERIODOS.map((p) => (
          <button
            key={p.v}
            onClick={() => f.setPeriodo(p.v)}
            className={
              "px-2.5 py-1 text-[11px] uppercase tracking-wider transition-colors " +
              (f.periodo === p.v
                ? "bg-[#D9F564] text-[#0A0A0A] font-semibold"
                : "text-[#A8A8A3] hover:text-[#FAFAF7]")
            }
          >
            {p.l}
          </button>
        ))}
      </div>

      {/* Região (multi-toggle) */}
      <div className="inline-flex items-center gap-1">
        {REGIOES.map((r) => {
          const on = f.regioes.includes(r);
          return (
            <button
              key={r}
              onClick={() =>
                f.setRegioes(on ? f.regioes.filter((x) => x !== r) : [...f.regioes, r])
              }
              className={
                "text-[10px] px-2 py-1 rounded border transition-colors " +
                (on
                  ? "border-[#D9F564] text-[#D9F564] bg-[#D9F564]/10"
                  : "border-[#2A2A2A] text-[#6B6B68] hover:text-[#A8A8A3] hover:border-[#404040] bg-transparent")
              }
            >
              {r}
            </button>
          );
        })}
      </div>

      {dirty && (
        <button
          onClick={f.reset}
          className="text-[10px] inline-flex items-center gap-1 px-2 py-1 rounded border border-[#2A2A2A] text-[#FF3B6B] hover:border-[#FF3B6B] bg-transparent transition-colors"
        >
          <X className="h-3 w-3" /> Limpar
        </button>
      )}
    </div>
  );
}
