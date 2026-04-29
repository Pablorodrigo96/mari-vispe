import { cn } from "@/lib/utils";
import { InfoHint, type InfoHintProps } from "@/components/equity-brain/InfoHint";

export function KpiTile({
  label,
  value,
  hint,
  accent = "default",
  loading,
  info,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "default" | "success" | "danger" | "warning" | "primary";
  loading?: boolean;
  info?: Omit<InfoHintProps, "side" | "align" | "className" | "iconClassName">;
}) {
  const accentClass = {
    default: "text-zinc-100",
    success: "text-emerald-300",
    danger: "text-red-300",
    warning: "text-amber-300",
    primary: "text-[#D9F564]",
  }[accent];

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4 backdrop-blur-md">
      <div className="flex items-center gap-1.5">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500 truncate">{label}</div>
        {info && <InfoHint {...info} />}
      </div>
      <div className={cn("mt-2 text-2xl font-bold tabular-nums break-words", accentClass)}>
        {loading ? "—" : value}
      </div>
      {hint && <div className="text-[10px] text-zinc-500 mt-1 break-words">{hint}</div>}
    </div>
  );
}
