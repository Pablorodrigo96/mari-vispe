import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { KpiHeader } from "@/components/equity-brain/crm/KpiHeader";
import { PipelineFunnel } from "@/components/equity-brain/crm/PipelineFunnel";
import { MandatesTable } from "@/components/equity-brain/crm/MandatesTable";
import { BuyersTable } from "@/components/equity-brain/crm/BuyersTable";
import { NextActionsPanel } from "@/components/equity-brain/crm/NextActionsPanel";
import { TasksWidget } from "@/components/equity-brain/crm/TasksWidget";
import { ExecutiveDashboardContent } from "@/components/equity-brain/crm/exec/ExecutiveDashboardContent";
import { MatchAnalyticsContent } from "@/components/equity-brain/crm/match/MatchAnalyticsContent";
import { Briefcase, Target, Activity, ShieldCheck, TrendingUp, ArrowLeftRight, Kanban, Plus, Download, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

type SubTab = "mandates" | "buyers" | "activity";
type TopTab = "geral" | "executivo" | "matching";

const TOP_TABS: { key: TopTab; label: string; Icon: any }[] = [
  { key: "geral", label: "Visão Geral", Icon: LayoutDashboard },
  { key: "executivo", label: "Dashboard Executivo", Icon: TrendingUp },
  { key: "matching", label: "Match Analytics", Icon: ArrowLeftRight },
];

export default function CrmHubPage() {
  const [params, setParams] = useSearchParams();
  const initialTab = (params.get("tab") as TopTab) || "geral";
  const [topTab, setTopTab] = useState<TopTab>(
    TOP_TABS.some((t) => t.key === initialTab) ? initialTab : "geral",
  );
  const [tab, setTab] = useState<SubTab>("mandates");

  // Sync URL → state when user uses back/forward
  useEffect(() => {
    const fromUrl = (params.get("tab") as TopTab) || "geral";
    if (TOP_TABS.some((t) => t.key === fromUrl) && fromUrl !== topTab) {
      setTopTab(fromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const switchTop = (next: TopTab) => {
    setTopTab(next);
    const p = new URLSearchParams(params);
    if (next === "geral") p.delete("tab");
    else p.set("tab", next);
    setParams(p, { replace: true });
  };

  const subTabs: { key: SubTab; label: string; Icon: any }[] = [
    { key: "mandates", label: "Mandatos", Icon: Briefcase },
    { key: "buyers", label: "Buyers", Icon: Target },
    { key: "activity", label: "Atividades", Icon: Activity },
  ];

  return (
    <div className="bg-zinc-950 min-h-full">
      {/* Header + Tabs Monday-style */}
      <div className="sticky top-0 z-20 bg-zinc-950 border-b border-zinc-800">
        <div className="p-6 pb-0 space-y-4">
          <header className="flex items-end justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">CRM</h1>
              <p className="text-xs text-zinc-400 mt-1">
                Hub de mandatos, dashboards e analytics — tudo em um só lugar.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Link to="/equity-brain/crm/mandate/new" className="text-[11px] inline-flex items-center gap-1 px-3 py-1.5 rounded bg-[#D9F564] text-zinc-900 font-semibold hover:opacity-90">
                <Plus className="h-3 w-3" /> Novo mandato
              </Link>
              <Link to="/equity-brain/crm/exports" className="text-[11px] inline-flex items-center gap-1 px-3 py-1.5 rounded border border-zinc-800 text-zinc-300 hover:text-zinc-100 hover:border-zinc-700 bg-transparent">
                <Download className="h-3 w-3" /> Exports
              </Link>
              <Link to="/equity-brain/crm/pipeline" className="text-[11px] inline-flex items-center gap-1 px-3 py-1.5 rounded border border-zinc-800 text-zinc-300 hover:text-zinc-100 hover:border-zinc-700 bg-transparent">
                <Kanban className="h-3 w-3" /> Pipeline
              </Link>
              <Link to="/equity-brain/crm/admin/auditoria" className="text-[11px] inline-flex items-center gap-1 px-3 py-1.5 rounded border border-zinc-800 text-zinc-300 hover:text-zinc-100 hover:border-zinc-700 bg-transparent">
                <ShieldCheck className="h-3 w-3" /> Auditoria
              </Link>
              <Link to="/equity-brain/crm/admin/permissoes" className="text-[11px] inline-flex items-center gap-1 px-3 py-1.5 rounded border border-zinc-800 text-zinc-300 hover:text-zinc-100 hover:border-zinc-700 bg-transparent">
                <ShieldCheck className="h-3 w-3" /> Permissões
              </Link>
            </div>
          </header>

          <div className="flex items-center gap-1 -mb-px overflow-x-auto">
            {TOP_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => switchTop(t.key)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  topTab === t.key
                    ? "border-[#D9F564] text-[#D9F564] bg-zinc-900/40"
                    : "border-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/20",
                )}
              >
                <t.Icon className="h-4 w-4" /> {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {topTab === "geral" && (
          <>
            <KpiHeader />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-4">
                <NextActionsPanel />
                <PipelineFunnel />
              </div>
              <div className="space-y-4">
                <TasksWidget />
              </div>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800 rounded p-4">
              <div className="text-[10px] uppercase text-zinc-400">Como o motor está aprendendo</div>
              <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
                Cada interesse marcado, teaser enviado, follow-up no WhatsApp e mudança
                de preferência alimenta o <span className="text-emerald-300 font-medium">Equity Brain v2</span>.
                O matching recalcula em segundos quando algo muda — você não precisa refazer nada manualmente.
              </p>
            </div>

            <div className="flex items-center gap-1 border-b border-zinc-800">
              {subTabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 text-xs border-b-2 -mb-px transition-colors",
                    tab === t.key
                      ? "border-emerald-500 text-emerald-300"
                      : "border-transparent text-zinc-400 hover:text-zinc-100",
                  )}
                >
                  <t.Icon className="h-3.5 w-3.5" /> {t.label}
                </button>
              ))}
            </div>

            {tab === "mandates" && <MandatesTable />}
            {tab === "buyers" && <BuyersTable />}
            {tab === "activity" && (
              <div className="text-xs text-zinc-400 p-6 bg-zinc-900/40 border border-zinc-800 rounded">
                Use as fichas individuais (mandato ou buyer) para ver e registrar atividades.
              </div>
            )}
          </>
        )}

        {topTab === "executivo" && <ExecutiveDashboardContent />}
        {topTab === "matching" && <MatchAnalyticsContent />}
      </div>
    </div>
  );
}
