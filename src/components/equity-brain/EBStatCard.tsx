import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { InfoHint, type InfoHintProps } from "./InfoHint";

interface EBStatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  Icon?: LucideIcon;
  accent?: "emerald" | "amber" | "blue" | "rose" | "zinc";
  info?: Omit<InfoHintProps, "side" | "align" | "className" | "iconClassName">;
}

const accentMap: Record<NonNullable<EBStatCardProps["accent"]>, string> = {
  emerald: "text-emerald-400",
  amber:   "text-amber-400",
  blue:    "text-blue-400",
  rose:    "text-rose-400",
  zinc:    "text-zinc-100",
};

export function EBStatCard({ label, value, hint, Icon, accent = "zinc", info }: EBStatCardProps) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="text-xs uppercase tracking-wider text-zinc-500 truncate">{label}</div>
          {info && <InfoHint {...info} />}
        </div>
        {Icon && <Icon className="h-4 w-4 text-zinc-600 shrink-0" />}
      </div>
      <div className={cn("mt-2 text-2xl font-bold tabular-nums", accentMap[accent])}>{value}</div>
      {hint && <div className="mt-1 text-xs text-zinc-500">{hint}</div>}
    </div>
  );
}
