import { useMemo, useState } from "react";
import { AlertTriangle, TrendingUp, ShieldAlert, BookOpen, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMariInsightOfDay, type MariInsightRow } from "@/hooks/useMariInsightOfDay";
import { useDealDrawer } from "@/contexts/DealDrawerContext";
import { toast } from "sonner";

const TYPE_META: Record<string, { label: string; Icon: any; cls: string; border: string }> = {
  urgency:     { label: "Urgência",    Icon: AlertTriangle, cls: "text-rose-300",    border: "border-rose-900/60 bg-rose-950/20" },
  opportunity: { label: "Oportunidade", Icon: TrendingUp,    cls: "text-emerald-300", border: "border-emerald-900/60 bg-emerald-950/20" },
  risk:        { label: "Risco",        Icon: ShieldAlert,   cls: "text-amber-300",   border: "border-amber-900/60 bg-amber-950/20" },
  learning:    { label: "Aprendizado",  Icon: BookOpen,      cls: "text-purple-300",  border: "border-purple-900/60 bg-purple-950/20" },
};

const TRUNCATE_AT = 220;

interface Props {
  dateStr: string; // YYYY-MM-DD
  isToday: boolean;
}

export default function MariInsightCard({ dateStr, isToday }: Props) {
  const { data: insights = [], isLoading } = useMariInsightOfDay(dateStr);

  return (
    <div className="bg-gradient-to-br from-[#D9F564]/10 via-zinc-900/60 to-zinc-900/40 border border-[#D9F564]/30 rounded-lg">
      <div className="px-3 py-2 border-b border-[#D9F564]/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-[#D9F564]" />
          <span className="text-[11px] font-semibold text-[#D9F564] uppercase tracking-wide">
            Insight da Mari
          </span>
        </div>
        {insights.length > 0 && (
          <span className="text-[10px] text-zinc-500 tabular-nums">{insights.length}</span>
        )}
      </div>

      <div className="p-2 space-y-2 max-h-[34vh] overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-3 bg-zinc-800/60 rounded animate-pulse" />
            <div className="h-3 bg-zinc-800/60 rounded animate-pulse w-3/4" />
          </div>
        ) : insights.length === 0 ? (
          <div className="text-[11px] text-zinc-500 italic px-1 py-2">
            {isToday
              ? "A Mari ainda não publicou insights hoje. A próxima rodada roda às 06h."
              : "Sem insights gerados neste dia."}
          </div>
        ) : (
          insights.map((i) => <InsightRow key={i.id} insight={i} />)
        )}
      </div>
    </div>
  );
}

function InsightRow({ insight }: { insight: MariInsightRow }) {
  const [expanded, setExpanded] = useState(false);
  const { openDeal } = useDealDrawer();
  const meta = TYPE_META[insight.insight_type] || TYPE_META.learning;
  const Icon = meta.Icon;

  const needsTruncate = (insight.message?.length ?? 0) > TRUNCATE_AT;
  const display = useMemo(() => {
    if (!needsTruncate || expanded) return insight.message;
    return insight.message.slice(0, TRUNCATE_AT).trimEnd() + "…";
  }, [insight.message, expanded, needsTruncate]);

  const handleAction = () => {
    const p = insight.action_payload || {};
    if (p.type === "open_deal" && p.mandate_id) {
      openDeal(p.mandate_id);
    } else if (p.type === "open_url" && p.url) {
      window.open(p.url, "_blank");
    } else if (insight.mandate_id) {
      openDeal(insight.mandate_id);
    } else {
      toast.info("Sem ação direta para este insight");
    }
  };

  return (
    <div className={cn("rounded-md border p-2 flex items-start gap-2", meta.border)}>
      <div className={cn("shrink-0 h-6 w-6 rounded-md flex items-center justify-center bg-zinc-950/60", meta.cls)}>
        <Icon className="h-3 w-3" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          <Badge
            variant="outline"
            className={cn("text-[9px] uppercase tracking-wider bg-transparent px-1.5 py-0", meta.cls, meta.border)}
          >
            {meta.label}
          </Badge>
          <span className="text-[9px] text-zinc-500">P{insight.priority}</span>
        </div>
        <div className="text-[12px] text-zinc-100 break-words leading-snug">{display}</div>

        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
          {needsTruncate && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-[10px] text-zinc-400 hover:text-zinc-200 inline-flex items-center gap-0.5"
            >
              {expanded ? (
                <>
                  Recolher <ChevronUp className="h-3 w-3" />
                </>
              ) : (
                <>
                  Ler mais <ChevronDown className="h-3 w-3" />
                </>
              )}
            </button>
          )}
          {insight.suggested_action && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleAction}
              className="h-6 text-[10px] bg-transparent border-zinc-700 text-zinc-200 hover:bg-zinc-800 px-2"
            >
              {insight.suggested_action}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
