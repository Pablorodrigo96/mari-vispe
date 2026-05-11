import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  getPageGuide,
  getSectionGuide,
  type Guide,
} from "@/lib/screenGuides";
import { useFirstTimeOnPage } from "@/hooks/useFirstTimeOnPage";

interface BaseHintProps {
  guide?: Guide;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  className?: string;
  iconClassName?: string;
  /** When true, the icon pulses in Volt color (first-visit affordance). */
  pulse?: boolean;
  /** When true, opens the tooltip on mount once (first visit). */
  openOnMount?: boolean;
}

function HintTooltipContent({ guide }: { guide: Guide }) {
  return (
    <div className="space-y-2 text-xs">
      <div>
        <div className="text-[10px] uppercase tracking-wider font-bold text-[#D9F564] mb-0.5">
          Pra que serve
        </div>
        <div className="text-zinc-200 leading-snug break-words">{guide.purpose}</div>
      </div>
      {guide.doNow.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider font-bold text-emerald-400 mb-0.5">
            Faça agora
          </div>
          <ul className="text-zinc-200 leading-snug space-y-0.5 list-disc list-inside marker:text-zinc-500">
            {guide.doNow.map((item, i) => (
              <li key={i} className="break-words">{item}</li>
            ))}
          </ul>
        </div>
      )}
      {guide.risk && (
        <div>
          <div className="text-[10px] uppercase tracking-wider font-bold text-red-400 mb-0.5">
            Se não fizer
          </div>
          <div className="text-zinc-300 leading-snug break-words">{guide.risk}</div>
        </div>
      )}
      {guide.tip && (
        <div>
          <div className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 mb-0.5">
            Dica
          </div>
          <div className="text-zinc-300 leading-snug break-words">{guide.tip}</div>
        </div>
      )}
    </div>
  );
}

function HintBase({
  guide,
  side = "bottom",
  align = "start",
  className,
  iconClassName,
  pulse,
  openOnMount,
}: BaseHintProps) {
  const [open, setOpen] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (openOnMount) {
      setOpen(true);
      const t = setTimeout(() => setOpen(undefined), 4500);
      return () => clearTimeout(t);
    }
  }, [openOnMount]);

  if (!guide) return null;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={150} open={open} onOpenChange={(v) => setOpen(v ? true : undefined)}>
        <TooltipTrigger asChild>
          <button
            type="button"
            tabIndex={0}
            aria-label="Como usar essa tela"
            className={cn(
              "inline-flex items-center justify-center rounded-full text-zinc-500 hover:text-[#D9F564] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#D9F564]/60 transition-colors",
              pulse && "text-[#D9F564] animate-pulse",
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
          className="max-w-[320px] bg-zinc-950/95 border border-[#D9F564]/30 text-zinc-200 px-3 py-2.5 shadow-xl backdrop-blur-md z-[100]"
        >
          <HintTooltipContent guide={guide} />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface PageHeaderHintProps extends Omit<BaseHintProps, "guide" | "openOnMount" | "pulse"> {
  pageKey: string;
}

/**
 * (i) discreto para o header de uma página inteira.
 * Pulsa em Volt na primeira visita e abre o tooltip uma vez.
 */
export function PageHeaderHint({ pageKey, className, iconClassName, side, align }: PageHeaderHintProps) {
  const guide = getPageGuide(pageKey);
  const { isFirstVisit } = useFirstTimeOnPage(guide ? pageKey : undefined);
  if (!guide) return null;
  return (
    <HintBase
      guide={guide}
      side={side ?? "bottom"}
      align={align ?? "start"}
      className={cn("ml-1.5 align-middle", className)}
      iconClassName={cn("h-4 w-4", iconClassName)}
      pulse={isFirstVisit}
      openOnMount={isFirstVisit}
    />
  );
}

interface SectionHintProps extends Omit<BaseHintProps, "guide" | "openOnMount" | "pulse"> {
  sectionKey: string;
}

/**
 * (i) menor para blocos internos (card, tabela, kanban-column).
 * Não pulsa nem abre sozinho — depende do hover/click.
 */
export function SectionHint({ sectionKey, className, iconClassName, side, align }: SectionHintProps) {
  const guide = getSectionGuide(sectionKey);
  if (!guide) return null;
  return (
    <HintBase
      guide={guide}
      side={side ?? "top"}
      align={align ?? "center"}
      className={cn("ml-1 align-middle", className)}
      iconClassName={cn("h-3 w-3", iconClassName)}
    />
  );
}
