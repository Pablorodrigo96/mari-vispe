import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, Sparkles } from "lucide-react";
import { toast } from "sonner";

type RunRow = {
  id: string;
  finished_at: string | null;
  status: string;
  duration_ms: number | null;
  rows_processed: number | null;
  metadata: any;
};

export function SemanticEmbeddingsCard() {
  const [companiesEmbedded, setCompaniesEmbedded] = useState<number | null>(null);
  const [companiesTotal, setCompaniesTotal] = useState<number | null>(null);
  const [buyersEmbedded, setBuyersEmbedded] = useState<number | null>(null);
  const [buyersTotal, setBuyersTotal] = useState<number | null>(null);
  const [lastRun, setLastRun] = useState<RunRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  async function load() {
    setLoading(true);
    const sb = supabase as any;
    const [{ count: cEmb }, { count: cTot }, { count: bEmb }, { count: bTot }, { data: runs }] = await Promise.all([
      sb.schema("equity_brain").from("companies").select("*", { count: "exact", head: true }).not("embedding", "is", null),
      sb.schema("equity_brain").from("companies").select("*", { count: "exact", head: true }),
      sb.schema("equity_brain").from("buyers").select("*", { count: "exact", head: true }).not("embedding", "is", null),
      sb.schema("equity_brain").from("buyers").select("*", { count: "exact", head: true }),
      sb.schema("equity_brain").from("engine_runs").select("*").eq("engine", "compute-semantic-embeddings").order("started_at", { ascending: false }).limit(1),
    ]);
    setCompaniesEmbedded(cEmb ?? 0);
    setCompaniesTotal(cTot ?? 0);
    setBuyersEmbedded(bEmb ?? 0);
    setBuyersTotal(bTot ?? 0);
    setLastRun((runs?.[0] as RunRow) ?? null);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function recompute(force: boolean) {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("compute-semantic-embeddings", {
        body: { target: "both", force, limit: 500 },
      });
      if (error) throw error;
      const d: any = data ?? {};
      toast.success("Embeddings recalculados", {
        description: `Companies: +${d.result?.companies?.embedded ?? 0} · Buyers: +${d.result?.buyers?.embedded ?? 0}`,
      });
      await load();
    } catch (e: any) {
      toast.error("Falha ao calcular embeddings", { description: e.message ?? String(e) });
    } finally {
      setRunning(false);
    }
  }

  const cPct = companiesTotal ? Math.round((100 * (companiesEmbedded ?? 0)) / companiesTotal) : 0;
  const bPct = buyersTotal ? Math.round((100 * (buyersEmbedded ?? 0)) / buyersTotal) : 0;

  return (
    <Card className="!bg-slate-900/60 backdrop-blur-md border-slate-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-fuchsia-400" />
          Embeddings semânticos (Etapa 2)
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1 break-words">
          Vetores de 768 dimensões (google/text-embedding-004) alimentam a feature{" "}
          <code className="text-fuchsia-300">semantic_fit</code> no match-company-v2,
          substituindo o placeholder <code>sinergia_movel</code>.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Carregando…
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-xs text-muted-foreground">Companies</div>
                <div className="text-2xl font-bold text-foreground">
                  {companiesEmbedded}<span className="text-sm text-muted-foreground"> / {companiesTotal}</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-fuchsia-500" style={{ width: `${cPct}%` }} />
                </div>
                <div className="text-xs text-muted-foreground mt-1">{cPct}% com embedding</div>
              </div>
              <div className="rounded-md border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-xs text-muted-foreground">Buyers</div>
                <div className="text-2xl font-bold text-foreground">
                  {buyersEmbedded}<span className="text-sm text-muted-foreground"> / {buyersTotal}</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-fuchsia-500" style={{ width: `${bPct}%` }} />
                </div>
                <div className="text-xs text-muted-foreground mt-1">{bPct}% com embedding</div>
              </div>
            </div>

            {lastRun && (
              <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2 break-words">
                <span>Último run:</span>
                <Badge variant="outline" className={`bg-transparent ${lastRun.status === "success" ? "text-emerald-400 border-emerald-500/30" : "text-rose-400 border-rose-500/30"}`}>
                  {lastRun.status}
                </Badge>
                {lastRun.finished_at && <span>{new Date(lastRun.finished_at).toLocaleString("pt-BR")}</span>}
                {lastRun.rows_processed != null && <span>· {lastRun.rows_processed} processados</span>}
                {lastRun.duration_ms != null && <span>· {(lastRun.duration_ms / 1000).toFixed(1)}s</span>}
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" onClick={() => recompute(false)} disabled={running}
                className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white">
                {running ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
                Calcular faltantes
              </Button>
              <Button size="sm" variant="outline" onClick={() => recompute(true)} disabled={running}
                className="bg-transparent">
                {running ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                Recalcular tudo (force)
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
