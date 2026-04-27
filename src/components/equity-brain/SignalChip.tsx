import { cn } from "@/lib/utils";
import { weightColor } from "@/lib/equityBrain";

interface SignalChipProps {
  signalKey: string;
  weight?: number | null;
  className?: string;
}

export function SignalChip({ signalKey, weight, className }: SignalChipProps) {
  const c = weightColor(weight);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border",
        c.bg, c.text, c.border,
        className,
      )}
    >
      <span>{signalKey}</span>
      {weight != null && (
        <span className="tabular-nums opacity-70">·{Number(weight).toFixed(2)}</span>
      )}
    </span>
  );
}
