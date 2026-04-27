import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Play, RefreshCw, TrendingUp, Sparkles, Target, Gavel, Brain } from "lucide-react";
import { toast } from "sonner";
import { MatchDecisionCard, type MatchDecisionRow } from "@/components/equity-brain/MatchDecisionCard";

type MatchRow = MatchDecisionRow;

type DealEvent = {
  id: string;
  match_id: string | null;
  buyer_id: string | null;
  event_type: string;
  rejection_reason: string | null;
  event_ts: string;
  notes: string | null;
};

type Theta = {
  buyer_id: string;
  feature_name: string;
  posterior_mean: number;
  posterior_std: number;
  n_observations: number;
  last_updated: string;
};

const fmtPct = (n: number | null) => (n == null ? "—" : `${(n * 100).toFixed(1)}%`);
const fmtBRL = (n: number | null) =>
  n == null ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);

export default function EBShadowPage() {
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [v1, setV1] = useState<MatchRow[]>([]);
  const [v2, setV2] = useState<MatchRow[]>([]);
  const [tab, setTab] = useState<"summary" | "diff" | "decision" | "learning">("summary");
  const [events, setEvents] = useState<DealEvent[]>([]);
  const [thetas, setThetas] = useState<Theta[]>([]);

  async function load() {
    setLoading(true);
    const { data: v1Data } = await (supabase as any)
      .schema("equity_brain")
      .from("matches").select("*")
      .eq("engine_version", "v1").eq("is_current", true).order("match_score", { ascending: false }).limit(500);
    const { data: v2Data } = await (supabase as any)
      .schema("equity_brain")
      .from("matches").select("*")
      .eq("engine_version", "v2").eq("is_current", true).order("match_score", { ascending: false }).limit(500);
    setV1((v1Data ?? []) as any);
    setV2((v2Data ?? []) as any);

    const { data: evData } = await (supabase as any)
      .schema("equity_brain")
      .from("deal_events").select("*")
      .order("event_ts", { ascending: false }).limit(20);
    setEvents((evData ?? []) as any);

    const { data: thData } = await (supabase as any)
      .schema("equity_brain")
      .from("buyer_revealed_thetas").select("*")
      .order("n_observations", { ascending: false }).limit(50);
    setThetas((thData ?? []) as any);

    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function runFn(name: string, body: any, label: string) {
    setRunning(name);
    try {
      const { data, error } = await supabase.functions.invoke(name, { body });
      if (error) throw error;
      toast.success(`${label} concluído`, { description: `Processados: ${(data as any)?.processed ?? "—"}` });
      await load();
    } catch (e: any) {
      toast.error(`Falha em ${label}`, { description: e.message ?? String(e) });
    } finally {
      setRunning(null);
    }
  }

  const stats = useMemo(() => {
    const avg = (arr: MatchRow[], k: keyof MatchRow) => {
      const ns = arr.map((r) => Number(r[k] ?? 0)).filter((n) => !isNaN(n));
      return ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : 0;
    };
    return {
      v1: { count: v1.length, avgScore: avg(v1, "match_score") },
      v2: {
        count: v2.length,
        avgScore: avg(v2, "match_score"),
        avgPClose: avg(v2, "p_close_12m"),
        withBands: v2.filter((r) => r.ev_p50 != null).length,
        abstained: v2.filter((r) => r.abstain).length,
      },
    };
  }, [v1, v2]);

  const sharedKeys = useMemo(() => {
    const v1Keys = new Set(v1.map((r) => `${r.cnpj}|${r.buyer_id}`));
    return v2.filter((r) => v1Keys.has(`${r.cnpj}|${r.buyer_id}`));
  }, [v1, v2]);

  const diffRows = useMemo(() => {
    const v1Idx = new Map<string, MatchRow>();
    v1.forEach((r) => v1Idx.set(`${r.cnpj}|${r.buyer_id}`, r));
    return sharedKeys
      .map((r) => {
        const a = v1Idx.get(`${r.cnpj}|${r.buyer_id}`);
        return { v2: r, v1: a, delta: r.match_score - (a?.match_score ?? 0) };
      })
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 30);
  }, [sharedKeys, v1]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-amber-400" />
            Equity Brain — Shadow Mode (v1 vs v2)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            O motor v2 (adaptativo, Bayesiano) roda em paralelo ao v1 (regras fixas).
            Compare métricas e divergências antes do flip.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={load} disabled={loading} className="bg-transparent">
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Recarregar
          </Button>
          <Button size="sm" onClick={() => runFn("compute-mandate-active-proba", { limit: 500 }, "Mandate Probabilities")}
            disabled={!!running}>
            {running === "compute-mandate-active-proba" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
            Calcular p(mandato)
          </Button>
          <Button size="sm" onClick={() => runFn("match-company-v2", { limit_companies: 100, persist: true }, "Match v2")}
            disabled={!!running}>
            {running === "match-company-v2" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
            Rodar match v2
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="!bg-slate-900/60 backdrop-blur-md border-slate-800">
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Matches v1 (current)</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-foreground">{stats.v1.count}</div>
            <p className="text-xs text-muted-foreground mt-1">avg score {stats.v1.avgScore.toFixed(1)}</p></CardContent>
        </Card>
        <Card className="!bg-slate-900/60 backdrop-blur-md border-slate-800">
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Matches v2 (shadow)</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-amber-400">{stats.v2.count}</div>
            <p className="text-xs text-muted-foreground mt-1">avg score {stats.v2.avgScore.toFixed(1)}</p></CardContent>
        </Card>
        <Card className="!bg-slate-900/60 backdrop-blur-md border-slate-800">
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">p(close 12m) médio</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-foreground">{fmtPct(stats.v2.avgPClose)}</div>
            <p className="text-xs text-muted-foreground mt-1">só v2 calcula</p></CardContent>
        </Card>
        <Card className="!bg-slate-900/60 backdrop-blur-md border-slate-800">
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Com bandas de preço</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-foreground">{stats.v2.withBands}</div>
            <p className="text-xs text-muted-foreground mt-1">abstidos: {stats.v2.abstained}</p></CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="bg-slate-900/60">
          <TabsTrigger value="summary"><Target className="h-4 w-4 mr-1" />Top v2 Matches</TabsTrigger>
          <TabsTrigger value="diff"><TrendingUp className="h-4 w-4 mr-1" />Divergências v1↔v2</TabsTrigger>
          <TabsTrigger value="decision"><Gavel className="h-4 w-4 mr-1" />Decisão & Feedback</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-4">
          <Card className="!bg-slate-900/60 backdrop-blur-md border-slate-800">
            <CardHeader><CardTitle className="text-base text-foreground">Top 30 matches v2 por score</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground border-b border-slate-800">
                    <tr>
                      <th className="text-left py-2 px-2">CNPJ</th>
                      <th className="text-left py-2 px-2">Arquétipo</th>
                      <th className="text-right py-2 px-2">Score</th>
                      <th className="text-right py-2 px-2">p(close 12m)</th>
                      <th className="text-right py-2 px-2">EV p50</th>
                      <th className="text-left py-2 px-2">Top reasons</th>
                    </tr>
                  </thead>
                  <tbody>
                    {v2.slice(0, 30).map((r) => (
                      <tr key={r.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                        <td className="py-2 px-2 font-mono text-xs break-all">{r.cnpj}</td>
                        <td className="py-2 px-2"><Badge variant="outline" className="text-xs bg-transparent">{r.buyer_archetype ?? "—"}</Badge></td>
                        <td className="py-2 px-2 text-right font-bold text-foreground">{r.match_score}</td>
                        <td className="py-2 px-2 text-right">
                          <span className={`font-semibold ${(r.p_close_12m ?? 0) > 0.4 ? "text-emerald-400" : "text-foreground"}`}>
                            {fmtPct(r.p_close_12m)}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right text-xs">{fmtBRL(r.ev_p50)}</td>
                        <td className="py-2 px-2 text-xs text-muted-foreground break-words max-w-[280px]">
                          {Array.isArray(r.reasons) ? r.reasons.slice(0, 2).map((x: any) => x.key).join(", ") : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diff" className="mt-4">
          <Card className="!bg-slate-900/60 backdrop-blur-md border-slate-800">
            <CardHeader>
              <CardTitle className="text-base text-foreground">Maiores divergências v1 → v2 (mesma empresa+buyer)</CardTitle>
              <p className="text-xs text-muted-foreground">{sharedKeys.length} pares compartilhados. Δ &gt; 0 = v2 mais otimista.</p>
            </CardHeader>
            <CardContent>
              {sharedKeys.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Nenhuma divergência comparável: rode o match v1 (<code>match-company</code>) para popular dados de comparação.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-muted-foreground border-b border-slate-800">
                      <tr>
                        <th className="text-left py-2 px-2">CNPJ</th>
                        <th className="text-right py-2 px-2">Score v1</th>
                        <th className="text-right py-2 px-2">Score v2</th>
                        <th className="text-right py-2 px-2">Δ</th>
                        <th className="text-right py-2 px-2">p(close) v2</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diffRows.map((d, i) => (
                        <tr key={i} className="border-b border-slate-800/50">
                          <td className="py-2 px-2 font-mono text-xs break-all">{d.v2.cnpj}</td>
                          <td className="py-2 px-2 text-right">{d.v1?.match_score ?? "—"}</td>
                          <td className="py-2 px-2 text-right font-bold">{d.v2.match_score}</td>
                          <td className={`py-2 px-2 text-right font-bold ${d.delta > 0 ? "text-emerald-400" : d.delta < 0 ? "text-rose-400" : ""}`}>
                            {d.delta > 0 ? "+" : ""}{d.delta}
                          </td>
                          <td className="py-2 px-2 text-right">{fmtPct(d.v2.p_close_12m)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="decision" className="mt-4">
          <div className="mb-3">
            <p className="text-sm text-muted-foreground">
              Cards de decisão para BDRs: bandas de preço (p10/p50/p90), probabilidade de fechamento com IC,
              top contribuições e botões para registrar feedback (rejeição, NDA, fechado). Cada evento alimenta
              o motor adaptativo da Fase 4.
            </p>
          </div>
          {v2.length === 0 ? (
            <Card className="!bg-slate-900/60 backdrop-blur-md border-slate-800">
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Nenhum match v2 disponível. Rode o motor v2 primeiro.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {v2.slice(0, 24).map((m) => (
                <MatchDecisionCard key={m.id} match={m} onLogged={load} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
