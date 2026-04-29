import { Check, Target } from "lucide-react";
import { cn } from "@/lib/utils";

export function QualificationBadge({
  status,
  size = "sm",
  className,
}: {
  status?: string | null;
  size?: "sm" | "xs";
  className?: string;
}) {
  if (!status) return null;
  const isQualified = status === "qualified";
  const text = isQualified ? "Qualificado" : "Não qualificado";
  const Icon = isQualified ? Check : Target;
  const sizeClass = size === "xs" ? "text-[10px] px-1.5 py-0.5" : "text-[11px] px-2 py-0.5";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border font-medium",
        sizeClass,
        isQualified
          ? "border-emerald-700/60 bg-emerald-950/40 text-emerald-300"
          : "border-zinc-700/60 bg-zinc-900/60 text-zinc-400",
        className,
      )}
      title={isQualified ? "Lead com relacionamento ativo" : "Importado da base RFB — ainda não contatado"}
    >
      <Icon className="h-3 w-3" />
      {text}
    </span>
  );
}
