import { Lock, Unlock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface BlindBadgeProps {
  unlocked?: boolean;
  className?: string;
}

export function BlindBadge({ unlocked, className }: BlindBadgeProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
              unlocked
                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                : "bg-amber-500/10 text-amber-300 border border-amber-500/30",
              className,
            )}
          >
            {unlocked ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
            {unlocked ? "Identidade liberada" : "Blind teaser"}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          {unlocked
            ? "Você tem acesso temporário à identidade real desta empresa."
            : "Identidade omitida. Solicite abertura via Advisor Vispe para ver CNPJ, razão social e contatos."}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
