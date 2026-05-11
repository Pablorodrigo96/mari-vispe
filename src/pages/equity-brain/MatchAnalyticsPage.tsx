import { Link } from "react-router-dom";
import { ArrowLeft, ArrowLeftRight } from "lucide-react";
import { MatchAnalyticsContent } from "@/components/equity-brain/crm/match/MatchAnalyticsContent";
import { PageHeaderHint } from "@/components/ui/PageHeaderHint";

export default function MatchAnalyticsPage() {
  return (
    <div className="p-6 space-y-6 bg-zinc-950 min-h-full">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <Link to="/equity-brain/crm" className="text-[11px] text-zinc-500 hover:text-zinc-300 inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> CRM
          </Link>
          <h1 className="text-2xl font-bold text-zinc-100 mt-1 tracking-tight flex items-center gap-2">
            <ArrowLeftRight className="h-6 w-6 text-[#D9F564]" />
            Match Analytics — Vendedores × Compradores
            <PageHeaderHint pageKey="eb.match.analytics" />
          </h1>
          <p className="text-xs text-zinc-400 mt-1 break-words">
            Cruza oferta (mandatos vigentes) com demanda (compradores ativos) por dimensão.
          </p>
        </div>
        <Link
          to="/equity-brain/crm?tab=executivo"
          className="text-[11px] inline-flex items-center gap-1 px-3 py-1.5 rounded border border-zinc-800 text-zinc-300 hover:text-zinc-100 bg-transparent"
        >
          ← Dashboard Executivo
        </Link>
      </header>
      <MatchAnalyticsContent />
    </div>
  );
}
