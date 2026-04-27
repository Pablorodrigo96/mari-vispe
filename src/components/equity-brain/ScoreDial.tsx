import { cn } from "@/lib/utils";
import { scoreColor, scoreBg } from "@/lib/equityBrain";

interface ScoreDialProps {
  label: string;
  value: number | null | undefined;
  max?: number;
  className?: string;
}

export function ScoreDial({ label, value, max = 100, className }: ScoreDialProps) {
  const v = Math.max(0, Math.min(max, Number(value ?? 0)));
  const pct = (v / max) * 100;
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between">
        <div className="text-xs text-zinc-400">{label}</div>
        <div className={cn("text-sm font-mono tabular-nums font-bold", scoreColor(v))}>
          {Math.round(v)}<span className="text-zinc-600">/{max}</span>
        </div>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", scoreBg(v))}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
