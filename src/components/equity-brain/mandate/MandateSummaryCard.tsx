import { CalendarClock, TrendingUp, DollarSign, Layers, MapPin, Percent } from "lucide-react";
import { formatBRL } from "@/lib/equityBrain";

interface Props {
  mandate: any;
}

function formatDate(v?: string | null) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleDateString("pt-BR");
  } catch {
    return v;
  }
}

function probColor(p?: number | null) {
  if (p == null) return "text-zinc-300";
  if (p >= 70) return "text-emerald-300";
  if (p >= 40) return "text-amber-300";
  return "text-rose-300";
}

export function MandateSummaryCard({ mandate }: Props) {
  const probability = mandate?.probability as number | null | undefined;
  const expected = mandate?.expected_close_at as string | null | undefined;
  const valorOp = mandate?.valor_operacao as number | null | undefined;
  const faturamentoVispe = mandate?.faturamento_vispe as number | null | undefined;
  const commissionPct = (mandate?.commission_pct ?? mandate?.comissao_pct) as number | null | undefined;
  const pipelineStage = mandate?.pipeline_stage as string | null | undefined;
  const regiao = mandate?.regiao as string | null | undefined;

  const items: Array<{ Icon: any; label: string; value: React.ReactNode; tone?: string }> = [
    {
      Icon: TrendingUp,
      label: "Probabilidade",
      value: probability != null ? `${probability}%` : "—",
      tone: probColor(probability),
    },
    {
      Icon: CalendarClock,
      label: "Fechamento esperado",
      value: formatDate(expected),
    },
    {
      Icon: Layers,
      label: "Estágio",
      value: pipelineStage ?? "—",
    },
    {
      Icon: DollarSign,
      label: "Valor da operação",
      value: valorOp != null ? formatBRL(valorOp) : "—",
    },
    {
      Icon: Percent,
      label: "Comissão",
      value: commissionPct != null ? `${commissionPct}%` : "—",
    },
    {
      Icon: DollarSign,
      label: "Faturamento Vispe",
      value: faturamentoVispe != null ? formatBRL(faturamentoVispe) : "—",
      tone: "text-emerald-300",
    },
    {
      Icon: MapPin,
      label: "Região",
      value: regiao ?? mandate?.uf ?? "—",
    },
  ];

  return (
    <div className="bg-zinc-900/40 border border-zinc-800 rounded p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] uppercase tracking-wider text-zinc-400">Resumo do mandato</div>
        {mandate?.temperature_reason && (
          <div className="text-[10px] text-zinc-500 italic max-w-[60%] text-right break-words">
            {mandate.temperature_reason}
          </div>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5">
        {items.map((it) => (
          <div key={it.label} className="flex items-start gap-2 min-w-0">
            <it.Icon className="h-3.5 w-3.5 text-zinc-500 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] uppercase text-zinc-500">{it.label}</div>
              <div className={`text-xs font-medium break-words ${it.tone ?? "text-zinc-200"}`}>
                {it.value}
              </div>
            </div>
          </div>
        ))}
      </dl>
    </div>
  );
}
