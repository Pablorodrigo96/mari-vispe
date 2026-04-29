import { cn } from "@/lib/utils";
import { MandateStatus, MANDATE_STATUS_COLORS, MANDATE_STATUS_LABELS } from "@/hooks/useCrm";

export function StatusBadge({ status, className }: { status?: string | null; className?: string }) {
  const s = (status ?? "vigente") as MandateStatus;
  const color = MANDATE_STATUS_COLORS[s] ?? "bg-zinc-700 text-zinc-300 border-zinc-600";
  const label = MANDATE_STATUS_LABELS[s] ?? s;
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide border",
      color, className,
    )}>
      {label}
    </span>
  );
}
