/** @deprecated Substituído — manter em código por hora; remover após Fase B aprovada. */
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Building2, Target, Flame, PhoneCall, Sheet as SheetIcon, Download, RefreshCw, TrendingUp, Briefcase, ArrowLeftRight, FileSignature, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useVertical } from "@/hooks/useVertical";
import { useUserRoles } from "@/hooks/useUserRoles";
import { EBStatCard } from "@/components/equity-brain/EBStatCard";
import { EBFunnel } from "@/components/equity-brain/EBFunnel";
import { DealCard } from "@/components/equity-brain/DealCard";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { formatNumber, relativeTime, eventIcon, scoreColor } from "@/lib/equityBrain";
import { rowsToCsv, downloadCsv } from "@/lib/exportCsv";
import { MatchHotHero } from "@/components/equity-brain/match/MatchHotHero";
import { cn } from "@/lib/utils";

const REFRESH_MS = 60_000;

export default function DashboardPage() {
  const navigate = useNavigate();
  const { cnaeFilter, isIsp } = useVertical();
  const { isAdmin, isAdvisor } = useUserRoles();
  const [drawerCnpj, setDrawerCnpj] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  async function syncMarketplace() {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-listings-to-equity-brain", {
        body: { run_pipeline: true },
      });
      if (error) throw error;
      const synced = (data as any)?.synced ?? 0;
      const total = (data as any)?.total_listings ?? 0;
      toast.success(`${synced} de ${total} anúncios sincronizados`, {
        description: "Sinais, scores e oportunidades foram recalculados.",
      });
      // refetch dashboard
      kpis.refetch(); funnel.refetch(); top.refetch(); events.refetch();
    } catch (e: any) {
      toast.error("Falha ao sincronizar marketplace", { description: e?.message });
    } finally {
      setSyncing(false);
    }
  }

  const kpis = useQuery({
    queryKey: ["eb", "dashboard-kpis", cnaeFilter.join(",")],
    refetchInterval: REFRESH_MS,
    queryFn: async () => {
      const companiesQ = supabase.from("eb_companies" as any).select("cnpj", { count: "exact", head: true }).ilike("situacao_cadastral", "ativa");
      const premiumQ   = supabase.from("eb_opportunities_ready" as any).select("cnpj", { count: "exact", head: true }).gte("ma_score", 80);
      if (cnaeFilter.length > 0) {
        companiesQ.in("cnae_principal", cnaeFilter);
        premiumQ.in("cnae_principal", cnaeFilter);
      }
      const [companies, scored, premium, callsWeek] = await Promise.all([
        companiesQ,
        supabase.from("eb_companies_scored" as any).select("ma_score").not("ma_score", "is", null).limit(1000),
        premiumQ,
        supabase.from("eb_call_feedback" as any).select("id", { count: "exact", head: true }).gte("call_at", new Date(Date.now() - 7 * 86400000).toISOString()),
      ]);
      const scores = (scored.data ?? []) as any[];
      const avgMa = scores.length > 0 ? scores.reduce((a, b) => a + Number(b.ma_score ?? 0), 0) / scores.length : 0;
      return {
        companies: companies.count ?? 0,
        avgMa: avgMa.toFixed(1),
        premium: premium.count ?? 0,
        callsWeek: callsWeek.count ?? 0,
      };
    },
  });

  const funnel = useQuery({
    queryKey: ["eb", "dashboard-funnel"],
    refetchInterval: REFRESH_MS,
    queryFn: async () => {
      const [universe, filtered, ranked, premium, talking] = await Promise.all([
        supabase.from("eb_companies" as any).select("cnpj", { count: "exact", head: true }),
        supabase.from("eb_companies_scored" as any).select("cnpj", { count: "exact", head: true }).gte("ma_score", 50),
        supabase.from("eb_opportunities_ready" as any).select("cnpj", { count: "exact", head: true }),
        supabase.from("eb_opportunities_ready" as any).select("cnpj", { count: "exact", head: true }).gte("ma_score", 80),
        supabase.from("eb_call_feedback" as any).select("cnpj", { count: "exact", head: true }).gte("call_at", new Date(Date.now() - 30 * 86400000).toISOString()),
      ]);
      return [
        { label: "Universo",     value: universe.count ?? 0 },
        { label: "Filtradas",    value: filtered.count ?? 0 },
        { label: "Ranqueadas",   value: ranked.count ?? 0 },
        { label: "Premium",      value: premium.count ?? 0 },
        { label: "Em conversa",  value: talking.count ?? 0 },
      ];
    },
  });

  const top = useQuery({
    queryKey: ["eb", "dashboard-top", cnaeFilter.join(",")],
    refetchInterval: REFRESH_MS,
    queryFn: async () => {
      let q = supabase
        .from("eb_opportunities_ready" as any)
        .select("cnpj, razao_social, uf, municipio, setor_ma, ma_score, vispe_score, sucessao_score, buyers_count, best_thesis_name, cnae_principal")
        .gte("ma_score", 80)
        .order("ma_score", { ascending: false })
        .limit(50);
      if (cnaeFilter.length > 0) q = q.in("cnae_principal", cnaeFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  async function exportTop100Isp() {
    setExporting(true);
    try {
      const { data, error } = await supabase
        .from("eb_v_isp_universe" as any)
        .select("cnpj, razao_social, uf, municipio, cnae_principal, ma_score, vispe_score, sucessao_score, buyer_fit_score")
        .not("ma_score", "is", null)
        .order("ma_score", { ascending: false })
        .limit(100);
      if (error) throw error;
      const rows = data ?? [];
      if (rows.length === 0) {
        toast.warning("Nenhuma empresa ISP no banco ainda", {
          description: "Rode o sync de CNAEs de telecom em /admin antes de exportar.",
        });
        return;
      }
      const csv = rowsToCsv(rows as any[], [
        "cnpj", "razao_social", "uf", "municipio", "cnae_principal",
        "ma_score", "vispe_score", "sucessao_score", "buyer_fit_score",
      ]);
      const stamp = new Date().toISOString().slice(0, 10);
      downloadCsv(`top100-isp-${stamp}.csv`, csv);
      toast.success(`${rows.length} empresas exportadas`);
    } catch (e: any) {
      toast.error("Falha ao exportar", { description: e?.message });
    } finally {
      setExporting(false);
    }
  }

  const events = useQuery({
    queryKey: ["eb", "dashboard-events"],
    refetchInterval: REFRESH_MS,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eb_events" as any)
        .select("id, event_type, entity_type, entity_id, processed_status, created_at")
        .eq("processed_status", "success")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Dashboard{isIsp && <span className="text-emerald-400 text-base font-medium ml-2">· Vertical ISP</span>}</h1>
          <p className="text-sm text-zinc-500 mt-1">Visão consolidada do funil de M&A · auto-refresh 60s</p>
        </div>
        <div className="flex items-center gap-2">
          {(isAdmin || isAdvisor) && (
            <Button
              variant="outline" size="sm"
              onClick={syncMarketplace}
              disabled={syncing}
              className="bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800 hover:text-emerald-300"
            >
              <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", syncing && "animate-spin")} />
              {syncing ? "Sincronizando…" : "Sincronizar marketplace"}
            </Button>
          )}
          <Button
            variant="outline" size="sm"
            onClick={exportTop100Isp}
            disabled={exporting}
            className="bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800 hover:text-emerald-300"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            {exporting ? "Exportando…" : "Exportar Top 100 ISP CSV"}
          </Button>
        </div>
      </div>

      {/* Atalhos para os Dashboards M&A */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { to: "/equity-brain/dashboard/executivo", label: "Executivo M&A", desc: "Visão consolidada Buyside + Sellside", Icon: TrendingUp },
          { to: "/equity-brain/dashboard/mandato",   label: "Mandatos",      desc: "Pipeline, status e geografia",         Icon: Briefcase },
          { to: "/equity-brain/dashboard/match",     label: "Matching",      desc: "Compatibilidades e conversão",         Icon: ArrowLeftRight },
          { to: "/equity-brain/dashboard/nbo",       label: "NBO",           desc: "Propostas por executivo e estado",     Icon: FileSignature },
        ].map(({ to, label, desc, Icon }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className="group text-left rounded-lg border border-zinc-800 bg-zinc-900/60 hover:border-[#D9F564]/50 hover:bg-zinc-900 p-4 transition-all"
          >
            <div className="flex items-center justify-between">
              <Icon className="h-4 w-4 text-[#D9F564]" />
              <ArrowRight className="h-3.5 w-3.5 text-zinc-600 group-hover:text-[#D9F564] transition-colors" />
            </div>
            <div className="mt-3 text-sm font-semibold text-zinc-100">{label}</div>
            <div className="text-[11px] text-zinc-500 mt-0.5">{desc}</div>
          </button>
        ))}
      </div>

      <MatchHotHero />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <EBStatCard label="Empresas no banco" value={formatNumber(kpis.data?.companies)} hint="situação ativa" Icon={Building2} accent="zinc" />
        <EBStatCard label="Score M&A médio"   value={kpis.data?.avgMa ?? "—"}            hint="amostra 1k recentes" Icon={Target} accent="emerald" />
        <EBStatCard label="Oportunidades quentes" value={formatNumber(kpis.data?.premium)} hint="ma_score ≥ 80" Icon={Flame} accent="amber" />
        <EBStatCard label="Calls (7 dias)"    value={formatNumber(kpis.data?.callsWeek)}  hint="histórico BDR" Icon={PhoneCall} accent="blue" />
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="text-sm font-bold text-zinc-100 mb-4">Funil de qualificação</h2>
        {funnel.data ? <EBFunnel stages={funnel.data} /> : <div className="text-xs text-zinc-500">Carregando…</div>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-zinc-100">Top 50 oportunidades · Premium</h2>
            <Button
              variant="ghost" size="sm"
              onClick={() => navigate("/equity-brain/oportunidades")}
              className="text-xs text-emerald-400 hover:text-emerald-300 hover:bg-zinc-800"
            >
              Ver todas →
            </Button>
          </div>
          <div className="overflow-auto max-h-[600px]">
            <table className="w-full text-xs">
              <thead className="bg-zinc-950 text-zinc-500 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Razão Social</th>
                  <th className="text-left px-3 py-2 font-medium">UF</th>
                  <th className="text-left px-3 py-2 font-medium">Setor</th>
                  <th className="text-right px-3 py-2 font-medium">M&A</th>
                  <th className="text-right px-3 py-2 font-medium">Vispe</th>
                  <th className="text-right px-3 py-2 font-medium">Buyers</th>
                  <th className="text-left px-3 py-2 font-medium">Tese</th>
                  <th className="text-right px-3 py-2 font-medium">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {(top.data ?? []).map((r) => (
                  <tr key={r.cnpj} className="hover:bg-zinc-800/40 cursor-pointer" onClick={() => setDrawerCnpj(r.cnpj)}>
                    <td className="px-3 py-2 text-zinc-100 truncate max-w-[220px]">{r.razao_social}</td>
                    <td className="px-3 py-2 text-zinc-400">{r.uf}</td>
                    <td className="px-3 py-2 text-zinc-400 truncate max-w-[120px]">{r.setor_ma}</td>
                    <td className={cn("px-3 py-2 text-right font-mono font-bold tabular-nums", scoreColor(r.ma_score))}>{Math.round(Number(r.ma_score ?? 0))}</td>
                    <td className="px-3 py-2 text-right font-mono text-zinc-400 tabular-nums">{Math.round(Number(r.vispe_score ?? 0))}</td>
                    <td className="px-3 py-2 text-right font-mono text-zinc-400 tabular-nums">{r.buyers_count ?? 0}</td>
                    <td className="px-3 py-2 text-zinc-400 truncate max-w-[140px]">{r.best_thesis_name ?? "—"}</td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        size="sm" variant="ghost"
                        onClick={(e) => { e.stopPropagation(); setDrawerCnpj(r.cnpj); }}
                        className="h-6 px-2 text-[10px] text-emerald-400 hover:bg-zinc-800"
                      >
                        Ver
                      </Button>
                    </td>
                  </tr>
                ))}
                {(top.data ?? []).length === 0 && !top.isLoading && (
                  <tr><td colSpan={8} className="px-3 py-8 text-center text-zinc-500"><SheetIcon className="h-6 w-6 mx-auto mb-2 opacity-50" />Nenhuma oportunidade premium ainda. Rode <span className="font-mono text-emerald-400">refresh-opportunities</span>.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900">
          <div className="px-5 py-3 border-b border-zinc-800">
            <h2 className="text-sm font-bold text-zinc-100">Atividade recente</h2>
          </div>
          <div className="divide-y divide-zinc-800 max-h-[600px] overflow-auto">
            {(events.data ?? []).map((e) => (
              <div key={e.id} className="px-4 py-2.5 text-xs flex items-start gap-2.5">
                <div className="text-base leading-none mt-0.5">{eventIcon(e.event_type)}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-zinc-300 truncate">{e.event_type}</div>
                  <div className="text-zinc-500 truncate font-mono text-[10px]">{e.entity_id}</div>
                </div>
                <div className="text-[10px] text-zinc-600 shrink-0">{relativeTime(e.created_at)}</div>
              </div>
            ))}
            {(events.data ?? []).length === 0 && !events.isLoading && (
              <div className="p-4 text-xs text-zinc-500 text-center">Sem eventos recentes.</div>
            )}
          </div>
        </div>
      </div>

      <Sheet open={!!drawerCnpj} onOpenChange={(o) => !o && setDrawerCnpj(null)}>
        <SheetContent side="right" className="dark bg-zinc-950 border-l border-zinc-800 text-zinc-100 w-full sm:max-w-[520px] p-0 overflow-y-auto">
          {drawerCnpj && <DealCard cnpj={drawerCnpj} mode="drawer" />}
        </SheetContent>
      </Sheet>
    </div>
  );
}