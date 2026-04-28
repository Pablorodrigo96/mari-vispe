import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Brain, Play, Sparkles } from "lucide-react";
import { toast } from "sonner";

type RunRow = {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  rows_processed: number | null;
  duration_ms: number | null;
  error_message: string | null;
};

type Stats = {
  count: number;
  min: number; p25: number; median: number; p75: number; p90: number; max: number;
  high_intent_count: number;
};

type TopRow = {
  cnpj: string;
  score: number;
  company: { razao_social: string; uf: string; municipio: string; setor_ma: string | null } | null;
};

export function SellerIntentMonitorCard() {
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<RunRow | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [top, setTop] = useState<TopRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadRun() {
    setLoading(true);
    const { data } = await (supabase as any)
      .schema("equity_brain")
      .from("engine_runs")
      .select("*")
      .eq("engine", "compute-seller-intent")
      .order("started_at", { ascending: false })
      .limit(1);
    setLastRun((data?.[0] as any) ?? null);

    // Carrega distribuição em modo dry-run leve via RPC inexistente — em vez disso reaproveita os sinais já gravados
    const { data: dist } = await (supabase as any)
      .schema("equity_brain")
      .from("company_signals")
      .select("signal_value")
      .eq("signal_key", "seller_intent_score");
    const values = ((dist ?? []) as any[])
      .map((r) => Number(r.signal_value))
      .filter((v) => Number.isFinite(v))
      .sort((a, b) => a - b);
    if (values.length) {
      setStats({
        count: values.length,
        min: values[0],
        p25: values[Math.floor(values.length * 0.25)],
        median: values[Math.floor(values.length * 0.5)],
        p75: values[Math.floor(values.length * 0.75)],
        p90: values[Math.floor(values.length * 0.9)],
        max: values[values.length - 1],
        high_intent_count: values.filter((v) => v >= 0.6).length,
      });

      const { data: topRows } = await (supabase as any)
        .schema("equity_brain")
        .from("company_signals")
        .select("cnpj, signal_value")
        .eq("signal_key", "seller_intent_score")
        .order("signal_value", { ascending: false })
        .limit(8);
      const cnpjs = (topRows ?? []).map((r: any) => r.cnpj);
      const { data: companies } = cnpjs.length ? await (supabase as any)
        .schema("equity_brain")
        .from("companies")
        .select("cnpj, razao_social, uf, municipio, setor_ma")
        .in("cnpj", cnpjs) : { data: [] as any[] };
      const byCnpj = new Map<string, any>();
      (companies ?? []).forEach((c: any) => byCnpj.set(c.cnpj, c));
      setTop((topRows ?? []).map((r: any) => ({
        cnpj: r.cnpj,
        score: Number(r.signal_value),
        company: byCnpj.get(r.cnpj) ?? null,
      })));
    } else {
      setStats(null); setTop([]);
    }
    setLoading(false);
  }

  useEffect(() => { loadRun(); }, []);

  async function runCompute() {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("compute-seller-intent", {
        body: { dry_run: false },
      });
      if (error) throw error;
      const d: any = data ?? {};
      toast.success("Sinais de intenção recalculados", {
        description: `${d.processed_companies ?? 0} empresas · ${d.intent_distribution?.high_intent_count ?? 0} com intent ≥ 0.6`,
      });
      await loadRun();
    } catch (e: any) {
      toast.error("Falha ao calcular", { description: e.message ?? String(e) });
    } finally {
      setRunning(false);
    }
  }

  const fmt = (n: number) => n.toFixed(2);
  const fmtScore = (n: number) => `${(n * 100).toFixed(0)}`;

  return (
    <Card className="!bg-slate-900/60 backdrop-blur-md border-slate-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-foreground flex items-center gap-2">
          <Brain className="h-4 w-4 text-purple-400" /> Motor de Intenção do Vendedor
          <Badge variant="outline" className="text-[10px] bg-transparent border-purple-500/40 text-purple-300 ml-auto">
            Oráculo v3 · Etapa 1
          </Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Materializa 4 sinais estruturais da Receita (idade do sócio, tempo de empresa, sucessão ausente, sweet-spot
          de fadiga) e calcula um <code>seller_intent_score</code> por empresa.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white"
            onClick={runCompute} disabled={running}>
            {running ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
            Recalcular agora
          </Button>
        </div>

        {loading ? (
          <p className="text-xs text-muted-foreground">Carregando...</p>
        ) : (
          <>
            {lastRun && (
              <div className="text-[11px] border border-slate-800 rounded-md p-2 bg-slate-800/20 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={`text-[10px] bg-transparent ${lastRun.status === "success" ? "border-emerald-500/40 text-emerald-300" : "border-rose-500/40 text-rose-300"}`}>
                  {lastRun.status}
                </Badge>
                <span className="text-muted-foreground">
                  {new Date(lastRun.started_at).toLocaleString("pt-BR")}
                </span>
                <span className="text-foreground">{lastRun.rows_processed ?? 0} empresas</span>
                {lastRun.duration_ms != null && (
                  <span className="text-muted-foreground">· {(lastRun.duration_ms / 1000).toFixed(1)}s</span>
                )}
                {lastRun.error_message && <span className="text-rose-300 break-words">{lastRun.error_message}</span>}
              </div>
            )}

            {stats ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="rounded-md border border-slate-800 bg-slate-800/20 p-2">
                  <p className="text-[10px] uppercase text-muted-foreground">Empresas</p>
                  <p className="text-lg font-bold text-foreground">{stats.count}</p>
                </div>
                <div className="rounded-md border border-slate-800 bg-slate-800/20 p-2">
                  <p className="text-[10px] uppercase text-muted-foreground">Mediana</p>
                  <p className="text-lg font-bold text-foreground">{fmt(stats.median)}</p>
                </div>
                <div className="rounded-md border border-slate-800 bg-slate-800/20 p-2">
                  <p className="text-[10px] uppercase text-muted-foreground">P90</p>
                  <p className="text-lg font-bold text-amber-300">{fmt(stats.p90)}</p>
                </div>
                <div className="rounded-md border border-emerald-900/40 bg-emerald-950/20 p-2">
                  <p className="text-[10px] uppercase text-emerald-300/80">Alta intenção (≥0.6)</p>
                  <p className="text-lg font-bold text-emerald-300">{stats.high_intent_count}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Nenhum sinal calculado ainda. Clique em "Recalcular agora" para popular.
              </p>
            )}

            {top.length > 0 && (
              <div className="space-y-1">
                <p className="text-[11px] uppercase text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-purple-400" /> Top intenção de venda
                </p>
                <div className="space-y-1">
                  {top.map((row) => (
                    <div key={row.cnpj} className="flex items-center justify-between gap-2 text-xs border border-slate-800 rounded p-1.5 bg-slate-800/10">
                      <div className="min-w-0 flex-1">
                        <p className="text-foreground break-words font-medium">
                          {row.company?.razao_social ?? row.cnpj}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {row.company ? `${row.company.municipio}/${row.company.uf}` : "—"}
                          {row.company?.setor_ma && ` · ${row.company.setor_ma}`}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-sm font-bold ${row.score >= 0.6 ? "text-emerald-300" : row.score >= 0.4 ? "text-amber-300" : "text-muted-foreground"}`}>
                          {fmtScore(row.score)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
