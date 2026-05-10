import { useMemo, useRef, useState } from "react";
import { Pin, PinOff, Trash2, Pencil, Plus, Save, X, Search, Globe, Lock, Tag, Link2 } from "lucide-react";
import {
  useEntityNotes,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
  type EntityNote,
  type NoteEntityType,
  type NoteVisibility,
} from "@/hooks/useEntityNotes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useEffectiveRoles } from "@/hooks/useEffectiveRoles";
import { NoteRenderer } from "./NoteRenderer";
import { MentionAutocomplete, useMentionTrigger } from "./MentionAutocomplete";
import { EntityBacklinksPanel } from "./EntityBacklinksPanel";
import { buildMentionToken } from "@/lib/eb/mentionParser";

interface Props {
  entityType: NoteEntityType;
  entityId: string;
  /** Para empresa não faz sentido visibility=public; passe ["internal"] aqui. Default: ["internal","public"]. */
  allowedVisibilities?: NoteVisibility[];
}

function VisibilityBadge({ v }: { v: NoteVisibility }) {
  if (v === "public") {
    return (
      <Badge variant="outline" className="bg-transparent border-sky-700/50 text-sky-300 text-[10px] gap-1">
        <Globe className="h-2.5 w-2.5" /> Pública
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-transparent border-zinc-700 text-zinc-400 text-[10px] gap-1">
      <Lock className="h-2.5 w-2.5" /> Interna
    </Badge>
  );
}

export function EntityNotes({ entityType, entityId, allowedVisibilities = ["internal", "public"] }: Props) {
  const { user } = useAuth();
  const { isAdvisor, isAdmin } = useEffectiveRoles();
  const canWrite = isAdvisor || isAdmin;

  const { data: notes = [], isLoading } = useEntityNotes(entityType, entityId);
  const createMut = useCreateNote(entityType, entityId);
  const updateMut = useUpdateNote(entityType, entityId);
  const deleteMut = useDeleteNote(entityType, entityId);

  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ title: string; body_md: string; visibility: NoteVisibility; tags: string }>({
    title: "",
    body_md: "",
    visibility: "internal",
    tags: "",
  });
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"notes" | "backlinks">("notes");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [caret, setCaret] = useState(0);
  const trigger = useMentionTrigger(draft.body_md, caret);

  function insertMention(type: "mandate" | "buyer" | "company", ref: string, label?: string | null) {
    if (!trigger) return;
    const token = buildMentionToken(type, ref, label);
    const before = draft.body_md.slice(0, trigger.start);
    const after = draft.body_md.slice(caret);
    const next = `${before}${token} ${after}`;
    setDraft({ ...draft, body_md: next });
    const newCaret = (before + token + " ").length;
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(newCaret, newCaret);
        setCaret(newCaret);
      }
    });
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (n) =>
        (n.title ?? "").toLowerCase().includes(q) ||
        n.body_md.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [notes, search]);

  function resetDraft() {
    setDraft({ title: "", body_md: "", visibility: "internal", tags: "" });
    setEditingId(null);
    setShowEditor(false);
  }

  function startEdit(n: EntityNote) {
    setEditingId(n.id);
    setDraft({
      title: n.title ?? "",
      body_md: n.body_md,
      visibility: n.visibility,
      tags: n.tags.join(", "),
    });
    setShowEditor(true);
  }

  async function handleSave() {
    const tags = draft.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (!draft.body_md.trim()) return;
    if (editingId) {
      await updateMut.mutateAsync({
        id: editingId,
        title: draft.title || null,
        body_md: draft.body_md,
        visibility: draft.visibility,
        tags,
      });
    } else {
      await createMut.mutateAsync({
        title: draft.title || undefined,
        body_md: draft.body_md,
        visibility: draft.visibility,
        tags,
      });
    }
    resetDraft();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900/40 p-0.5">
          <button
            onClick={() => setView("notes")}
            className={cn(
              "px-2.5 py-1 text-[11px] rounded transition-colors",
              view === "notes" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-100",
            )}
          >
            Notas <span className="text-zinc-500">{notes.length}</span>
          </button>
          <button
            onClick={() => setView("backlinks")}
            className={cn(
              "px-2.5 py-1 text-[11px] rounded transition-colors inline-flex items-center gap-1",
              view === "backlinks" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-100",
            )}
          >
            <Link2 className="h-3 w-3" /> Mencionada em
          </button>
        </div>
        {view === "notes" && (
          <div className="flex items-center gap-2 flex-1 max-w-xs">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-500" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar título, conteúdo, tag…"
                className="pl-7 h-8 text-xs bg-zinc-900/60 border-zinc-800 text-zinc-200 placeholder:text-zinc-500"
              />
            </div>
            {canWrite && !showEditor && (
              <Button
                size="sm"
                className="bg-[#D9F564] text-zinc-950 hover:bg-[#D9F564]/90 h-8 text-xs"
                onClick={() => {
                  resetDraft();
                  setShowEditor(true);
                }}
              >
                <Plus className="h-3 w-3 mr-1" /> Nova
              </Button>
            )}
          </div>
        )}
      </div>

      {view === "backlinks" && (
        <EntityBacklinksPanel entityType={entityType} entityId={entityId} />
      )}

      {view === "notes" && (
        <>
        {/* editor + list */}

      {showEditor && canWrite && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3 space-y-2">
          <Input
            placeholder="Título (opcional)"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            className="h-8 text-xs bg-zinc-950 border-zinc-800 text-zinc-100"
          />
          <div className="relative">
            <Textarea
              ref={textareaRef}
              placeholder="Escreva em Markdown. Use @ para mencionar mandato, buyer ou empresa…"
              value={draft.body_md}
              onChange={(e) => {
                setDraft({ ...draft, body_md: e.target.value });
                setCaret(e.target.selectionStart ?? 0);
              }}
              onKeyUp={(e) => setCaret((e.target as HTMLTextAreaElement).selectionStart ?? 0)}
              onClick={(e) => setCaret((e.target as HTMLTextAreaElement).selectionStart ?? 0)}
              rows={6}
              className="text-xs bg-zinc-950 border-zinc-800 text-zinc-100 font-mono"
            />
            {trigger && (
              <MentionAutocomplete
                query={trigger.query}
                onPick={(s) => insertMention(s.type, s.ref, s.label)}
                onClose={() => setCaret((c) => c)}
              />
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Input
              placeholder="tags (separe por vírgula)"
              value={draft.tags}
              onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
              className="h-8 text-xs bg-zinc-950 border-zinc-800 text-zinc-100 flex-1 min-w-[160px]"
            />
            <select
              value={draft.visibility}
              onChange={(e) => setDraft({ ...draft, visibility: e.target.value as NoteVisibility })}
              className="h-8 text-xs bg-zinc-950 border border-zinc-800 text-zinc-100 rounded px-2"
            >
              {allowedVisibilities.includes("internal") && <option value="internal">Interna</option>}
              {allowedVisibilities.includes("public") && <option value="public">Pública</option>}
            </select>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={resetDraft} className="h-7 text-xs bg-transparent border-zinc-700 text-zinc-300">
              <X className="h-3 w-3 mr-1" /> Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!draft.body_md.trim() || createMut.isPending || updateMut.isPending}
              className="bg-[#D9F564] text-zinc-950 hover:bg-[#D9F564]/90 h-7 text-xs"
            >
              <Save className="h-3 w-3 mr-1" /> {editingId ? "Salvar" : "Criar"}
            </Button>
          </div>
        </div>
      )}

      {isLoading && <div className="text-xs text-zinc-500">Carregando…</div>}
      {!isLoading && filtered.length === 0 && (
        <div className="text-xs text-zinc-500 italic px-2 py-6 text-center bg-zinc-900/30 border border-dashed border-zinc-800 rounded">
          {notes.length === 0 ? "Nenhuma nota ainda." : "Nenhuma nota corresponde à busca."}
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((n) => {
          const isAuthor = user?.id === n.author_id;
          const canEdit = isAuthor || isAdmin;
          return (
            <div
              key={n.id}
              className={cn(
                "bg-zinc-900/40 border rounded p-3 space-y-2",
                n.pinned ? "border-[#D9F564]/40" : "border-zinc-800",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  {n.title && <div className="text-sm font-semibold text-zinc-100 break-words">{n.title}</div>}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <VisibilityBadge v={n.visibility} />
                    {n.pinned && (
                      <Badge variant="outline" className="bg-transparent border-[#D9F564]/40 text-[#D9F564] text-[10px] gap-1">
                        <Pin className="h-2.5 w-2.5" /> Fixada
                      </Badge>
                    )}
                    {n.tags.map((t) => (
                      <Badge key={t} variant="outline" className="bg-transparent border-zinc-700 text-zinc-400 text-[10px] gap-1">
                        <Tag className="h-2.5 w-2.5" /> {t}
                      </Badge>
                    ))}
                    <span className="text-[10px] text-zinc-500">
                      {new Date(n.updated_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </div>
                {canEdit && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() =>
                        updateMut.mutate({ id: n.id, pinned: !n.pinned })
                      }
                      title={n.pinned ? "Desafixar" : "Fixar"}
                      className="p-1 text-zinc-400 hover:text-[#D9F564] transition-colors"
                    >
                      {n.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={() => startEdit(n)}
                      title="Editar"
                      className="p-1 text-zinc-400 hover:text-zinc-100 transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Remover esta nota?")) deleteMut.mutate(n.id);
                      }}
                      title="Remover"
                      className="p-1 text-zinc-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <NoteRenderer body={n.body_md} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
