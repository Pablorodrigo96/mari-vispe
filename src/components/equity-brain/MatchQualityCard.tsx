/**
 * MatchQualityCard — Etapa 4 (Consolidação v2)
 * Mostra distribuição da engine v2 ativa: cobertura, score médio,
 * contribuição média de cada feature (semantic_fit, wave_pressure, seller_intent...).
 */
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Activity, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type FeatureStat = { feature: string; n: number; avg_value: number; avg_weight: number; avg_contrib: number };
type Quality = {
  total_current: number;
  v1_current: number;
  v2_current: number;
  unique_cnpjs: number;
  unique_buyers: number;
  avg_match_score: number;
  features: FeatureStat[];
};

const FEATURE_LABEL: Record<string, string> = {
  setor: "Setor", geografia: "Geografia", financeiro: "Financeiro",
  tese: "Tese", tamanho: "Porte", timing: "Timing",
  seller_intent: "Seller Intent", semantic_fit: "Semantic Fit",
  wave_pressure: "Wave Pressure", recorrencia: "Recorrência",
  governanca: "Governança", cross_sell: "Cross-sell",
};

export default function MatchQualityCard() {
  const [data, setData] = useState<Quality | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      // Counts por engine
      const { data: counts } = await supabase
        .schema("equity_brain" as any)
        .from("matches")
        .select("engine_version, cnpj, buyer_id, match_score, feature_contributions")
        .eq("is_current", true)
        .limit(5000);

      const rows = (counts as any[]) ?? [];
      const v2Rows = rows.filter((r) => r.engine_version === "v2");
      const v1Rows = rows.filter((r) => r.engine_version !== "v2");

      // Agrega features
      const agg: Record<string, { n: number; vSum: number; wSum: number; cSum: number }> = {};
      for (const r of v2Rows) {
        const feats = Array.isArray(r.feature_contributions) ? r.feature_contributions : [];
        for (const f of feats) {
          const k = f.feature;
          if (!agg[k]) agg[k] = { n: 0, vSum: 0, wSum: 0, cSum: 0 };
          agg[k].n += 1;
          agg[k].vSum += Number(f.value ?? 0);
          agg[k].wSum += Number(f.weight ?? 0);
          agg[k].cSum += Number(f.contribution ?? 0);
        }
      }
      const features: FeatureStat[] = Object.entries(agg)
        .map(([feature, a]) => ({
          feature,
          n: a.n,
          avg_value: a.n ? a.vSum / a.n : 0,
          avg_weight: a.n ? a.wSum / a.n : 0,
          avg_contrib: a.n ? a.cSum / a.n : 0,
        }))
        .sort((a, b) => b.avg_contrib - a.avg_contrib);

      const avgScore = v2Rows.length
        ? v2Rows.reduce((s, r) => s + Number(r.match_score ?? 0), 0) / v2Rows.length
        : 0;

      setData({
        total_current: rows.length,
        v1_current: v1Rows.length,
        v2_current: v2Rows.length,
        unique_cnpjs: new Set(v2Rows.map((r) => r.cnpj)).size,
        unique_buyers: new Set(v2Rows.map((r) => r.buyer_id)).size,
        avg_match_score: avgScore,
        features,
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <Card className="!bg-slate-900/60 backdrop-blur-md border-slate-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-100">
          <Activity className="h-4 w-4 text-emerald-400" />
          Qualidade do Motor v2
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-slate-400">Carregando…</p>
        ) : !data ? (
          <p className="text-sm text-slate-400">Sem dados.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Matches v2" value={data.v2_current.toLocaleString("pt-BR")} accent="emerald" />
              <Stat label="Empresas cobertas" value={`${data.unique_cnpjs}`} />
              <Stat label="Buyers ativos" value={`${data.unique_buyers}`} />
              <Stat label="Score médio" value={data.avg_match_score.toFixed(1)} accent="amber" />
            </div>

            {data.v1_current > 0 && (
              <Badge variant="outline" className="bg-amber-950/40 text-amber-300 border-amber-900/60">
                {data.v1_current.toLocaleString("pt-BR")} matches v1 antigos ainda ativos — rodar match-batch
              </Badge>
            )}

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-slate-400 uppercase tracking-wide">
                <TrendingUp className="h-3 w-3" /> Contribuição média por feature
              </div>
              <div className="space-y-2">
                {data.features.slice(0, 12).map((f) => {
                  const pct = Math.min(100, Math.round(f.avg_contrib * 500));
                  return (
                    <div key={f.feature} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300">{FEATURE_LABEL[f.feature] ?? f.feature}</span>
                        <span className="text-slate-400 font-mono">
                          v {f.avg_value.toFixed(2)} · w {f.avg_weight.toFixed(2)} · c {f.avg_contrib.toFixed(3)}
                        </span>
                      </div>
                      <Progress value={pct} className="h-1.5 bg-slate-800" />
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "emerald" | "amber" }) {
  const color = accent === "emerald" ? "text-emerald-300"
    : accent === "amber" ? "text-amber-300"
    : "text-slate-100";
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`text-lg font-semibold ${color}`}>{value}</div>
    </div>
  );
}
