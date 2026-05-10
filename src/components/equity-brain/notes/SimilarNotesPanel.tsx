import { Sparkles, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { useNotesSimilar } from "@/hooks/useNotesSimilar";
import { TagChip } from "./TagChip";

interface Props {
  noteId: string;
  /** Limite (default 5) */
  limit?: number;
}

function entityRoute(entityType: string, entityId: string): string | null {
  if (entityType === "mandate") return `/equity-brain/mandato/${entityId}`;
  if (entityType === "buyer_ma") return `/equity-brain/buyer/${entityId}`;
  if (entityType === "company") return `/equity-brain/empresa/${entityId}`;
  if (entityType === "daily") return `/equity-brain/diario/${entityId}`;
  return null;
}

function entityLabel(entityType: string): string {
  if (entityType === "mandate") return "Mandato";
  if (entityType === "buyer_ma") return "Buyer";
  if (entityType === "company") return "Empresa";
  if (entityType === "daily") return "Diário";
  return entityType;
}

export function SimilarNotesPanel({ noteId, limit = 5 }: Props) {
  const { data, isLoading } = useNotesSimilar(noteId, { limit });

  if (isLoading) {
    return (
      <div className="mt-3 bg-zinc-950/40 border border-zinc-800 rounded p-3">
        <div className="flex items-center gap-2 text-[11px] text-zinc-500">
          <Sparkles className="h-3 w-3 animate-pulse" /> Buscando notas similares…
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) return null;

  return (
    <div className="mt-3 bg-zinc-950/40 border border-zinc-800 rounded p-3 space-y-2">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-zinc-400">
        <Sparkles className="h-3 w-3 text-[#D9F564]" />
        <span>Notas similares</span>
        <span className="text-zinc-600">·</span>
        <span className="text-zinc-500 normal-case tracking-normal">{data.length}</span>
      </div>
      <div className="space-y-2">
        {data.map((n) => {
          const route = entityRoute(n.entity_type, n.entity_id);
          const preview = (n.body_md || "").replace(/[#*_`>]/g, "").slice(0, 180);
          const pct = Math.round(n.similarity * 100);
          return (
            <div
              key={n.id}
              className="bg-zinc-900/40 border border-zinc-800 rounded p-2 space-y-1 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-3 w-3 text-zinc-500 shrink-0" />
                  {route ? (
                    <Link to={route} className="text-xs font-medium text-zinc-100 hover:text-[#D9F564] truncate break-words">
                      {n.title || `Nota em ${entityLabel(n.entity_type)}`}
                    </Link>
                  ) : (
                    <span className="text-xs font-medium text-zinc-100 truncate break-words">
                      {n.title || `Nota em ${entityLabel(n.entity_type)}`}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-mono text-[#D9F564] shrink-0">{pct}%</span>
              </div>
              <div className="text-[11px] text-zinc-500 break-words line-clamp-2">{preview}</div>
              {n.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {n.tags.slice(0, 4).map((t) => (
                    <TagChip key={t} tag={t} size="xs" />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
