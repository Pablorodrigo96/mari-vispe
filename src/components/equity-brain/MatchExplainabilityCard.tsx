import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Microscope, RefreshCw } from "lucide-react";

type Contribution = { feature: string; weight: number; value: number; contribution: number };
type MatchRow = {
  id: string;
  cnpj: string;
  buyer_id: string;
  match_score: number;
  p_close_12m: number | null;
  buyer_archetype: string | null;
  feature_contributions: Contribution[];
};

const FEATURE_COLORS: Record<string, string> = {
  setor: "bg-violet-500", geografia: "bg-sky-500", tamanho: "bg-amber-500",
  tese: "bg-fuchsia-500", financeiro: "bg-emerald-500", semantic_fit: "bg-cyan-500",
  seller_intent: "bg-rose-500", wave_pressure: "bg-teal-500", timing: "bg-yellow-500",
  horizonte: "bg-indigo-500", governanca: "bg-blue-500",
};

function colorFor(feat: string) { return FEATURE_COLORS[feat] ?? "bg-slate-500"; }

export function MatchExplainabilityCard() {
  const [rows, setRows] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await (supabase as any)
      .schema("equity_brain")
      .from("matches")
      .select("id, cnpj, buyer_id, match_score, p_close_12m, buyer_archetype, feature_contributions")
      .eq("engine_version", "v2").eq("is_current", true)
      .order("match_score", { ascending: false }).limit(50);
    const list = (data ?? []) as MatchRow[];
    setRows(list);
    if (list.length && !selectedId) setSelectedId(list[0].id);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const selected = useMemo(() => rows.find((r) => r.id === selectedId) ?? null, [rows, selectedId]);
  const sortedContribs = useMemo(() => {
    if (!selected || !Array.isArray(selected.feature_contributions)) return [];
    return [...selected.feature_contributions].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  }, [selected]);
  const maxAbs = useMemo(() => Math.max(0.001, ...sortedContribs.map((c) => Math.abs(c.contribution))), [sortedContribs]);

  return (
    <Card className="!bg-slate-900/60 backdrop-blur-md border-slate-800">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div>
          <CardTitle className="text-base text-foreground flex items-center gap-2">
            <Microscope className="h-4 w-4 text-fuchsia-400" />
            Explicabilidade do Match (decomposição estilo SHAP)
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1 break-words">
            Quanto cada feature contribuiu para o score final. Top 50 matches v2 disponíveis.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading} className="bg-transparent">
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          Recarregar
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-xs text-muted-foreground py-4 text-center"><Loader2 className="h-4 w-4 animate-spin inline mr-1" />Carregando…</div>
        ) : rows.length === 0 ? (
          <div className="text-xs text-muted-foreground py-4 text-center">Nenhum match v2. Rode o motor primeiro.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1 max-h-[360px] overflow-y-auto space-y-1">
              {rows.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className={`w-full text-left p-2 rounded text-xs border transition ${
                    selectedId === r.id
                      ? "bg-fuchsia-950/40 border-fuchsia-700/60 text-foreground"
                      : "bg-slate-900/40 border-slate-800 text-muted-foreground hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] break-all">{r.cnpj}</span>
                    <Badge variant="outline" className="bg-transparent text-[10px]">{r.match_score}</Badge>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 break-words">
                    {r.buyer_archetype ?? "generic"}
                  </div>
                </button>
              ))}
            </div>

            <div className="md:col-span-2">
              {!selected ? (
                <div className="text-xs text-muted-foreground py-4 text-center">Selecione um match.</div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
                    <div className="text-xs text-muted-foreground break-words">
                      <span className="font-mono">{selected.cnpj}</span> ↔ <span className="font-mono">{selected.buyer_id.slice(0, 8)}</span>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="bg-transparent text-xs">Score {selected.match_score}</Badge>
                      <Badge variant="outline" className="bg-transparent text-xs text-emerald-300 border-emerald-700/60">
                        p(close) {selected.p_close_12m == null ? "—" : `${(selected.p_close_12m * 100).toFixed(1)}%`}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {sortedContribs.map((c) => {
                      const widthPct = (Math.abs(c.contribution) / maxAbs) * 100;
                      return (
                        <div key={c.feature} className="space-y-0.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-foreground font-medium break-words">{c.feature}</span>
                            <span className="text-muted-foreground font-mono text-[10px]">
                              v={c.value.toFixed(2)} · w={c.weight.toFixed(3)} · Δ={c.contribution.toFixed(3)}
                            </span>
                          </div>
                          <div className="h-2.5 bg-slate-800/60 rounded overflow-hidden">
                            <div
                              className={`h-full ${colorFor(c.feature)} transition-all`}
                              style={{ width: `${widthPct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
