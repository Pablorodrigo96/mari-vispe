import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, CheckCircle2, XCircle, Loader2, Power, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type EngineRun = {
  id: string;
  engine: string;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  rows_processed: number | null;
  status: "running" | "success" | "error";
  error_message: string | null;
  triggered_by: string | null;
};

const TRACKED_ENGINES = [
  "match-company-v2",
  "update-buyer-revealed-thetas",
  "compute-mandate-active-proba",
];

const ENGINE_LABEL: Record<string, string> = {
  "match-company-v2": "Matching v2",
  "update-buyer-revealed-thetas": "Loop adaptativo (thetas)",
  "compute-mandate-active-proba": "Mandate probability",
};

export function EngineHealthCard() {
  const [runs, setRuns] = useState<EngineRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [activatingCron, setActivatingCron] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await (supabase as any)
      .schema("equity_brain")
      .from("engine_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(60);
    setRuns((data ?? []) as EngineRun[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function activateCrons() {
    setActivatingCron(true);
    try {
      const { data, error } = await supabase.functions.invoke("setup-equity-brain-crons", {
        body: { action: "enable" },
      });
      if (error) throw error;
      toast.success("Crons ativados", {
        description: `${(data as any)?.jobs?.length ?? 0} jobs agendados`,
      });
    } catch (e: any) {
      toast.error("Falha ao ativar crons", { description: e.message ?? String(e) });
    } finally {
      setActivatingCron(false);
    }
  }

  // Group last run per engine + 24h error rate + avg throughput
  const summary = TRACKED_ENGINES.map((engine) => {
    const engineRuns = runs.filter((r) => r.engine === engine);
    const last = engineRuns[0] ?? null;
    const last24h = engineRuns.filter(
      (r) => Date.now() - new Date(r.started_at).getTime() < 24 * 3600 * 1000,
    );
    const errors24h = last24h.filter((r) => r.status === "error").length;
    const errorRate = last24h.length ? errors24h / last24h.length : 0;
    const completed = engineRuns.filter((r) => r.status === "success" && r.rows_processed != null);
    const avgThroughput =
      completed.length > 0
        ? completed.reduce((s, r) => s + (r.rows_processed ?? 0), 0) / completed.length
        : 0;
    return { engine, last, runs24h: last24h.length, errors24h, errorRate, avgThroughput };
  });

  return (
    <div className="space-y-4">
      <Card className="!bg-slate-900/60 backdrop-blur-md border-slate-800">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base text-foreground flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-400" />
                Saúde do Motor
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Execuções recentes dos motores adaptativos. Crons rodam matching v2 a cada 6h, thetas
                diariamente e mandate decay semanalmente.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="bg-transparent"
                onClick={load}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
                Recarregar
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={activateCrons}
                disabled={activatingCron}
              >
                {activatingCron ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Power className="h-4 w-4 mr-1" />
                )}
                Ativar/Reagendar Crons
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {summary.map((s) => {
              const last = s.last;
              const isOk = last?.status === "success";
              const isErr = last?.status === "error";
              const isRun = last?.status === "running";
              return (
                <div
                  key={s.engine}
                  className="border border-slate-800 rounded-md p-3 bg-slate-800/20 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-foreground break-words">
                      {ENGINE_LABEL[s.engine] ?? s.engine}
                    </span>
                    {isOk && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />}
                    {isErr && <XCircle className="h-4 w-4 text-rose-400 shrink-0" />}
                    {isRun && <Loader2 className="h-4 w-4 text-amber-400 animate-spin shrink-0" />}
                    {!last && <span className="text-[10px] text-muted-foreground">sem runs</span>}
                  </div>

                  {last ? (
                    <>
                      <div className="text-[11px] text-muted-foreground">
                        Última: {new Date(last.started_at).toLocaleString("pt-BR")}
                      </div>
                      <div className="flex flex-wrap gap-1 text-[10px]">
                        <Badge variant="outline" className="bg-transparent">
                          {last.rows_processed ?? 0} rows
                        </Badge>
                        {last.duration_ms != null && (
                          <Badge variant="outline" className="bg-transparent">
                            {(last.duration_ms / 1000).toFixed(1)}s
                          </Badge>
                        )}
                        <Badge variant="outline" className="bg-transparent">
                          via {last.triggered_by ?? "?"}
                        </Badge>
                      </div>
                      {last.error_message && (
                        <p className="text-[10px] text-rose-300 break-words">
                          {last.error_message}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="text-[11px] text-muted-foreground">
                      Aguardando primeira execução
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-800 grid grid-cols-3 gap-1 text-center">
                    <div>
                      <div className="text-xs font-bold text-foreground">{s.runs24h}</div>
                      <div className="text-[9px] text-muted-foreground">runs 24h</div>
                    </div>
                    <div>
                      <div
                        className={`text-xs font-bold ${
                          s.errorRate > 0.2
                            ? "text-rose-400"
                            : s.errorRate > 0
                              ? "text-amber-400"
                              : "text-emerald-400"
                        }`}
                      >
                        {(s.errorRate * 100).toFixed(0)}%
                      </div>
                      <div className="text-[9px] text-muted-foreground">erros 24h</div>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">
                        {s.avgThroughput.toFixed(0)}
                      </div>
                      <div className="text-[9px] text-muted-foreground">avg rows</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="!bg-slate-900/60 backdrop-blur-md border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-foreground">Últimas 30 execuções</CardTitle>
        </CardHeader>
        <CardContent>
          {runs.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              Nenhuma execução registrada ainda. Rode um motor manualmente ou ative os crons.
            </p>
          ) : (
            <div className="overflow-x-auto max-h-[420px]">
              <table className="w-full text-xs">
                <thead className="text-[10px] text-muted-foreground border-b border-slate-800 sticky top-0 bg-slate-900">
                  <tr>
                    <th className="text-left py-1 px-2">Início</th>
                    <th className="text-left py-1 px-2">Engine</th>
                    <th className="text-left py-1 px-2">Status</th>
                    <th className="text-right py-1 px-2">Rows</th>
                    <th className="text-right py-1 px-2">Duração</th>
                    <th className="text-left py-1 px-2">Trigger</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.slice(0, 30).map((r) => (
                    <tr key={r.id} className="border-b border-slate-800/50">
                      <td className="py-1 px-2 text-[10px] text-muted-foreground">
                        {new Date(r.started_at).toLocaleString("pt-BR")}
                      </td>
                      <td className="py-1 px-2 break-words">{ENGINE_LABEL[r.engine] ?? r.engine}</td>
                      <td className="py-1 px-2">
                        <Badge
                          variant="outline"
                          className={`bg-transparent text-[10px] ${
                            r.status === "success"
                              ? "border-emerald-500/40 text-emerald-400"
                              : r.status === "error"
                                ? "border-rose-500/40 text-rose-400"
                                : "border-amber-500/40 text-amber-400"
                          }`}
                        >
                          {r.status}
                        </Badge>
                      </td>
                      <td className="py-1 px-2 text-right">{r.rows_processed ?? "—"}</td>
                      <td className="py-1 px-2 text-right text-muted-foreground">
                        {r.duration_ms != null ? `${(r.duration_ms / 1000).toFixed(1)}s` : "—"}
                      </td>
                      <td className="py-1 px-2 text-[10px] text-muted-foreground">
                        {r.triggered_by ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
