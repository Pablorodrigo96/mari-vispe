import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDealDrawer } from "@/contexts/DealDrawerContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, ShieldAlert, BookOpen, X, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const TYPE_META: Record<string, { label: string; Icon: any; cls: string; border: string }> = {
  urgency:     { label: "Urgência",    Icon: AlertTriangle, cls: "text-rose-300",    border: "border-rose-900/60 bg-rose-950/20" },
  opportunity: { label: "Oportunidade", Icon: TrendingUp,    cls: "text-emerald-300", border: "border-emerald-900/60 bg-emerald-950/20" },
  risk:        { label: "Risco",        Icon: ShieldAlert,   cls: "text-amber-300",   border: "border-amber-900/60 bg-amber-950/20" },
  learning:    { label: "Aprendizado",  Icon: BookOpen,      cls: "text-purple-300",  border: "border-purple-900/60 bg-purple-950/20" },
};

interface MariInsight {
  id: string;
  insight_type: string;
  priority: number;
  message: string;
  suggested_action: string | null;
  action_payload: any;
  mandate_id: string | null;
}

export function MariInsightsSection() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { openDeal } = useDealDrawer();

  const { data: insights = [], isLoading } = useQuery({
    queryKey: ["mari-insights-active", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mari_insights" as any)
        .select("id, insight_type, priority, message, suggested_action, action_payload, mandate_id")
        .eq("status", "active")
        .order("priority", { ascending: false })
        .limit(7);
      if (error) throw error;
      return (data ?? []) as unknown as MariInsight[];
    },
  });

  const dismiss = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("mari_insights" as any)
        .update({ status: "dismissed", dismissed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mari-insights-active"] });
    },
  });

  const handleAction = (i: MariInsight) => {
    const p = i.action_payload || {};
    if (p.type === "open_deal" && p.mandate_id) {
      openDeal(p.mandate_id);
    } else if (p.type === "open_url" && p.url) {
      window.open(p.url, "_blank");
    } else if (i.mandate_id) {
      openDeal(i.mandate_id);
    } else {
      toast.info("Sem ação direta para este insight");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-zinc-500 text-xs py-3">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Mari pensando…
      </div>
    );
  }
  if (insights.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-[#D9F564]" />
        <h2 className="text-sm font-semibold text-zinc-200">Insights da Mari</h2>
        <span className="text-[11px] text-zinc-500">{insights.length} ativos</span>
      </div>
      <div className="space-y-2">
        {insights.map((i) => {
          const meta = TYPE_META[i.insight_type] || TYPE_META.learning;
          const Icon = meta.Icon;
          return (
            <div key={i.id} className={cn("rounded-lg border p-3 flex items-start gap-3", meta.border)}>
              <div className={cn("shrink-0 h-7 w-7 rounded-md flex items-center justify-center bg-zinc-950/60", meta.cls)}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge variant="outline" className={cn("text-[10px] uppercase tracking-wider bg-transparent", meta.cls, meta.border)}>
                    {meta.label}
                  </Badge>
                  <span className="text-[10px] text-zinc-500">P{i.priority}</span>
                </div>
                <div className="text-sm text-zinc-100 break-words">{i.message}</div>
                {i.suggested_action && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 h-7 text-[11px] bg-transparent border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                    onClick={() => handleAction(i)}
                  >
                    {i.suggested_action}
                  </Button>
                )}
              </div>
              <button
                onClick={() => dismiss.mutate(i.id)}
                title="Dispensar"
                className="text-zinc-500 hover:text-zinc-200 p-1"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
