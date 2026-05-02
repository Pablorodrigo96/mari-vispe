import { cn } from "@/lib/utils";

const LABELS: Record<number, { name: string; cls: string }> = {
  1: { name: "Invendável", cls: "bg-rose-950/60 text-rose-300 border-rose-900" },
  2: { name: "Vendável c/ desconto", cls: "bg-orange-950/60 text-orange-300 border-orange-900" },
  3: { name: "Múltiplo médio", cls: "bg-amber-950/60 text-amber-300 border-amber-900" },
  4: { name: "Com prêmio", cls: "bg-emerald-950/60 text-emerald-300 border-emerald-900" },
  5: { name: "Disputado", cls: "bg-[#D9F564]/15 text-[#D9F564] border-[#D9F564]/40" },
};

export function NivelBadge({ nivel, className }: { nivel?: number | null; className?: string }) {
  if (!nivel) return null;
  const l = LABELS[nivel] ?? LABELS[3];
  return (
    <div className={cn("inline-flex flex-col items-start gap-0.5 px-3 py-2 rounded border", l.cls, className)}>
      <div className="text-[10px] uppercase tracking-wider opacity-70">Nível {nivel}/5</div>
      <div className="text-sm font-semibold">{l.name}</div>
    </div>
  );
}
