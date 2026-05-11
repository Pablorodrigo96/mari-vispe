import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, Users, Building2, Pin, Target, FileText, CalendarDays } from "lucide-react";
import type { NoteEntityType } from "@/hooks/useEntityNotes";

interface Props {
  entityType: NoteEntityType;
  entityId: string;
}

const SOURCE_META: Record<string, { Icon: any; color: string; route: (id: string) => string; label: string }> = {
  mandate: { Icon: Briefcase, color: "text-emerald-300", route: (id) => `/equity-brain/mandato/${id}`, label: "Mandato" },
  buyer_ma: { Icon: Users, color: "text-violet-300", route: (id) => `/equity-brain/buyer/${id}`, label: "Buyer" },
  company: { Icon: Building2, color: "text-amber-300", route: (id) => `/equity-brain/empresa/${id}`, label: "Empresa" },
};

export function EntityBacklinksPanel({ entityType, entityId }: Props) {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["eb-entity-backlinks", entityType, entityId],
    enabled: !!entityType && !!entityId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eb_entity_note_mentions" as any)
        .select("*")
        .eq("target_entity_type", entityType)
        .eq("target_entity_id", entityId)
        .order("note_updated_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  if (isLoading) {
    return <div className="text-xs text-zinc-500 px-2 py-6 text-center">Carregando backlinks…</div>;
  }

  if (!items.length) {
    return (
      <div className="text-xs text-zinc-500 italic px-2 py-6 text-center bg-zinc-900/30 border border-dashed border-zinc-800 rounded">
        Esta entidade ainda não foi mencionada em nenhuma nota.
        <div className="text-[10px] text-zinc-600 mt-1">
          Em qualquer nota, digite <span className="font-mono text-zinc-400">@</span> seguido do nome para criar uma menção.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">
        Mencionada em {items.length} {items.length === 1 ? "nota" : "notas"}
      </div>
      {items.map((m) => {
        const meta = SOURCE_META[m.source_entity_type] ?? SOURCE_META.company;
        const Icon = meta.Icon;
        const preview = (m.body_preview ?? "").replace(/@(mandate|buyer|company):[A-Za-z0-9-]+(?:\|[^\s]+)?/g, "@$1").slice(0, 180);
        return (
          <Link
            key={m.id}
            to={meta.route(m.source_entity_id)}
            className="block rounded border border-zinc-800 hover:border-zinc-600 bg-zinc-900/40 p-3 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
              <span className={`text-[10px] uppercase ${meta.color}`}>{meta.label}</span>
              {m.title && (
                <span className="text-xs font-semibold text-zinc-100 truncate">{m.title}</span>
              )}
              {m.pinned && <Pin className="h-3 w-3 text-[#D9F564]" />}
              <span className="ml-auto text-[10px] text-zinc-500">
                {new Date(m.note_updated_at).toLocaleDateString("pt-BR")}
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 break-words line-clamp-2">{preview}</div>
          </Link>
        );
      })}
    </div>
  );
}
