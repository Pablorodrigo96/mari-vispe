import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertTriangle, RefreshCw, PlayCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type EventRow = {
  id: number;
  event_type: string;
  entity_type: string | null;
  entity_id: string | null;
  processed_status: string | null;
  retry_count: number | null;
  error_message: string | null;
  created_at: string;
};

export function EventQueueHealthCard() {
  const [draining, setDraining] = useState(false);

  const stats = useQuery({
    queryKey: ["eb", "events", "stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("eb_event_queue_stats" as any).maybeSingle();
      // Fallback: agrega via 3 queries simples se RPC não existir
      if (error) {
        const [unp, byType, errs] = await Promise.all([
          supabase.from("eb_events" as any).select("id", { count: "exact", head: true }).is("processed_at", null),
          supabase.from("eb_events" as any).select("event_type").is("processed_at", null).limit(2000),
          supabase.from("eb_events" as any).select("id", { count: "exact", head: true }).eq("processed_status", "error"),
        ]);
        const counts: Record<string, number> = {};
        (byType.data ?? []).forEach((r: any) => {
          counts[r.event_type] = (counts[r.event_type] ?? 0) + 1;
        });
        return {
          unprocessed: unp.count ?? 0,
          errors: errs.count ?? 0,
          by_type: Object.entries(counts).map(([event_type, count]) => ({ event_type, count })),
        };
      }
      return data as any;
    },
    refetchInterval: 30_000,
  });

  const recentErrors = useQuery({
    queryKey: ["eb", "events", "errors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eb_events" as any)
        .select("id, event_type, entity_type, entity_id, processed_status, retry_count, error_message, created_at")
        .eq("processed_status", "error")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as EventRow[];
    },
    refetchInterval: 60_000,
  });

  const drain = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("drain-events-bulk", { body: {} });
      if (error) throw error;
      return data;
    },
    onMutate: () => setDraining(true),
    onSuccess: (data: any) => {
      toast.success(
        `Fila drenada: ${data?.totals?.processed ?? 0} eventos em ${data?.totals?.iterations ?? 0} iterações (${data?.duration_ms}ms)`
      );
      stats.refetch();
      recentErrors.refetch();
    },
    onError: (e: any) => toast.error(`Erro ao drenar: ${e?.message ?? "desconhecido"}`),
    onSettled: () => setDraining(false),
  });

  const unprocessed = stats.data?.unprocessed ?? 0;
  const errors = stats.data?.errors ?? 0;
  const byType: Array<{ event_type: string; count: number }> = stats.data?.by_type ?? [];

  // Threshold colors
  const queueColor =
    unprocessed >= 1000
      ? "text-red-400 border-red-500/40 bg-red-500/10"
      : unprocessed >= 100
      ? "text-amber-400 border-amber-500/40 bg-amber-500/10"
      : "text-emerald-400 border-emerald-500/40 bg-emerald-500/10";

  return (
    <Card className="!bg-slate-900/60 backdrop-blur-md border-slate-700 p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-400" />
          <h3 className="text-base font-semibold text-slate-100">Fila de eventos (Fase 7)</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="bg-transparent border-slate-600"
            onClick={() => {
              stats.refetch();
              recentErrors.refetch();
            }}
            disabled={stats.isFetching}
          >
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1", stats.isFetching && "animate-spin")} />
            Atualizar
          </Button>
          <Button
            size="sm"
            className="bg-amber-600 hover:bg-amber-700"
            onClick={() => drain.mutate()}
            disabled={draining || unprocessed === 0}
          >
            {draining ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <PlayCircle className="h-3.5 w-3.5 mr-1" />
            )}
            Drenar fila agora
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className={cn("rounded-lg p-4 border", queueColor)}>
          <div className="text-xs uppercase tracking-wider opacity-80">Não processados</div>
          <div className="text-3xl font-bold mt-1">{unprocessed.toLocaleString("pt-BR")}</div>
          <div className="text-[11px] opacity-70 mt-1">
            {unprocessed === 0 ? "fila limpa" : unprocessed >= 1000 ? "ATENÇÃO: backlog crítico" : "operação normal"}
          </div>
        </div>
        <div className="rounded-lg p-4 border border-slate-700 bg-slate-800/40">
          <div className="text-xs uppercase tracking-wider text-slate-400">Erros (drop)</div>
          <div className="text-3xl font-bold mt-1 text-slate-100">{errors.toLocaleString("pt-BR")}</div>
          <div className="text-[11px] text-slate-500 mt-1">após {3} retries</div>
        </div>
        <div className="rounded-lg p-4 border border-slate-700 bg-slate-800/40">
          <div className="text-xs uppercase tracking-wider text-slate-400">Tipos pendentes</div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {byType.length === 0 && <span className="text-slate-500 text-xs">nenhum</span>}
            {byType.slice(0, 6).map((t) => (
              <Badge key={t.event_type} variant="outline" className="border-slate-600 text-slate-200 bg-slate-800">
                {t.event_type} <span className="ml-1 text-slate-400">{t.count}</span>
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {recentErrors.data && recentErrors.data.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs uppercase text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            Últimos erros (drops após retries)
          </div>
          <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
            {recentErrors.data.map((e) => (
              <div
                key={e.id}
                className="text-xs bg-slate-800/40 border border-slate-700 rounded px-2.5 py-1.5 flex items-start gap-2 break-words"
              >
                <Badge variant="outline" className="border-slate-600 text-[10px] shrink-0">
                  {e.event_type}
                </Badge>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-slate-300 truncate">{e.entity_id ?? "—"}</div>
                  <div className="text-slate-500 break-words">{e.error_message ?? "sem mensagem"}</div>
                </div>
                <span className="text-slate-500 text-[10px] shrink-0">retry {e.retry_count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
