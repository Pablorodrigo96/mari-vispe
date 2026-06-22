import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";
import { TrendingUp, Award, AlertTriangle, Target } from "lucide-react";
import { DIMENSOES, brl } from "@/lib/equity-planner/constants";

interface DimScore { dimensao: string; score: number; peso: number; }
interface DimBench {
  dimensao_key: string; p25: number; p50: number; p75: number; p90: number; sample_n: number;
}
interface CompBench {
  multiplo_min: number; multiplo_max: number;
  multiplo_p25: number | null; multiplo_p50: number | null; multiplo_p75: number | null; multiplo_top10: number | null;
  sample_n: number | null; porte: string; arquetipo_id: string;
}

interface Props {
  arquetipoLabel: string;
  porte: string | null;
  ipe: number | null;
  multiploAplicado: number | null;
  ebitdaNormalizado: number | null;
  valorAtual: number | null;
  dims: DimScore[];
  dimBenchmarks: DimBench[];
  compBench: CompBench | null;
}

// Calcula percentil aproximado dado p25/p50/p75/p90 via interpolação linear
function percentile(score: number, b: { p25: number; p50: number; p75: number; p90: number }): number {
  if (score <= b.p25) return Math.max(5, (score / b.p25) * 25);
  if (score <= b.p50) return 25 + ((score - b.p25) / (b.p50 - b.p25)) * 25;
  if (score <= b.p75) return 50 + ((score - b.p50) / (b.p75 - b.p50)) * 25;
  if (score <= b.p90) return 75 + ((score - b.p75) / (b.p90 - b.p75)) * 15;
  return Math.min(99, 90 + ((score - b.p90) / Math.max(1, 100 - b.p90)) * 9);
}

function percentileMult(mult: number, b: CompBench): number {
  const p25 = b.multiplo_p25 || b.multiplo_min;
  const p50 = b.multiplo_p50 || ((b.multiplo_min + b.multiplo_max) / 2);
  const p75 = b.multiplo_p75 || b.multiplo_max;
  const p90 = b.multiplo_top10 || b.multiplo_max * 1.15;
  return percentile(mult, { p25, p50, p75, p90 });
}

function toneFor(p: number): string {
  if (p >= 75) return "text-emerald-400";
  if (p >= 50) return "text-volt";
  if (p >= 25) return "text-amber-400";
  return "text-rose-400";
}

function chip(p: number): string {
  if (p >= 90) return "Top 10%";
  if (p >= 75) return "Top 25%";
  if (p >= 50) return "Acima da mediana";
  if (p >= 25) return "Abaixo da mediana";
  return "Bottom 25%";
}

