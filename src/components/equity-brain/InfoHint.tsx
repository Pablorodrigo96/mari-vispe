import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface InfoHintProps {
  /** Optional title shown in bold at the top of the tooltip. */
  title?: string;
  /** What the indicator means. */
  what: string;
  /** Practical action the user can take. */
  action?: string;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  className?: string;
  iconClassName?: string;
}

/**
 * Small (i) icon with a 2-part tooltip:
 * 1) "O que é"
 * 2) "O que fazer"
 *
 * Usage:
 *   <InfoHint what="..." action="..." />
 */
export function InfoHint({
  title,
  what,
  action,
  side = "top",
  align = "center",
  className,
  iconClassName,
}: InfoHintProps) {
  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <button
          type="button"
          tabIndex={0}
          aria-label={title ? `Sobre: ${title}` : "Mais informações"}
          className={cn(
            "inline-flex items-center justify-center rounded-full text-zinc-500 hover:text-zinc-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400/60 transition-colors",
            className,
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <Info className={cn("h-3.5 w-3.5", iconClassName)} />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side={side}
        align={align}
        className="max-w-[280px] bg-zinc-950/95 border-zinc-800 text-zinc-200 px-3 py-2.5 shadow-xl backdrop-blur-md"
      >
        {title && (
          <div className="text-[11px] uppercase tracking-wider font-bold text-[#D9F564] mb-1">
            {title}
          </div>
        )}
        <div className="text-xs text-zinc-200 leading-relaxed break-words">
          <span className="text-zinc-500 font-medium">O que é: </span>
          {what}
        </div>
        {action && (
          <div className="text-xs text-zinc-200 leading-relaxed break-words mt-1.5">
            <span className="text-emerald-400 font-medium">O que fazer: </span>
            {action}
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
