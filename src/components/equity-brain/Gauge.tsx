import { cn } from "@/lib/utils";

interface GaugeProps {
  value: number;
  max?: number;
  label?: string;
  size?: number;
  className?: string;
}

export function Gauge({ value, max = 100, label, size = 120, className }: GaugeProps) {
  const v = Math.max(0, Math.min(max, Number(value || 0)));
  const pct = v / max;
  const radius = (size - 16) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - pct);

  const color =
    v >= 70 ? "stroke-[#D9F564]" :
    v >= 50 ? "stroke-amber-400" :
    v >= 30 ? "stroke-orange-500" : "stroke-rose-500";

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={8} className="stroke-zinc-800" fill="none" />
          <circle
            cx={size / 2} cy={size / 2} r={radius} strokeWidth={8}
            className={cn("transition-all", color)}
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round" fill="none"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-2xl font-bold tabular-nums text-zinc-100">{Math.round(v)}</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider">/{max}</div>
        </div>
      </div>
      {label && <div className="text-xs text-zinc-400 mt-1">{label}</div>}
    </div>
  );
}
