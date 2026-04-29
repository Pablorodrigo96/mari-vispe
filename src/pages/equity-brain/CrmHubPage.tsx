import { useState } from "react";
import { KpiHeader } from "@/components/equity-brain/crm/KpiHeader";
import { PipelineFunnel } from "@/components/equity-brain/crm/PipelineFunnel";
import { MandatesTable } from "@/components/equity-brain/crm/MandatesTable";
import { BuyersTable } from "@/components/equity-brain/crm/BuyersTable";
import { Briefcase, Target, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "mandates" | "buyers" | "activity";

export default function CrmHubPage() {
  const [tab, setTab] = useState<Tab>("mandates");

  const tabs: { key: Tab; label: string; Icon: any }[] = [
    { key: "mandates", label: "Mandatos", Icon: Briefcase },
    { key: "buyers", label: "Buyers", Icon: Target },
    { key: "activity", label: "Atividades", Icon: Activity },
  ];

  return (
    <div className="p-6 space-y-6 bg-zinc-950 min-h-full">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">CRM</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Hub de mandatos e buyers, com matching adaptativo e WhatsApp integrado.
          </p>
        </div>
      </header>

      <KpiHeader />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2"><PipelineFunnel /></div>
        <div className="bg-zinc-900/40 border border-zinc-800 rounded p-4">
          <div className="text-[10px] uppercase text-zinc-400">Como o motor está aprendendo</div>
          <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
            Cada interesse marcado, teaser enviado, follow-up no WhatsApp e mudança
            de preferência alimenta o <span className="text-emerald-300 font-medium">Equity Brain v2</span>.
            O matching recalcula em segundos quando algo muda — você não precisa refazer nada manualmente.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-zinc-800">
        {tabs.map((t) => (
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
    </div>
  );
}
