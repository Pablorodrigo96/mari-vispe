import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Info, ArrowRight, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface CardShellProps {
  title: string;
  hint?: string;
  loading?: boolean;
  empty?: boolean;
  emptyMessage?: string;
  emptyCta?: { label: string; to: string };
  cta?: { label: string; to: string };
  accent?: "volt" | "blue" | "amber" | "emerald" | "violet";
  children?: ReactNode;
}

const ACCENT_BAR: Record<NonNullable<CardShellProps["accent"]>, string> = {
  volt: "bg-accent",
  blue: "bg-blue-500",
  amber: "bg-amber-500",
  emerald: "bg-emerald-500",
  violet: "bg-violet-500",
};

export function CardShell({
  title,
  hint,
  loading,
  empty,
  emptyMessage,
  emptyCta,
  cta,
  accent = "volt",
  children,
}: CardShellProps) {
  return (
    <Card className="relative overflow-hidden h-full flex flex-col">
      <span className={cn("absolute left-0 top-0 h-full w-0.5", ACCENT_BAR[accent])} />
      <CardContent className="p-4 flex flex-col h-full">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground break-words">
            {title}
          </h4>
          {hint && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-muted-foreground/60 hover:text-foreground shrink-0" aria-label="Info">
                    <Info className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-[240px] text-center">{hint}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        <div className="flex-1 flex flex-col">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : empty ? (
            <div className="flex-1 flex flex-col">
              <p className="text-xs text-muted-foreground break-words flex-1">
                {emptyMessage ?? "Ainda não temos sinal o bastante pra calcular."}
              </p>
              {emptyCta && (
                <Link
                  to={emptyCta.to}
                  className="mt-3 text-[11px] font-medium text-accent hover:underline inline-flex items-center gap-1"
                >
                  {emptyCta.label} <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="flex-1">{children}</div>
              {cta && (
                <Link
                  to={cta.to}
                  className="mt-3 text-[11px] font-medium text-accent hover:underline inline-flex items-center gap-1"
                >
                  {cta.label} <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
