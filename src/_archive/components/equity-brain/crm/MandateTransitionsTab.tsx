import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { History, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePipelineStages } from "@/hooks/usePipelineStages";

function formatDuration(seconds: number | null) {
  if (!seconds || seconds < 60) return "<1min";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h`;
  const mins = Math.floor(seconds / 60);
  return `${mins}min`;
}

export function MandateTransitionsTab({ mandateId }: { mandateId: string }) {
  const { data: stages = [] } = usePipelineStages();
  const stageLabel = (k: string | null) => {
    if (!k) return "—";
    return stages.find((s) => s.key === k)?.label ?? k;
  };

  const { data: transitions = [], isLoading } = useQuery({
    queryKey: ["mandate-transitions", mandateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eb_pipeline_transitions" as any)
        .select("*")
        .eq("mandate_id", mandateId)
        .order("moved_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  if (isLoading) return <div className="text-xs text-zinc-500 p-4">Carregando…</div>;

  if (transitions.length === 0) {
    return (
      <div className="text-xs text-zinc-500 p-6 text-center border border-dashed border-zinc-800 rounded">
        Nenhuma transição registrada ainda. Mova o mandato no Kanban para começar a registrar histórico.
      </div>
    );
  }

  const totalSeconds = transitions.reduce((s, t) => s + Number(t.time_in_previous_stage_seconds ?? 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-[11px] text-zinc-400 border-b border-zinc-800 pb-2">
        <History className="h-3.5 w-3.5" />
        <span>{transitions.length} transições</span>
        <span className="text-zinc-600">•</span>
        <span>Tempo total acumulado: <strong className="text-zinc-200">{formatDuration(totalSeconds)}</strong></span>
      </div>
      <ol className="relative border-l border-zinc-800 ml-2 space-y-3">
        {transitions.map((t) => (
          <li key={t.id} className="ml-4 relative">
            <span className="absolute -left-[22px] top-1 h-2 w-2 rounded-full bg-[#D9F564]" />
            <div className="text-[11px] text-zinc-100 inline-flex items-center gap-1.5 break-words">
              <span className="text-zinc-400">{stageLabel(t.from_stage)}</span>
              <ArrowRight className="h-3 w-3 text-zinc-500" />
              <strong>{stageLabel(t.to_stage)}</strong>
              {t.from_outcome !== t.to_outcome && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 ml-1">
                  status: {t.to_outcome}
                </span>
              )}
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5 flex flex-wrap gap-2">
              <span>{formatDistanceToNow(new Date(t.moved_at), { locale: ptBR, addSuffix: true })}</span>
              <span className="text-zinc-600">•</span>
              <span>permaneceu {formatDuration(Number(t.time_in_previous_stage_seconds ?? 0))} na etapa anterior</span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
