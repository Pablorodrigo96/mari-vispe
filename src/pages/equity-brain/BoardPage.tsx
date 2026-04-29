import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Activity, AlertTriangle, Building2, CheckCircle2, Database,
  PhoneCall, Radio, Sparkles, Target, TrendingUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EBStatCard } from "@/components/equity-brain/EBStatCard";
import { EBFunnel } from "@/components/equity-brain/EBFunnel";
import { InfoHint } from "@/components/equity-brain/InfoHint";
import { EB_TIPS } from "@/lib/ebTooltips";
import { Button } from "@/components/ui/button";
import { formatNumber, relativeTime, scoreColor } from "@/lib/equityBrain";
import { cn } from "@/lib/utils";

const REFRESH_MS = 60_000;
const WEEK_AGO = () => new Date(Date.now() - 7 * 86_400_000).toISOString();

export default function BoardPage() {
  const navigate = useNavigate();

  // 1) Saúde do motor
  const health = useQuery({
    queryKey: ["board", "health"],
    refetchInterval: REFRESH_MS,
    queryFn: async () => {
      const [companies, signals, scores, premium, strong, queue, queueErrors] = await Promise.all([
        supabase.from("eb_companies" as any).select("cnpj", { count: "exact", head: true }),
        supabase.from("eb_company_signals" as any).select("id", { count: "exact", head: true }),
        supabase.from("eb_company_scores" as any).select("id", { count: "exact", head: true }).eq("is_current", true),
        supabase.from("eb_opportunities_ready" as any).select("cnpj", { count: "exact", head: true }).gte("ma_score", 80),
        supabase.from("eb_opportunities_ready" as any).select("cnpj", { count: "exact", head: true }).gte("ma_score", 60).lt("ma_score", 80),
        supabase.from("eb_events" as any).select("id", { count: "exact", head: true }).is("processed_at", null),
        supabase.from("eb_events" as any).select("id", { count: "exact", head: true }).eq("processed_status", "error"),
      ]);
      return {
        companies: companies.count ?? 0,
        signals: signals.count ?? 0,
        scores: scores.count ?? 0,
        premium: premium.count ?? 0,
        strong: strong.count ?? 0,
        queue: queue.count ?? 0,
        queueErrors: queueErrors.count ?? 0,
      };
    },
  });

  // 2) Funil semanal
  const funnel = useQuery({
    queryKey: ["board", "weekly-funnel"],
    refetchInterval: REFRESH_MS,
    queryFn: async () => {
      const since = WEEK_AGO();
      const [companiesNew, signalsNew, oppsNew, calls, qualified] = await Promise.all([
        supabase.from("eb_companies" as any).select("cnpj", { count: "exact", head: true }).gte("created_at", since),
        supabase.from("eb_company_signals" as any).select("id", { count: "exact", head: true }).gte("created_at", since),
        supabase.from("eb_opportunities_ready" as any).select("cnpj", { count: "exact", head: true }).gte("refreshed_at", since),
        supabase.from("eb_call_feedback" as any).select("id", { count: "exact", head: true }).gte("call_at", since),
        supabase.from("eb_call_feedback" as any).select("id", { count: "exact", head: true }).gte("call_at", since).in("outcome", ["qualified", "meeting_scheduled", "mandate_signed"]),
      ]);
      return [
        { label: "Empresas novas",  value: companiesNew.count ?? 0 },
        { label: "Signals novos",   value: signalsNew.count ?? 0 },
        { label: "Oportunidades",   value: oppsNew.count ?? 0 },
        { label: "Calls",           value: calls.count ?? 0 },
        { label: "Leads quentes",   value: qualified.count ?? 0 },
      ];
    },
  });

  // 3) Pipeline por buyer (top 10 por matches premium)
  const pipeline = useQuery({
    queryKey: ["board", "buyer-pipeline"],
    refetchInterval: REFRESH_MS,
    queryFn: async () => {
      const { data: rawMatches } = await supabase
        .from("eb_matches" as any)
        .select("buyer_id, match_score")
        .eq("is_current", true)
        .gte("match_score", 60)
        .limit(5000);
      const tally = new Map<string, { total: number; premium: number }>();
      for (const m of (rawMatches ?? []) as any[]) {
        const t = tally.get(m.buyer_id) ?? { total: 0, premium: 0 };
        t.total += 1;
        if (Number(m.match_score) >= 80) t.premium += 1;
        tally.set(m.buyer_id, t);
      }
      const ids = Array.from(tally.keys());
      if (ids.length === 0) return [] as any[];
      const { data: buyers } = await supabase
        .from("eb_buyers" as any)
        .select("id, nome, tipo, source")
        .in("id", ids);
      return (buyers ?? [])
        .map((b: any) => ({ ...b, ...tally.get(b.id)! }))
        .sort((a: any, b: any) => b.premium - a.premium || b.total - a.total)
        .slice(0, 10);
    },
  });

  // 4) Versão ativa do score
  const versions = useQuery({
    queryKey: ["board", "engine-versions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("eb_score_engine_versions" as any)
        .select("version, description, activated_at, deactivated_at, created_at, notes")
        .order("created_at", { ascending: false });
      return (data ?? []) as any[];
    },
  });
  const activeVersion = versions.data?.find((v: any) => v.activated_at && !v.deactivated_at);

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-400" />
            Board Executivo
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Visão de board · saúde do motor, funil semanal e versão ativa · auto-refresh 60s
          </p>
        </div>
        {activeVersion && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-900/60 bg-emerald-950/40 text-emerald-300 text-xs">
            <Radio className="h-3.5 w-3.5" />
            <span className="font-mono font-bold">{activeVersion.version}</span>
            <span className="text-emerald-500/80">ativa desde {relativeTime(activeVersion.activated_at)}</span>
          </div>
        )}
      </div>

      {/* 1) Saúde do motor */}
      <section className="space-y-3">
        <h2 className="text-xs uppercase tracking-wider text-zinc-500 font-bold">Saúde do motor</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <EBStatCard label="Empresas no banco"   value={formatNumber(health.data?.companies)} hint="universo total"          Icon={Building2} accent="zinc" />
          <EBStatCard label="Signals computados"  value={formatNumber(health.data?.signals)}   hint="sinais ativos"           Icon={Activity}  accent="blue" />
          <EBStatCard label="Scores calculados"   value={formatNumber(health.data?.scores)}    hint="versão atual"            Icon={Target}    accent="emerald" />
          <EBStatCard label="Oportunidades quentes" value={formatNumber(health.data?.premium)} hint="ma_score ≥ 80"          Icon={TrendingUp} accent="amber" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className={cn(
            "rounded-lg border p-4",
            (health.data?.queue ?? 0) > 100
              ? "border-amber-900 bg-amber-950/30"
              : "border-zinc-800 bg-zinc-900",
          )}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Fila de eventos</div>
                <div className={cn("text-2xl font-bold mt-1", (health.data?.queue ?? 0) > 100 ? "text-amber-300" : "text-zinc-100")}>
                  {formatNumber(health.data?.queue)}
                </div>
                <div className="text-[10px] text-zinc-500 mt-1">não processados (alerta &gt; 1000)</div>
              </div>
              {(health.data?.queue ?? 0) > 100 ? (
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              )}
            </div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Eventos com erro</div>
            <div className={cn("text-2xl font-bold mt-1", (health.data?.queueErrors ?? 0) > 0 ? "text-rose-300" : "text-zinc-100")}>
              {formatNumber(health.data?.queueErrors)}
            </div>
            <div className="text-[10px] text-zinc-500 mt-1">drop após 3 retries</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Tier strong</div>
            <div className="text-2xl font-bold mt-1 text-zinc-100">{formatNumber(health.data?.strong)}</div>
            <div className="text-[10px] text-zinc-500 mt-1">60 ≤ ma_score &lt; 80</div>
          </div>
        </div>
      </section>

      {/* 2) Funil semanal */}
      <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-4">
          Funil semanal · últimos 7 dias
        </h2>
        {funnel.data ? (
          <EBFunnel stages={funnel.data} />
        ) : (
          <div className="text-xs text-zinc-500 py-8 text-center">Carregando…</div>
        )}
      </section>

      {/* 3) Pipeline por buyer */}
      <section className="rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-wider text-zinc-500 font-bold">
            Top 10 buyers por matches premium
          </h2>
          <Button
            variant="ghost" size="sm"
            onClick={() => navigate("/equity-brain/buyers")}
            className="text-xs text-emerald-400 hover:text-emerald-300 hover:bg-zinc-800"
          >
            Ver todos →
          </Button>
        </div>
        <table className="w-full text-xs">
          <thead className="bg-zinc-950 text-zinc-500">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Buyer</th>
              <th className="text-left px-3 py-2 font-medium">Tipo</th>
              <th className="text-right px-3 py-2 font-medium">Matches</th>
              <th className="text-right px-3 py-2 font-medium">Premium</th>
              <th className="text-right px-3 py-2 font-medium">% premium</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {(pipeline.data ?? []).map((b: any) => {
              const pct = b.total > 0 ? Math.round((b.premium / b.total) * 100) : 0;
              return (
                <tr key={b.id} className="hover:bg-zinc-800/40 cursor-pointer" onClick={() => navigate(`/equity-brain/buyers`)}>
                  <td className="px-4 py-2.5 text-zinc-100 font-medium truncate max-w-[280px]">{b.nome}</td>
                  <td className="px-3 py-2.5 text-zinc-400">{b.tipo}</td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-zinc-300">{formatNumber(b.total)}</td>
                  <td className={cn("px-3 py-2.5 text-right font-mono font-bold tabular-nums", scoreColor(pct))}>{formatNumber(b.premium)}</td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-zinc-400">{pct}%</td>
                </tr>
              );
            })}
            {(pipeline.data ?? []).length === 0 && !pipeline.isLoading && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-zinc-500 text-xs">
                <PhoneCall className="h-5 w-5 mx-auto mb-2 opacity-50" />
                Sem matches ainda. Rode <span className="font-mono text-emerald-400">match-batch</span> após o sync de empresas.
              </td></tr>
            )}
          </tbody>
        </table>
      </section>

      {/* 4) Histórico de versões */}
      <section className="rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-800">
          <h2 className="text-xs uppercase tracking-wider text-zinc-500 font-bold flex items-center gap-2">
            <Database className="h-3.5 w-3.5" />
            Versões da fórmula de score
          </h2>
        </div>
        <table className="w-full text-xs">
          <thead className="bg-zinc-950 text-zinc-500">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Versão</th>
              <th className="text-left px-3 py-2 font-medium">Status</th>
              <th className="text-left px-3 py-2 font-medium">Descrição</th>
              <th className="text-right px-3 py-2 font-medium">Ativada</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {(versions.data ?? []).map((v: any) => {
              const isActive = v.activated_at && !v.deactivated_at;
              return (
                <tr key={v.version}>
                  <td className="px-4 py-2.5 font-mono font-bold text-emerald-300">{v.version}</td>
                  <td className="px-3 py-2.5">
                    {isActive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-emerald-950/60 text-emerald-300 border border-emerald-900">
                        <CheckCircle2 className="h-3 w-3" /> Ativa
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-500 border border-zinc-700">
                        Histórica
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-zinc-400 truncate max-w-[480px]">{v.description ?? "—"}</td>
                  <td className="px-3 py-2.5 text-right text-[10px] text-zinc-500">{v.activated_at ? relativeTime(v.activated_at) : "—"}</td>
                </tr>
              );
            })}
            {(versions.data ?? []).length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-zinc-500 text-xs">Nenhuma versão registrada.</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
