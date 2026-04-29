import { cn } from "@/lib/utils";
import { Regiao, REGIAO_COLORS, REGIAO_LABELS, ufToRegiao } from "@/hooks/useCrm";

export function RegionBadge({ uf, className }: { uf?: string | null; className?: string }) {
  const r = ufToRegiao(uf);
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide border",
      REGIAO_COLORS[r],
      className,
    )}>
      {REGIAO_LABELS[r]}
    </span>
  );
}
