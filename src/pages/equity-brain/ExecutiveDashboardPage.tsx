import { Link } from "react-router-dom";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { ExecutiveDashboardContent } from "@/components/equity-brain/crm/exec/ExecutiveDashboardContent";
import { PageHeaderHint } from "@/components/ui/PageHeaderHint";

export default function ExecutiveDashboardPage() {
  return (
    <div className="p-6 space-y-6 bg-zinc-950 min-h-full">
      <header className="flex items-end justify-between">
        <div>
          <Link to="/equity-brain/crm" className="text-[11px] text-zinc-500 hover:text-zinc-300 inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> CRM
          </Link>
          <h1 className="text-2xl font-bold text-zinc-100 mt-1 tracking-tight flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-[#D9F564]" />
            Dashboard Executivo M&amp;A
            <PageHeaderHint pageKey="eb.exec" />
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Visão consolidada de todas as operações Buyside e Sellside.
          </p>
        </div>
        <Link
          to="/equity-brain/crm?tab=matching"
          className="text-[11px] inline-flex items-center gap-1 px-3 py-1.5 rounded border border-zinc-800 text-zinc-300 hover:text-zinc-100 hover:border-zinc-700 bg-transparent"
        >
          Match Analytics →
        </Link>
      </header>
      <ExecutiveDashboardContent />
    </div>
  );
}
