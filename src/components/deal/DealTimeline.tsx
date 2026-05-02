import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  MessageCircle, Phone, Mail, GitBranch, CheckSquare, FileText,
  Sparkles, Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TimelineRow {
  ts: string;
  source: string;
  kind: string;
  title: string;
  body: string | null;
  actor_name: string | null;
  metadata: any;
  color: string;
}

const SOURCE_ICON: Record<string, any> = {
  crm_activity: FileText,
  whatsapp: MessageCircle,
  pipeline: GitBranch,
  subtask: CheckSquare,
  deal_event: Sparkles,
};
const KIND_ICON: Record<string, any> = {
  call: Phone,
  email: Mail,
  whatsapp: MessageCircle,
};
const COLOR_CLS: Record<string, string> = {
  blue: "text-blue-400 bg-blue-500/10",
  green: "text-emerald-400 bg-emerald-500/10",
  emerald: "text-emerald-400 bg-emerald-500/10",
  amber: "text-amber-400 bg-amber-500/10",
  purple: "text-purple-400 bg-purple-500/10",
  rose: "text-rose-400 bg-rose-500/10",
  sky: "text-sky-400 bg-sky-500/10",
  zinc: "text-zinc-400 bg-zinc-500/10",
};

export function DealTimeline({ mandateId }: { mandateId: string }) {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["deal-timeline", mandateId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_deal_timeline" as any, { p_mandate_id: mandateId });
      if (error) throw error;
      return (data ?? []) as TimelineRow[];
    },
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm gap-2 py-10">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando timeline…
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500 text-xs py-10">
        Nenhuma interação registrada ainda.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
      {events.map((ev, i) => {
        const Icon = KIND_ICON[ev.kind] || SOURCE_ICON[ev.source] || FileText;
        const cls = COLOR_CLS[ev.color] || COLOR_CLS.zinc;
        return (
          <div key={i} className="flex gap-3 group">
            <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${cls}`}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1 pb-3 border-b border-zinc-900 last:border-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-medium text-zinc-200 break-words">{ev.title}</span>
                <span className="text-[10px] text-zinc-500 shrink-0">
                  {formatDistanceToNow(new Date(ev.ts), { locale: ptBR, addSuffix: true })}
                </span>
              </div>
              {ev.body && (
                <div className="text-[11px] text-zinc-400 mt-1 break-words whitespace-pre-wrap line-clamp-3">
                  {ev.body}
                </div>
              )}
              {ev.actor_name && (
                <div className="text-[10px] text-zinc-600 mt-1">por {ev.actor_name}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
