import { useMemo } from "react";
import { useMandates } from "@/hooks/useCrm";

const STAGES = [
  { key: "vigente", label: "Vigente", color: "bg-amber-500" },
  { key: "em_negociacao", label: "Em negociação", color: "bg-emerald-500" },
  { key: "vendemos", label: "Vendemos", color: "bg-emerald-700" },
];

export function PipelineFunnel() {
  const { data: mandates = [] } = useMandates();

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const m of mandates as any[]) c[m.status] = (c[m.status] ?? 0) + 1;
    return c;
  }, [mandates]);

  const max = Math.max(1, ...STAGES.map(s => counts[s.key] ?? 0));

  return (
    <div className="bg-zinc-900/40 border border-zinc-800 rounded p-4">
      <div className="text-[10px] uppercase text-zinc-400 mb-2">Funil de pipeline (mandatos)</div>
      <div className="space-y-2">
        {STAGES.map(s => {
          const v = counts[s.key] ?? 0;
          const w = Math.max(8, Math.round((v / max) * 100));
          return (
            <div key={s.key} className="flex items-center gap-3">
              <div className="w-32 text-[11px] text-zinc-300">{s.label}</div>
              <div className="flex-1 h-5 bg-zinc-900 rounded">
                <div className={`h-5 rounded ${s.color}`} style={{ width: `${w}%` }} />
              </div>
              <div className="w-10 text-right text-xs text-zinc-100 font-semibold">{v}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
