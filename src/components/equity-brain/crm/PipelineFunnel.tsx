import { useMemo } from "react";
import { useMandates } from "@/hooks/useCrm";
import { InfoHint } from "@/components/equity-brain/InfoHint";
import { EB_TIPS } from "@/lib/ebTooltips";

// Lê pipeline_stage (enum equity_brain.pipeline_stage) dos mandatos.
// Mandatos sem pipeline_stage caem em "Prospecção" — ainda não entraram
// no funil M&A (cold leads, ANATEL não promovido, etc).
const STAGES: { key: string; label: string; color: string }[] = [
  { key: "__prospect__",   label: "Prospecção",     color: "bg-zinc-500" },
  { key: "match",          label: "Match",          color: "bg-amber-500" },
  { key: "nbo",            label: "NBO",            color: "bg-orange-500" },
  { key: "due_diligence",  label: "Due Diligence",  color: "bg-blue-500" },
  { key: "spa",            label: "SPA",            color: "bg-indigo-500" },
  { key: "closing",        label: "Closing",        color: "bg-emerald-500" },
  { key: "closed",         label: "Fechado",        color: "bg-emerald-700" },
];

export function PipelineFunnel() {
  const { data: mandates = [] } = useMandates();

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const m of mandates as any[]) {
      const stage = m.pipeline_stage ? String(m.pipeline_stage) : "__prospect__";
      c[stage] = (c[stage] ?? 0) + 1;
    }
    return c;
  }, [mandates]);

  const max = Math.max(1, ...STAGES.map(s => counts[s.key] ?? 0));

  return (
    <div className="bg-zinc-900/40 border border-zinc-800 rounded p-4">
      <div className="text-[10px] uppercase text-zinc-400 mb-2 flex items-center gap-1.5">
        Funil de pipeline (mandatos)
        <InfoHint {...EB_TIPS.funil_pipeline} />
      </div>
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
