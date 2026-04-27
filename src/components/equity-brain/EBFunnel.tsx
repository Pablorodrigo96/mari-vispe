import { cn } from "@/lib/utils";

interface FunnelStage {
  label: string;
  value: number;
  hint?: string;
}

interface EBFunnelProps {
  stages: FunnelStage[];
  className?: string;
}

const colors = [
  "bg-zinc-700",
  "bg-blue-700",
  "bg-emerald-700",
  "bg-emerald-600",
  "bg-amber-500",
];

export function EBFunnel({ stages, className }: EBFunnelProps) {
  const max = Math.max(...stages.map((s) => s.value), 1);

  return (
    <div className={cn("space-y-2", className)}>
      {stages.map((s, i) => {
        const pct = Math.max(2, (s.value / max) * 100);
        return (
          <div key={s.label} className="grid grid-cols-[160px_1fr_auto] items-center gap-3">
            <div className="text-xs text-zinc-400 truncate">{s.label}</div>
            <div className="h-7 bg-zinc-900 rounded-md overflow-hidden border border-zinc-800">
              <div
                className={cn("h-full rounded-md transition-all", colors[i] ?? "bg-zinc-700")}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="text-sm font-mono text-zinc-200 tabular-nums w-20 text-right">
              {new Intl.NumberFormat("pt-BR").format(s.value)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
