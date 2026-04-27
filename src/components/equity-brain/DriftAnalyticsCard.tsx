import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, RefreshCw, GitCompare } from "lucide-react";
import { toast } from "sonner";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from "recharts";

type Snapshot = {
  id: string;
  snapshot_at: string;
  cnpj: string | null;
  top_n: number;
  overlap_pct: number | null;
  spearman_corr: number | null;
  mean_score_v1: number | null;
  mean_score_v2: number | null;
  std_v1: number | null;
  std_v2: number | null;
  histogram_v1: number[] | null;
  histogram_v2: number[] | null;
  sample_size: number | null;
};

const fmtPct = (n: number | null | undefined) =>
  n == null ? "—" : `${(n * 100).toFixed(1)}%`;

export function DriftAnalyticsCard() {
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [globals, setGlobals] = useState<Snapshot[]>([]);
  const [perCnpj, setPerCnpj] = useState<Snapshot[]>([]);

  async function load() {
    setLoading(true);
    try {
      const { data: g } = await (supabase as any)
        .schema("equity_brain")
        .from("drift_snapshots")
        .select("*")
        .is("cnpj", null)
        .order("snapshot_at", { ascending: false })
        .limit(20);
      setGlobals((g ?? []) as any);

      const { data: c } = await (supabase as any)
        .schema("equity_brain")
        .from("drift_snapshots")
        .select("*")
        .not("cnpj", "is", null)
        .order("snapshot_at", { ascending: false })
        .limit(50);
      setPerCnpj((c ?? []) as any);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function runDrift() {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("compute-drift-snapshot", {
        body: { sample_companies: 50, top_n: 100 },
      });
      if (error) throw error;
      const d: any = data ?? {};
      toast.success("Drift computado", {
        description: `Overlap médio: ${fmtPct(d.mean_overlap)} · Spearman: ${(d.mean_spearman ?? 0).toFixed(2)}`,
      });
      await load();
    } catch (e: any) {
      toast.error("Falha ao computar drift", { description: e.message ?? String(e) });
    } finally {
      setRunning(false);
    }
  }

  const latest = globals[0];
  const histData = latest
    ? (latest.histogram_v1 ?? []).map((v, i) => ({
        bin: `${(i * 10)}–${((i + 1) * 10)}`,
        v1: v,
        v2: latest.histogram_v2?.[i] ?? 0,
      }))
    : [];

  const seriesData = [...globals]
    .reverse()
    .map((s) => ({
      date: new Date(s.snapshot_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      overlap: Number(((s.overlap_pct ?? 0) * 100).toFixed(1)),
      spearman: Number(((s.spearman_corr ?? 0) * 100).toFixed(1)),
    }));

  return (
    <div className="space-y-4">
      <Card className="!bg-slate-900/60 backdrop-blur-md border-slate-800">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base text-foreground flex items-center gap-2">
                <GitCompare className="h-4 w-4 text-amber-400" />
                Drift v1 ↔ v2
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Divergência entre os dois motores: overlap top-N, correlação de ranks (Spearman) e
                distribuições de score. Atualizado semanalmente (domingos 05:00 BRT).
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={load} disabled={loading} className="bg-transparent">
                <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Recarregar
              </Button>
              <Button size="sm" onClick={runDrift} disabled={running}>
                {running ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
                Computar agora
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!latest ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              Nenhum snapshot disponível. Clique em "Computar agora" para gerar o primeiro.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-md border border-slate-800 bg-slate-800/30 p-3">
                  <p className="text-[10px] uppercase text-muted-foreground">Overlap top-{latest.top_n}</p>
                  <p className="text-2xl font-bold text-foreground">{fmtPct(latest.overlap_pct)}</p>
                </div>
                <div className="rounded-md border border-slate-800 bg-slate-800/30 p-3">
                  <p className="text-[10px] uppercase text-muted-foreground">Spearman</p>
                  <p className="text-2xl font-bold text-foreground">{(latest.spearman_corr ?? 0).toFixed(2)}</p>
                </div>
                <div className="rounded-md border border-slate-800 bg-slate-800/30 p-3">
                  <p className="text-[10px] uppercase text-muted-foreground">Mean v1 / v2</p>
                  <p className="text-sm font-semibold text-foreground">
                    {(latest.mean_score_v1 ?? 0).toFixed(1)} / {(latest.mean_score_v2 ?? 0).toFixed(1)}
                  </p>
                </div>
                <div className="rounded-md border border-slate-800 bg-slate-800/30 p-3">
                  <p className="text-[10px] uppercase text-muted-foreground">Empresas</p>
                  <p className="text-2xl font-bold text-foreground">{latest.sample_size ?? 0}</p>
                </div>
              </div>

              <div>
                <h4 className="text-xs text-muted-foreground mb-2">Distribuição de scores (último snapshot)</h4>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={histData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="bin" stroke="#94a3b8" fontSize={10} />
                      <YAxis stroke="#94a3b8" fontSize={10} />
                      <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="v1" fill="#64748b" name="v1" />
                      <Bar dataKey="v2" fill="#fbbf24" name="v2" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {seriesData.length > 1 && (
                <div>
                  <h4 className="text-xs text-muted-foreground mb-2">Evolução temporal (overlap & Spearman, %)</h4>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={seriesData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                        <YAxis stroke="#94a3b8" fontSize={10} />
                        <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", fontSize: 12 }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line type="monotone" dataKey="overlap" stroke="#10b981" strokeWidth={2} name="Overlap %" />
                        <Line type="monotone" dataKey="spearman" stroke="#f59e0b" strokeWidth={2} name="Spearman ×100" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {perCnpj.length > 0 && (
        <Card className="!bg-slate-900/60 backdrop-blur-md border-slate-800">
          <CardHeader>
            <CardTitle className="text-sm text-foreground">Top divergências por empresa</CardTitle>
            <p className="text-xs text-muted-foreground">CNPJs com menor overlap entre v1 e v2 (mais divergentes).</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-[360px]">
              <table className="w-full text-xs">
                <thead className="text-[10px] uppercase text-muted-foreground border-b border-slate-800 sticky top-0 bg-slate-900">
                  <tr>
                    <th className="text-left py-1 px-2">CNPJ</th>
                    <th className="text-right py-1 px-2">Overlap</th>
                    <th className="text-right py-1 px-2">Spearman</th>
                    <th className="text-right py-1 px-2">Mean v1</th>
                    <th className="text-right py-1 px-2">Mean v2</th>
                    <th className="text-right py-1 px-2">Quando</th>
                  </tr>
                </thead>
                <tbody>
                  {[...perCnpj]
                    .sort((a, b) => (a.overlap_pct ?? 1) - (b.overlap_pct ?? 1))
                    .slice(0, 30)
                    .map((s) => (
                      <tr key={s.id} className="border-b border-slate-800/50">
                        <td className="py-1 px-2 font-mono break-all">{s.cnpj}</td>
                        <td className="py-1 px-2 text-right">
                          <Badge variant="outline" className={`text-[10px] bg-transparent ${(s.overlap_pct ?? 1) < 0.3 ? "border-rose-500/40 text-rose-300" : "border-slate-700"}`}>
                            {fmtPct(s.overlap_pct)}
                          </Badge>
                        </td>
                        <td className="py-1 px-2 text-right">{(s.spearman_corr ?? 0).toFixed(2)}</td>
                        <td className="py-1 px-2 text-right">{(s.mean_score_v1 ?? 0).toFixed(1)}</td>
                        <td className="py-1 px-2 text-right">{(s.mean_score_v2 ?? 0).toFixed(1)}</td>
                        <td className="py-1 px-2 text-right text-muted-foreground">
                          {new Date(s.snapshot_at).toLocaleDateString("pt-BR")}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
