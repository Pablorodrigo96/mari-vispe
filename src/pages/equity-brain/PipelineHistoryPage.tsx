import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, History, Clock, Activity } from "lucide-react";
import { useMemo, useState } from "react";
import { usePipelineStages } from "@/hooks/usePipelineStages";
import { InfoHint } from "@/components/equity-brain/InfoHint";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatDuration(seconds: number | null) {
  if (!seconds || seconds < 60) return "<1min";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h`;
  return `${Math.floor(seconds / 60)}min`;
}

export default function PipelineHistoryPage() {
  const { data: stages = [] } = usePipelineStages();
  const [stageFilter, setStageFilter] = useState<string>("");
  const stageLabel = (k: string | null) => stages.find((s) => s.key === k)?.label ?? k ?? "—";

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["pipeline-transitions-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eb_pipeline_transitions" as any)
        .select("*")
        .order("moved_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const filtered = stageFilter ? rows.filter((r) => r.to_stage === stageFilter || r.from_stage === stageFilter) : rows;

  const stats = useMemo(() => {
    const byStage: Record<string, { count: number; total: number }> = {};
    rows.forEach((r) => {
      const k = r.from_stage as string | null;
      if (!k) return;
      if (!byStage[k]) byStage[k] = { count: 0, total: 0 };
      byStage[k].count += 1;
      byStage[k].total += Number(r.time_in_previous_stage_seconds ?? 0);
    });
    const avgPerStage = Object.entries(byStage)
      .map(([key, v]) => ({ key, label: stageLabel(key), avg: v.total / Math.max(1, v.count), count: v.count }))
      .sort((a, b) => b.avg - a.avg);

    // tempo total por mandato (sum of segments)
    const byMandate: Record<string, number> = {};
    rows.forEach((r) => {
      byMandate[r.mandate_id] = (byMandate[r.mandate_id] ?? 0) + Number(r.time_in_previous_stage_seconds ?? 0);
    });
    const mandateTimes = Object.values(byMandate);
    const avgTotal = mandateTimes.length ? mandateTimes.reduce((a, b) => a + b, 0) / mandateTimes.length : 0;

    return { avgPerStage, avgTotal, totalTransitions: rows.length, totalMandates: mandateTimes.length };
  }, [rows, stages]);

  return (
    <div className="p-6 space-y-4 bg-zinc-950 min-h-full">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <Link to="/equity-brain/crm/pipeline" className="text-[11px] text-zinc-500 hover:text-zinc-300 inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Pipeline
          </Link>
          <h1 className="text-2xl font-bold text-zinc-100 mt-1 tracking-tight inline-flex items-center gap-2">
            <History className="h-5 w-5 text-[#D9F564]" />
            Histórico de transições
            <InfoHint
              title="Histórico de transições"
              what="Toda mudança de etapa e status registrada automaticamente, com quanto tempo o mandato ficou em cada estágio."
              action="Use para detectar gargalos: etapas com tempo médio alto indicam onde o processo está travando."
            />
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-[11px] text-zinc-100"
          >
            <option value="">Todas as etapas</option>
            {stages.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
          <div className="text-[10px] uppercase text-zinc-500 inline-flex items-center gap-1">
            <Activity className="h-3 w-3" /> Transições registradas
            <InfoHint title="Transições" what="Cada vez que um mandato muda de etapa ou status." action="Mais transições = pipeline mais ativo." />
          </div>
          <div className="text-2xl font-bold text-zinc-100 mt-1 tabular-nums">{stats.totalTransitions}</div>
          <div className="text-[10px] text-zinc-500">{stats.totalMandates} mandatos distintos</div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
          <div className="text-[10px] uppercase text-zinc-500 inline-flex items-center gap-1">
            <Clock className="h-3 w-3" /> Duração média total
            <InfoHint title="Duração média" what="Tempo médio acumulado por mandato (soma das etapas pelas quais já passou)." action="Compare com prazos contratuais para ajustar SLAs por etapa." />
          </div>
          <div className="text-2xl font-bold text-zinc-100 mt-1 tabular-nums">{formatDuration(stats.avgTotal)}</div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
          <div className="text-[10px] uppercase text-zinc-500 inline-flex items-center gap-1">
            Etapa mais demorada
            <InfoHint title="Gargalo" what="Etapa com maior tempo médio de permanência." action="Investigue causas: documentação, juridico, contraparte. Ajuste SLA se necessário." />
          </div>
          <div className="text-base font-semibold text-amber-300 mt-1">
            {stats.avgPerStage[0]?.label ?? "—"}
          </div>
          <div className="text-[10px] text-zinc-500 tabular-nums">
            {stats.avgPerStage[0] ? formatDuration(stats.avgPerStage[0].avg) : "—"}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
        <div className="text-[10px] uppercase text-zinc-500 mb-2 inline-flex items-center gap-1">
          Tempo médio por etapa
          <InfoHint title="Heatmap por etapa" what="Tempo médio que mandatos ficam em cada etapa antes de avançar." action="Etapas em vermelho/amarelo são candidatas a revisão de SLA ou ações de aceleração." />
        </div>
        <div className="space-y-1.5">
          {stats.avgPerStage.map((s) => {
            const max = Math.max(...stats.avgPerStage.map((x) => x.avg), 1);
            const pct = (s.avg / max) * 100;
            return (
              <div key={s.key} className="grid grid-cols-[140px_1fr_120px] items-center gap-3">
                <div className="text-[11px] text-zinc-300 truncate break-words">{s.label}</div>
                <div className="h-4 bg-zinc-900 rounded overflow-hidden border border-zinc-800">
                  <div className="h-full bg-amber-600/60" style={{ width: `${pct}%` }} />
                </div>
                <div className="text-[10px] text-zinc-400 tabular-nums text-right">
                  {formatDuration(s.avg)} ({s.count})
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40">
        <div className="px-3 py-2 border-b border-zinc-800 text-[10px] uppercase text-zinc-500">
          Últimas transições
        </div>
        {isLoading ? (
          <div className="text-xs text-zinc-500 p-6">Carregando…</div>
        ) : (
          <div className="divide-y divide-zinc-800 max-h-[600px] overflow-y-auto">
            {filtered.slice(0, 200).map((t) => (
              <Link
                key={t.id}
                to={`/equity-brain/crm/mandate/${t.mandate_id}`}
                className="flex items-center justify-between gap-3 px-3 py-2 text-[11px] hover:bg-zinc-800/40"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-zinc-200 break-words">
                    <span className="text-zinc-400">{stageLabel(t.from_stage)}</span>
                    {" → "}
                    <strong>{stageLabel(t.to_stage)}</strong>
                  </div>
                  <div className="text-[10px] text-zinc-500 tabular-nums truncate">
                    Mandato {String(t.mandate_id).slice(0, 8)}…
                  </div>
                </div>
                <div className="text-[10px] text-zinc-400 tabular-nums shrink-0 text-right">
                  <div>{formatDistanceToNow(new Date(t.moved_at), { locale: ptBR, addSuffix: true })}</div>
                  <div className="text-zinc-600">
                    {formatDuration(Number(t.time_in_previous_stage_seconds ?? 0))} na etapa
                  </div>
                </div>
              </Link>
            ))}
            {filtered.length === 0 && (
              <div className="text-xs text-zinc-500 p-6 text-center">
                Sem transições no filtro atual.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
