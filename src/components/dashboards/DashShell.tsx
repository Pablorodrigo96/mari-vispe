import { ReactNode, useEffect } from "react";
import { Download, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashShellProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  liveAge?: number; // segundos desde último refresh
  onRefresh?: () => void;
  onExport?: () => void;
  filters?: ReactNode;
  children: ReactNode;
}

export function DashShell({
  eyebrow = "DASHBOARD",
  title,
  subtitle,
  liveAge,
  onRefresh,
  onExport,
  filters,
  children,
}: DashShellProps) {
  // keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") return;
      if (e.key === "r" && onRefresh) { e.preventDefault(); onRefresh(); }
      if (e.key === "e" && onExport) { e.preventDefault(); onExport(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onRefresh, onExport]);

  return (
    <div className="min-h-full bg-[#0A0A0A] text-[#FAFAF7]">
      <header className="px-8 py-6 border-b border-[#1F1F1F]">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#D9F564]">
              {eyebrow}
            </div>
            <h1 className="font-light text-3xl md:text-[32px] mt-1 tracking-tight">{title}</h1>
            {subtitle && (
              <p className="text-xs text-[#A8A8A3] mt-1 break-words max-w-2xl">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <LiveDot ageSeconds={liveAge} />
            {onExport && (
              <button
                onClick={onExport}
                className="text-[11px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#2A2A2A] text-[#A8A8A3] hover:text-[#FAFAF7] hover:border-[#D9F564] transition-colors bg-transparent"
              >
                <Download className="h-3 w-3" /> Exportar
                <kbd className="ml-1 text-[9px] px-1 py-0.5 rounded bg-[#1F1F1F] text-[#6B6B68]">E</kbd>
              </button>
            )}
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="text-[11px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#2A2A2A] text-[#A8A8A3] hover:text-[#FAFAF7] hover:border-[#D9F564] transition-colors bg-transparent"
              >
                <RefreshCw className="h-3 w-3" /> Refresh
                <kbd className="ml-1 text-[9px] px-1 py-0.5 rounded bg-[#1F1F1F] text-[#6B6B68]">R</kbd>
              </button>
            )}
          </div>
        </div>
        {filters && <div className="mt-4 flex flex-wrap gap-2 items-center">{filters}</div>}
      </header>
      <div className="p-6 md:p-8 space-y-6">{children}</div>
    </div>
  );
}

function LiveDot({ ageSeconds }: { ageSeconds?: number }) {
  const label = typeof ageSeconds === "number"
    ? `Atualizado há ${ageSeconds < 60 ? `${ageSeconds}s` : `${Math.floor(ageSeconds / 60)}min`}`
    : "Live";
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-[#A8A8A3] uppercase tracking-wider" title={label}>
      <span className="relative inline-flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-[#00D27F] opacity-75 animate-ping" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00D27F]" />
      </span>
      <span>{label}</span>
    </div>
  );
}

export function DashCard({
  title,
  action,
  children,
  className,
  span = "default",
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  span?: "default" | "wide";
}) {
  return (
    <div
      className={cn(
        "bg-[#141414] border border-[#2A2A2A] rounded-xl p-6 transition-colors hover:border-[#D9F564]/40",
        span === "wide" && "col-span-full",
        className,
      )}
    >
      {title && (
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#2A2A2A]">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#A8A8A3]">{title}</h3>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
