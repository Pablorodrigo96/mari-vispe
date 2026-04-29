import { Flame, Thermometer, Snowflake } from "lucide-react";
import { cn } from "@/lib/utils";

type Temp = "hot" | "warm" | "cold" | string | null | undefined;

const map: Record<string, { Icon: any; label: string; cls: string }> = {
  hot: { Icon: Flame, label: "Hot", cls: "bg-rose-500/15 text-rose-300 border-rose-700/40" },
  warm: { Icon: Thermometer, label: "Warm", cls: "bg-amber-500/15 text-amber-300 border-amber-700/40" },
  cold: { Icon: Snowflake, label: "Cold", cls: "bg-sky-500/15 text-sky-300 border-sky-700/40" },
};

export function TemperatureBadge({ temp, reason, compact = false }: { temp: Temp; reason?: string | null; compact?: boolean }) {
  const cfg = map[temp ?? "cold"] ?? map.cold;
  return (
    <span
      title={reason ?? undefined}
      className={cn("inline-flex items-center gap-1 px-2 py-0.5 border rounded text-[10px] uppercase tracking-wide", cfg.cls)}
    >
      <cfg.Icon className="h-3 w-3" />
      {!compact && cfg.label}
    </span>
  );
}
