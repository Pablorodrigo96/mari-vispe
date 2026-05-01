import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashKpiProps {
  label: string;
  value: number | string;
  format?: "int" | "currency" | "compact" | "raw";
  trend?: { value: number; label?: string };
  spark?: number[];
  accent?: "default" | "volt" | "success" | "danger" | "amber" | "cyan";
  loading?: boolean;
  size?: "default" | "hero";
}

export function DashKpi({
  label,
  value,
  format = "int",
  trend,
  spark,
  accent = "default",
  loading,
  size = "default",
}: DashKpiProps) {
  const numeric = typeof value === "number" ? value : Number(value) || 0;
  const animated = useCountUp(numeric, 800);
  const display = typeof value === "string" ? value : formatValue(animated, format);

  const accentColor = {
    default: "text-[#FAFAF7]",
    volt: "text-[#D9F564]",
    success: "text-[#00D27F]",
    danger: "text-[#FF3B6B]",
    amber: "text-[#FFB800]",
    cyan: "text-[#00C2FF]",
  }[accent];

  const sizeClass = size === "hero"
    ? "text-5xl md:text-[64px] font-extralight"
    : "text-3xl md:text-4xl font-light";

  return (
    <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-5 transition-colors hover:border-[#D9F564]/40 min-h-[140px] flex flex-col justify-between">
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6B6B68]">{label}</div>
      <div className={cn("font-mono tabular-nums tracking-tight mt-2 break-words", sizeClass, accentColor)}>
        {loading ? <span className="text-[#404040]">—</span> : display}
      </div>
      {(trend || spark) && (
        <div className="mt-3 flex items-center justify-between gap-2">
          {trend && (
            <div className={cn(
              "text-[11px] inline-flex items-center gap-1 tabular-nums",
              trend.value > 0 ? "text-[#00D27F]" : trend.value < 0 ? "text-[#FF3B6B]" : "text-[#A8A8A3]",
            )}>
              {trend.value > 0 ? <TrendingUp className="h-3 w-3" /> : trend.value < 0 ? <TrendingDown className="h-3 w-3" /> : null}
              {trend.value > 0 ? "+" : ""}{trend.value.toFixed(1)}%
              {trend.label && <span className="text-[#6B6B68] ml-1">{trend.label}</span>}
            </div>
          )}
          {spark && spark.length > 1 && <Sparkline data={spark} accent={accent} />}
        </div>
      )}
    </div>
  );
}

function useCountUp(target: number, duration = 800) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!isFinite(target)) { setN(target); return; }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setN(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return n;
}

function formatValue(n: number, format: "int" | "currency" | "compact" | "raw") {
  if (format === "raw") return String(n);
  if (format === "currency") {
    if (Math.abs(n) >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)}M`;
    if (Math.abs(n) >= 1_000) return `R$ ${(n / 1_000).toFixed(1)}k`;
    return `R$ ${Math.round(n).toLocaleString("pt-BR")}`;
  }
  if (format === "compact") {
    if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return Math.round(n).toLocaleString("pt-BR");
  }
  return Math.round(n).toLocaleString("pt-BR");
}

function Sparkline({ data, accent }: { data: number[]; accent: string }) {
  const w = 80, h = 24;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(" ");
  const stroke = accent === "danger" ? "#FF3B6B" : accent === "volt" ? "#D9F564" : "#00D27F";
  return (
    <svg width={w} height={h} className="opacity-80">
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth="1.5" />
    </svg>
  );
}
