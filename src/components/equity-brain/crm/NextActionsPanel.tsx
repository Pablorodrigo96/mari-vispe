import { useNavigate } from "react-router-dom";
import { Sparkles, RefreshCw, MessageCircle, Eye, Plus, Loader2 } from "lucide-react";
import { useMariSuggestions, type MariSuggestion } from "@/hooks/useMariSuggestions";
import { InfoHint } from "@/components/equity-brain/InfoHint";
import { EB_TIPS } from "@/lib/ebTooltips";
import { cn } from "@/lib/utils";

const priorityCls: Record<string, string> = {
  urgent: "border-l-rose-500",
  hot: "border-l-amber-500",
  normal: "border-l-emerald-600",
};

const priorityLabel: Record<string, string> = {
  urgent: "URGENTE",
  hot: "HOT",
  normal: "AÇÃO",
};

export function NextActionsPanel() {
  const { data, isLoading, isFetching, refresh } = useMariSuggestions();
  const navigate = useNavigate();

  const goTo = (s: MariSuggestion) => {
    const path = s.entity_type === "mandate" ? `/equity-brain/crm/mandate/${s.entity_id}` : `/equity-brain/crm/buyer/${s.entity_id}`;
    navigate(path);
  };

  return (
    <div className="bg-zinc-900/40 border border-zinc-800 rounded p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-zinc-100">Próximas ações sugeridas pela Mari</h2>
          <InfoHint {...EB_TIPS.proximas_acoes_mari} />
        </div>
        <button
          onClick={() => refresh()}
          disabled={isFetching}
          className="text-[11px] text-zinc-400 hover:text-zinc-100 inline-flex items-center gap-1 disabled:opacity-50"
        >
          {isFetching ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Atualizar
        </button>
      </div>

      {isLoading ? (
        <div className="text-xs text-zinc-500">Analisando seu pipeline…</div>
      ) : !data || data.length === 0 ? (
        <div className="text-xs text-zinc-500 italic">
          Nada urgente agora. A Mari avisa quando algo precisar de atenção.
        </div>
      ) : (
        <ul className="space-y-2">
          {data.slice(0, 8).map((s, i) => (
            <li
              key={i}
              className={cn("border-l-2 bg-zinc-950/40 border border-zinc-800 rounded-r px-3 py-2 flex items-start justify-between gap-3", priorityCls[s.priority])}
            >
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase font-bold text-zinc-400">{priorityLabel[s.priority]}</div>
                <div className="text-xs text-zinc-200 break-words mt-0.5">{s.message}</div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => goTo(s)}
                  className="text-[11px] text-zinc-300 hover:text-emerald-300 inline-flex items-center gap-1 px-2 py-1 rounded border border-zinc-800 bg-transparent"
                  title="Abrir ficha 360°"
                >
                  <Eye className="h-3 w-3" /> Abrir
                </button>
                {s.cta === "whatsapp" && (
                  <button
                    onClick={() => goTo(s)}
                    className="text-[11px] text-emerald-300 hover:text-emerald-200 inline-flex items-center gap-1 px-2 py-1 rounded border border-emerald-800/60 bg-transparent"
                  >
                    <MessageCircle className="h-3 w-3" /> WhatsApp
                  </button>
                )}
                {s.cta === "task" && (
                  <button
                    onClick={() => goTo(s)}
                    className="text-[11px] text-zinc-200 inline-flex items-center gap-1 px-2 py-1 rounded border border-zinc-800 bg-transparent"
                  >
                    <Plus className="h-3 w-3" /> Tarefa
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
