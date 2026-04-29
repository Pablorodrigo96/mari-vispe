/**
 * DriftMonitorCard — Bloco 4 (Oráculo v3)
 * Série temporal v2 vs v2 (snapshot anterior). Mostra estabilidade
 * por dia: Spearman, overlap, sample_size. Inclui semáforo de drift.
 */
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, RefreshCw, TrendingUp, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

type Snap = {
  snapshot_at: string;
  cnpj: string;
  spearman_corr: number | null;
  overlap_pct: number | null;
  mean_score_v2: number | null;
  mean_score_v1: number | null; // snapshot anterior nesta v2
  sample_size: number | null;
};

const HEALTHY_SPEARMAN = 0.85;
const WARN_SPEARMAN = 0.70;

export default function DriftMonitorCard() {
  const [snaps, setSnaps] = useState<Snap[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const { data } = await (supabase as any)
        .schema("equity_brain")
        .from("drift_snapshots")
        .select("snapshot_at, cnpj, spearman_corr, overlap_pct, mean_score_v2, mean_score_v1, sample_size")
        .order("snapshot_at", { ascending: true })
        .limit(500);
      setSnaps((data ?? []) as Snap[]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const globalSeries = snaps
    .filter((s) => s.cnpj === "GLOBAL" || s.cnpj === "__GLOBAL__" || !s.cnpj)
    .map((s) => ({
      ts: new Date(s.snapshot_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      spearman: s.spearman_corr == null ? null : Number(s.spearman_corr),
      overlap: s.overlap_pct == null ? null : Number(s.overlap_pct),
      mean: s.mean_score_v2 == null ? null : Number(s.mean_score_v2),
    }));

  const series = globalSeries.length > 0 ? globalSeries : snaps.slice(-30).map((s) => ({
    ts: new Date(s.snapshot_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    spearman: s.spearman_corr == null ? null : Number(s.spearman_corr),
    overlap: s.overlap_pct == null ? null : Number(s.overlap_pct),
    mean: s.mean_score_v2 == null ? null : Number(s.mean_score_v2),
  }));

  const lastSpearman = [...series].reverse().find((p) => p.spearman != null)?.spearman ?? null;
  const stability =
    lastSpearman == null ? "unknown"
    : lastSpearman >= HEALTHY_SPEARMAN ? "healthy"
    : lastSpearman >= WARN_SPEARMAN ? "warn"
    : "alert";

  const stabilityColor =
    stability === "healthy" ? "bg-emerald-950/40 text-emerald-300 border-emerald-800"
    : stability === "warn" ? "bg-amber-950/40 text-amber-300 border-amber-800"
    : stability === "alert" ? "bg-rose-950/40 text-rose-300 border-rose-800"
    : "bg-slate-900 text-slate-300 border-slate-700";

  return (
    <Card className="!bg-slate-900/60 backdrop-blur-md border-slate-800">
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
        <CardTitle className="text-base text-slate-100 flex items-center gap-2">
          <Activity className="h-4 w-4 text-cyan-400" />
          Drift Monitor (v2 vs snapshot anterior)
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={stabilityColor}>
            {stability === "healthy" && <TrendingUp className="h-3 w-3 mr-1" />}
            {stability !== "healthy" && stability !== "unknown" && <AlertTriangle className="h-3 w-3 mr-1" />}
            Spearman {lastSpearman == null ? "—" : lastSpearman.toFixed(2)}
          </Badge>
          <Button size="sm" variant="outline" onClick={load} disabled={loading} className="bg-transparent">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-slate-400">Carregando…</p>
        ) : series.length === 0 ? (
          <p className="text-sm text-slate-400 break-words">
            Sem snapshots ainda. Rode <code className="text-cyan-300">compute-drift-snapshot</code> diariamente.
          </p>
        ) : (
          <>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                  <XAxis dataKey="ts" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} domain={[-1, 1]} />
                  <Tooltip
                    contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 6, fontSize: 12 }}
                    labelStyle={{ color: "#cbd5e1" }}
                  />
                  <ReferenceLine y={HEALTHY_SPEARMAN} stroke="#10b981" strokeDasharray="3 3" />
                  <ReferenceLine y={WARN_SPEARMAN} stroke="#f59e0b" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="spearman" stroke="#22d3ee" strokeWidth={2} dot={false} name="Spearman" />
                  <Line type="monotone" dataKey="overlap" stroke="#a78bfa" strokeWidth={1.5} dot={false} name="Overlap" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <Mini label="Snapshots" value={snaps.length.toString()} />
              <Mini label="Última coleta" value={
                snaps.length ? new Date(snaps[snaps.length - 1].snapshot_at).toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" }) : "—"
              } />
              <Mini label="Estabilidade" value={
                stability === "healthy" ? "Saudável"
                : stability === "warn" ? "Atenção"
                : stability === "alert" ? "Alerta"
                : "—"
              } />
            </div>
            <p className="text-[11px] text-slate-500 break-words">
              Linha verde = limiar saudável (≥0.85). Amarela = atenção (≥0.70). Abaixo disso, há drift relevante na engine.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-slate-800 bg-slate-950/40 p-2">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-sm text-slate-100 font-medium break-words">{value}</div>
    </div>
  );
}
