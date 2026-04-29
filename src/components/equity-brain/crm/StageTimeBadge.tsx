import { Snowflake, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  stageChangedAt: string | null;
  slaDays: number;
  isTerminal?: boolean;
  compact?: boolean;
};

export function getStageTimeState(stageChangedAt: string | null, slaDays: number) {
  if (!stageChangedAt) return { days: 0, ratio: 0, status: "ok" as const };
  const ms = Date.now() - new Date(stageChangedAt).getTime();
  const days = Math.max(0, Math.floor(ms / 86400000));
  if (slaDays <= 0) return { days, ratio: 0, status: "ok" as const };
  const ratio = days / slaDays;
  let status: "ok" | "warn" | "frozen" = "ok";
  if (ratio >= 1) status = "frozen";
  else if (ratio >= 0.8) status = "warn";
  return { days, ratio, status };
}

export function StageTimeBadge({ stageChangedAt, slaDays, isTerminal, compact }: Props) {
  if (isTerminal) return null;
  const { days, status } = getStageTimeState(stageChangedAt, slaDays);

  const cls =
    status === "frozen"
      ? "bg-rose-500/15 text-rose-300 border-rose-700/40"
      : status === "warn"
        ? "bg-amber-500/15 text-amber-300 border-amber-700/40"
        : "bg-zinc-800 text-zinc-400 border-zinc-700/60";

  const Icon = status === "frozen" ? Snowflake : Clock;

  return (
    <span
      title={
        status === "frozen"
          ? `Congelada — ${days}d na etapa (SLA ${slaDays}d)`
          : `${days}d na etapa (SLA ${slaDays}d)`
      }
      className={cn(
        "inline-flex items-center gap-1 border rounded px-1.5 py-0.5 tabular-nums",
        compact ? "text-[9px]" : "text-[10px]",
        cls,
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {days}d
    </span>
  );
}
