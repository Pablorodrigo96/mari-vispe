import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function SAVBadge({ score, className }: { score?: number | null; className?: string }) {
  if (score == null) return null;
  const v = Number(score);
  const cls =
    v >= 70 ? "bg-[#D9F564]/15 text-[#D9F564] border-[#D9F564]/40" :
    v >= 50 ? "bg-amber-950/60 text-amber-300 border-amber-900" :
              "bg-zinc-900 text-zinc-400 border-zinc-800";
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-semibold tabular-nums", cls, className)}>
            SAV {Math.round(v)}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-xs">
            <strong>Score Assimetria de Valor (SAV)</strong>: quanto este comprador específico tende a pagar acima da média.
            Combina sinergia de custo/receita, eliminação competitiva, geografia, custo de oportunidade e encaixe estratégico.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