export default function EquityMarketTab({
  arquetipoLabel, porte, ipe, multiploAplicado, ebitdaNormalizado, valorAtual,
  dims, dimBenchmarks, compBench,
}: Props) {

  // Percentil composto: média das percentis dimensionais ponderada por peso
  const dimRows = useMemo(() => {
    return DIMENSOES.map((d) => {
      const score = dims.find((x) => x.dimensao === d.key)?.score ?? 0;
      const peso = dims.find((x) => x.dimensao === d.key)?.peso ?? 1;
      const b = dimBenchmarks.find((x) => x.dimensao_key === d.key);
      const pct = b ? percentile(score, b) : 50;
      const gap = b ? Math.max(0, b.p90 - score) : 0;
      return { key: d.key, label: d.label, score, peso, p25: b?.p25, p50: b?.p50, p75: b?.p75, p90: b?.p90, pct, gap };
    });
  }, [dims, dimBenchmarks]);

  const ipePercentil = useMemo(() => {
    if (!ipe || !dimBenchmarks.length) return null;
    const weighted = dimRows.reduce((acc, r) => acc + r.pct * r.peso, 0);
    const totalPeso = dimRows.reduce((acc, r) => acc + r.peso, 0);
    return totalPeso > 0 ? weighted / totalPeso : null;
  }, [ipe, dimRows, dimBenchmarks]);

  const multPercentil = useMemo(() => {
    if (!multiploAplicado || !compBench) return null;
    return percentileMult(multiploAplicado, compBench);
  }, [multiploAplicado, compBench]);

  // Potencial: se cada dim destruidora (pct < 50) subir ao p90, recalcular ipe e valor estimado
  const potencialTopo = useMemo(() => {
    if (!compBench || !ebitdaNormalizado) return null;
    const multTopo = compBench.multiplo_top10 || compBench.multiplo_max * 1.15;
    return ebitdaNormalizado * multTopo;
  }, [compBench, ebitdaNormalizado]);

  const gapTopo = useMemo(() => {
    if (!potencialTopo || !valorAtual) return null;
    return potencialTopo - valorAtual;
  }, [potencialTopo, valorAtual]);

  // Sort dim by maior gap para listar prioridades
  const dimSorted = useMemo(() => [...dimRows].sort((a, b) => b.gap - a.gap), [dimRows]);

  // Barchart: você vs mediana vs top 10% por dimensão
  const chartData = useMemo(() =>
    dimRows.map((r) => ({
      dim: r.label.length > 14 ? r.label.slice(0, 14) + "…" : r.label,
      Você: r.score,
      Mediana: r.p50 ?? 0,
      "Top 10%": r.p90 ?? 0,
    })),
  [dimRows]);

  if (!compBench && !dimBenchmarks.length) {
    return (
      <Card className="!bg-slate-900/60 backdrop-blur-md border-volt/10 p-6">
        <p className="text-sm text-muted-foreground">
          Benchmark indisponível para este arquétipo/porte. Recompute o assessment para gerar dados de mercado.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho de cohort */}
      <Card className="!bg-slate-900/60 backdrop-blur-md border-volt/20 p-4">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Cohort comparado</p>
            <p className="font-semibold mt-1 break-words">
              {arquetipoLabel} · porte {porte || "—"}
            </p>
          </div>
          <Badge variant="outline" className="bg-volt/5 text-volt border-volt/30">
            n ≈ {compBench?.sample_n || dimBenchmarks[0]?.sample_n || "—"} empresas · Vispe comps PME 2025
          </Badge>
        </div>
      </Card>

      {/* Percentile cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="!bg-slate-900/60 backdrop-blur-md border-volt/10 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Award className="h-4 w-4 text-volt" />
            <p className="text-xs uppercase text-muted-foreground">IPE vs peers</p>
          </div>
          {ipePercentil !== null ? (
            <>
              <p className={`text-3xl font-bold ${toneFor(ipePercentil)}`}>
                P{Math.round(ipePercentil)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{chip(ipePercentil)}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Seu IPE: <span className="font-mono text-volt">{ipe?.toFixed(0)}</span> · Mediana cohort: ~{Math.round(dimRows.reduce((a, r) => a + (r.p50 || 0) * r.peso, 0) / Math.max(1, dimRows.reduce((a, r) => a + r.peso, 0)))}
              </p>
            </>
          ) : <p className="text-sm text-muted-foreground">—</p>}
        </Card>

        <Card className="!bg-slate-900/60 backdrop-blur-md border-volt/10 p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-volt" />
            <p className="text-xs uppercase text-muted-foreground">Múltiplo EBITDA vs peers</p>
          </div>
          {multPercentil !== null && compBench ? (
            <>
              <p className={`text-3xl font-bold ${toneFor(multPercentil)}`}>
                P{Math.round(multPercentil)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{chip(multPercentil)}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Aplicado: <span className="font-mono text-volt">{multiploAplicado?.toFixed(1)}x</span> · Mediana: {(compBench.multiplo_p50 || 0).toFixed(1)}x · Top 10%: {(compBench.multiplo_top10 || 0).toFixed(1)}x
              </p>
            </>
          ) : <p className="text-sm text-muted-foreground">—</p>}
        </Card>

        <Card className="!bg-slate-900/60 backdrop-blur-md border-emerald-500/20 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-emerald-400" />
            <p className="text-xs uppercase text-muted-foreground">Gap pra topo do setor</p>
          </div>
          {gapTopo !== null && potencialTopo ? (
            <>
              <p className="text-3xl font-bold text-emerald-400">{brl(gapTopo)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Subindo ao top 10% do cohort: <span className="text-emerald-400 font-mono">{brl(potencialTopo)}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Valor de referência se o múltiplo for o teto da faixa de comps.
              </p>
            </>
          ) : <p className="text-sm text-muted-foreground">—</p>}
        </Card>
      </div>

      {/* Bar chart comparativo */}
      <Card className="!bg-slate-900/60 backdrop-blur-md border-volt/10 p-5">
        <h3 className="font-semibold mb-1">Você vs Mediana vs Top 10% — por dimensão</h3>
        <p className="text-xs text-muted-foreground mb-3">Comparação de score (0–100) contra peers do mesmo arquétipo e porte.</p>
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="dim" tick={{ fill: "#aaa", fontSize: 10 }} angle={-25} textAnchor="end" height={70} />
            <YAxis domain={[0, 100]} tick={{ fill: "#aaa", fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #D9F564" }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine y={50} stroke="#666" strokeDasharray="2 4" />
            <Bar dataKey="Você" fill="#D9F564" />
            <Bar dataKey="Mediana" fill="#64748b" />
            <Bar dataKey="Top 10%" fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Tabela detalhada */}
      <Card className="!bg-slate-900/60 backdrop-blur-md border-volt/10 p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          Onde você está abaixo do mercado — priorize por maior gap
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-volt/20 text-xs uppercase text-muted-foreground">
                <th className="py-2 pr-3">Dimensão</th>
                <th className="py-2 px-2 text-right">Você</th>
                <th className="py-2 px-2 text-right">Mediana</th>
                <th className="py-2 px-2 text-right">Top 10%</th>
                <th className="py-2 px-2 text-right">Percentil</th>
                <th className="py-2 pl-2 text-right">Gap pro topo</th>
              </tr>
            </thead>
            <tbody>
              {dimSorted.map((r) => (
                <tr key={r.key} className="border-b border-volt/5">
                  <td className="py-2 pr-3 break-words">{r.label}</td>
                  <td className="py-2 px-2 text-right font-mono">{r.score}</td>
                  <td className="py-2 px-2 text-right font-mono text-muted-foreground">{r.p50?.toFixed(0) ?? "—"}</td>
                  <td className="py-2 px-2 text-right font-mono text-emerald-400/80">{r.p90?.toFixed(0) ?? "—"}</td>
                  <td className={`py-2 px-2 text-right font-mono ${toneFor(r.pct)}`}>P{Math.round(r.pct)}</td>
                  <td className="py-2 pl-2 text-right font-mono">
                    {r.gap > 0 ? <span className="text-amber-400">+{r.gap.toFixed(0)}</span> : <span className="text-emerald-400">no topo</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-muted-foreground mt-3">
          Benchmarks Vispe comps PME 2025 — amostra Brasil, próprios + parceiros M&A. Percentis interpolados linearmente entre p25/p50/p75/p90.
        </p>
      </Card>
    </div>
  );
}
