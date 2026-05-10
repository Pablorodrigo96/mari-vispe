import { AlertTriangle, PauseCircle } from "lucide-react";

interface Props {
  buyer: any;
}

export function BuyerAlertsBanner({ buyer }: Props) {
  const pause = !!buyer?.pause_signal;
  const cautela = !!buyer?.cautela_flag;
  const cautelaMotivo = buyer?.cautela_motivo as string | null | undefined;

  if (!pause && !cautela) return null;

  return (
    <div className="space-y-2">
      {cautela && (
        <div className="flex items-start gap-2 rounded border border-rose-800/60 bg-rose-900/20 p-3">
          <AlertTriangle className="h-4 w-4 text-rose-300 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <div className="text-xs font-semibold text-rose-200">Cautela ativa</div>
            <div className="text-[11px] text-rose-100/80 break-words mt-0.5">
              {cautelaMotivo ?? "Comprador marcado como cautela. Confira histórico antes de iniciar abordagem."}
            </div>
          </div>
        </div>
      )}
      {pause && (
        <div className="flex items-start gap-2 rounded border border-amber-800/60 bg-amber-900/20 p-3">
          <PauseCircle className="h-4 w-4 text-amber-300 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <div className="text-xs font-semibold text-amber-200">Em pausa</div>
            <div className="text-[11px] text-amber-100/80 break-words mt-0.5">
              Comprador sinalizou pausa em novas operações. Não acionar até reativação.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function BuyerHeaderChips({ buyer }: Props) {
  const archetype = buyer?.archetype_id as string | null | undefined;
  const prioridade = buyer?.prioridade_global as number | null | undefined;
  const vertical = buyer?.vertical_principal as string | null | undefined;

  const chips: Array<{ label: string; tone: string }> = [];
  if (vertical) chips.push({ label: vertical, tone: "border-zinc-700 text-zinc-300" });
  if (archetype) chips.push({ label: `Arquétipo: ${archetype}`, tone: "border-emerald-800/60 text-emerald-300" });
  if (prioridade != null) {
    const tone =
      prioridade >= 4
        ? "border-emerald-700/70 text-emerald-300"
        : prioridade >= 2
        ? "border-amber-700/60 text-amber-300"
        : "border-zinc-700 text-zinc-400";
    chips.push({ label: `Prioridade ${prioridade}`, tone });
  }

  if (!chips.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-1">
      {chips.map((c) => (
        <span
          key={c.label}
          className={`text-[10px] px-2 py-0.5 rounded border bg-transparent ${c.tone}`}
        >
          {c.label}
        </span>
      ))}
    </div>
  );
}
