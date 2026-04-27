import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Database, Play } from "lucide-react";
import { toast } from "sonner";

type RunRow = {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  rows_processed: number | null;
  error_message: string | null;
  metadata: any;
};

export function BackfillHistoryCard() {
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<RunRow | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await (supabase as any)
      .schema("equity_brain")
      .from("engine_runs")
      .select("*")
      .eq("engine_name", "backfill-deal-events-from-history")
      .order("started_at", { ascending: false })
      .limit(1);
    setLastRun((data?.[0] as any) ?? null);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function runBackfill(dryRun: boolean) {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("backfill-deal-events-from-history", {
        body: { dry_run: dryRun },
      });
      if (error) throw error;
      const d: any = data ?? {};
      toast.success(dryRun ? "Dry-run concluído" : "Backfill executado", {
        description: `Interesses: ${d.backfilled_interest ?? 0} · Replies: ${d.backfilled_replies ?? 0}`,
      });
      await load();
    } catch (e: any) {
      toast.error("Falha no backfill", { description: e.message ?? String(e) });
    } finally {
      setRunning(false);
    }
  }

  return (
    <Card className="!bg-slate-900/60 backdrop-blur-md border-slate-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-foreground flex items-center gap-2">
          <Database className="h-4 w-4 text-cyan-400" /> Backfill histórico de eventos
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Popula <code>deal_events</code> a partir de <code>interest_logs</code> (contacted) e
          <code> messages</code> (reply_received quando ≥2 mensagens). Idempotente — pode rodar múltiplas vezes.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="bg-transparent"
            onClick={() => runBackfill(true)} disabled={running}>
            {running ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
            Dry-run (preview)
          </Button>
          <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700 text-white"
            onClick={() => runBackfill(false)} disabled={running}>
            {running ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Database className="h-4 w-4 mr-1" />}
            Executar backfill
          </Button>
        </div>

        {loading ? (
          <p className="text-xs text-muted-foreground">Carregando última execução...</p>
        ) : lastRun ? (
          <div className="text-xs space-y-1 border border-slate-800 rounded-md p-2 bg-slate-800/20">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={`text-[10px] bg-transparent ${lastRun.status === "success" ? "border-emerald-500/40 text-emerald-300" : "border-rose-500/40 text-rose-300"}`}>
                {lastRun.status}
              </Badge>
              <span className="text-muted-foreground">
                {new Date(lastRun.started_at).toLocaleString("pt-BR")}
              </span>
              <span className="text-foreground font-semibold">
                {lastRun.rows_processed ?? 0} linhas
              </span>
            </div>
            {lastRun.metadata && (
              <div className="text-[11px] text-muted-foreground break-words">
                Interesses: {lastRun.metadata.backfilled_interest ?? 0} · Replies: {lastRun.metadata.backfilled_replies ?? 0}
                {lastRun.metadata.dry_run && " · (dry-run)"}
              </div>
            )}
            {lastRun.error_message && (
              <p className="text-rose-300 text-[11px] break-words">{lastRun.error_message}</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Nenhuma execução registrada ainda.</p>
        )}
      </CardContent>
    </Card>
  );
}
