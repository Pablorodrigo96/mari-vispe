import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search as SearchIcon, FileText, Sparkles, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNoteSearch, type NoteSearchFilters } from "@/hooks/useNoteSearch";
import { TagChip } from "@/components/equity-brain/notes/TagChip";

const ENTITY_OPTIONS: { value: NoteSearchFilters["entityType"]; label: string }[] = [
  { value: null, label: "Todos" },
  { value: "mandate", label: "Mandatos" },
  { value: "buyer_ma", label: "Buyers" },
  { value: "company", label: "Empresas" },
  { value: "daily", label: "Diário" },
];

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

function highlight(text: string, terms: string[]): string {
  return text;
}

function HighlightedText({ text, terms }: { text: string; terms: string[] }) {
  if (!terms.length) return <>{text}</>;
  const safe = terms
    .filter((t) => t.length >= 2)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  if (!safe) return <>{text}</>;
  const parts = text.split(new RegExp(`(${safe})`, "gi"));
  return (
    <>
      {parts.map((p, i) =>
        new RegExp(`^(${safe})$`, "i").test(p) ? (
          <mark key={i} className="bg-[#D9F564]/30 text-[#D9F564] rounded px-0.5">
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export default function NoteSearchPage() {
  const [inputValue, setInputValue] = useState("");
  const [query, setQuery] = useState("");
  const [entityType, setEntityType] = useState<NoteSearchFilters["entityType"]>(null);

  // Debounce 400ms
  useEffect(() => {
    const id = window.setTimeout(() => setQuery(inputValue.trim()), 400);
    return () => window.clearTimeout(id);
  }, [inputValue]);

  const { data: results = [], isLoading, isError } = useNoteSearch(query, { entityType }, { limit: 30 });

  const terms = useMemo(
    () => query.split(/\s+/).filter((t) => t.length >= 2),
    [query],
  );

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-zinc-100 flex items-center gap-2">
          <SearchIcon className="h-5 w-5 text-[#D9F564]" />
          Buscar notas
        </h1>
        <p className="text-sm text-zinc-500">
          Busca lexical + semântica nas notas do Núcleo de Conhecimento.
        </p>
      </div>

      <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3 space-y-3">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Ex: aumento de capital fintech, IOI fechada, tese de consolidação…"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="pl-9 bg-zinc-950 border-zinc-800 text-zinc-100"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
            <Filter className="h-3 w-3" />
            <span>Entidade:</span>
          </div>
          {ENTITY_OPTIONS.map((opt) => {
            const active = entityType === opt.value;
            return (
              <button
                key={opt.label}
                onClick={() => setEntityType(opt.value)}
                className={
                  "text-[11px] px-2 py-0.5 rounded border transition-colors " +
                  (active
                    ? "bg-[#D9F564]/15 border-[#D9F564]/50 text-[#D9F564]"
                    : "bg-transparent border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700")
                }
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {query.length < 2 && (
        <div className="text-xs text-zinc-500 italic px-2 py-8 text-center bg-zinc-900/30 border border-dashed border-zinc-800 rounded">
          Digite pelo menos 2 caracteres para buscar.
        </div>
      )}

      {query.length >= 2 && isLoading && (
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Sparkles className="h-3 w-3 animate-pulse" /> Buscando…
        </div>
      )}

      {query.length >= 2 && isError && (
        <div className="text-xs text-red-400 bg-red-950/30 border border-red-900/50 rounded p-3">
          Falha ao buscar. Tente novamente.
        </div>
      )}

      {query.length >= 2 && !isLoading && !isError && results.length === 0 && (
        <div className="text-xs text-zinc-500 italic px-2 py-8 text-center bg-zinc-900/30 border border-dashed border-zinc-800 rounded">
          Nenhuma nota encontrada. Notas ainda sem embedding aparecerão após indexação automática.
        </div>
      )}

      <div className="space-y-2">
        {results.map((n) => {
          const route = entityRoute(n.entity_type, n.entity_id);
          const preview = (n.body_md || "").replace(/[#*_`>]/g, "").slice(0, 280);
          const semanticPct = Math.round(n.semantic * 100);
          const scorePct = Math.round(n.score * 100);
          return (
            <div
              key={n.id}
              className="bg-zinc-900/40 border border-zinc-800 rounded p-3 space-y-2 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                  {route ? (
                    <Link to={route} className="text-sm font-medium text-zinc-100 hover:text-[#D9F564] truncate break-words">
                      <HighlightedText text={n.title || `Nota em ${entityLabel(n.entity_type)}`} terms={terms} />
                    </Link>
                  ) : (
                    <span className="text-sm font-medium text-zinc-100 truncate break-words">
                      {n.title || `Nota em ${entityLabel(n.entity_type)}`}
                    </span>
                  )}
                  <span className="text-[10px] uppercase tracking-wide text-zinc-500 shrink-0">
                    {entityLabel(n.entity_type)}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 text-[10px] font-mono">
                  <span className="text-zinc-500">sem {semanticPct}%</span>
                  <span className="text-[#D9F564]">score {scorePct}%</span>
                </div>
              </div>
              <div className="text-xs text-zinc-400 break-words line-clamp-3">
                <HighlightedText text={preview} terms={terms} />
              </div>
              {n.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {n.tags.slice(0, 6).map((t) => (
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
