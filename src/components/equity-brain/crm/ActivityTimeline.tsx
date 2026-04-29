import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useActivities } from "@/hooks/useCrm";
import { MessageCircle, Phone, Mail, Calendar, FileText, RefreshCw, Settings, Activity } from "lucide-react";
import { relativeTime } from "@/lib/equityBrain";

const ICONS: Record<string, any> = {
  whatsapp: MessageCircle, call: Phone, email: Mail, meeting: Calendar,
  note: FileText, status_change: RefreshCw, preference_change: Settings, match_event: Activity,
};
const COLORS: Record<string, string> = {
  whatsapp: "text-emerald-400", call: "text-blue-400", email: "text-purple-400",
  meeting: "text-amber-400", note: "text-zinc-400", status_change: "text-orange-400",
  preference_change: "text-cyan-400", match_event: "text-violet-400",
};

export function ActivityTimeline({ entityType, entityId }:
  { entityType: "mandate" | "buyer"; entityId: string }) {
  const { data: activities = [], isLoading } = useActivities(entityType, entityId);
  const qc = useQueryClient();

  // Realtime subscribe
  useEffect(() => {
    const ch = supabase.channel(`crm-act-${entityId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "equity_brain", table: "crm_activities" },
        (payload: any) => {
          if (payload.new?.entity_id === entityId) {
            qc.invalidateQueries({ queryKey: ["crm", "activities", entityType, entityId] });
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [entityId, entityType, qc]);

  if (isLoading) return <div className="text-xs text-zinc-500 p-4">Carregando timeline...</div>;
  if (activities.length === 0) return <div className="text-xs text-zinc-500 p-4">Nenhuma atividade ainda.</div>;

  return (
    <div className="space-y-2">
      {activities.map((a: any) => {
        const Icon = ICONS[a.kind] ?? Activity;
        const color = COLORS[a.kind] ?? "text-zinc-400";
        return (
          <div key={a.id} className="flex gap-3 p-3 bg-zinc-900/40 border border-zinc-800 rounded">
            <div className={`shrink-0 ${color}`}><Icon className="h-4 w-4 mt-0.5" /></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-[10px] uppercase text-zinc-500">
                <span>{a.kind.replace("_", " ")}</span>
                <span>·</span>
                <span>{a.direction}</span>
                <span>·</span>
                <span>{relativeTime(a.created_at)}</span>
              </div>
              <div className="text-xs text-zinc-200 mt-1 break-words">{a.body}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
