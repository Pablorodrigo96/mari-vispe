import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format, isToday, isFuture, isValid, parseISO, addDays, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Flame,
  Save,
  PhoneCall,
  Mail,
  MessageCircle,
  Briefcase,
  FileText,
  Eye,
  Pencil,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { dateKey, useDailyNote, useUpsertDailyNote, useDailyFeed, useDailyStreak } from "@/hooks/useDailyNote";
import { useEffectiveRoles } from "@/hooks/useEffectiveRoles";
import { NoteRenderer } from "@/components/equity-brain/notes/NoteRenderer";
import { MentionAutocomplete, useMentionTrigger } from "@/components/equity-brain/notes/MentionAutocomplete";
import { buildMentionToken } from "@/lib/eb/mentionParser";
import { TemplatePicker } from "@/components/equity-brain/notes/TemplatePicker";
import MariInsightCard from "@/components/equity-brain/diary/MariInsightCard";
import { PageHeaderHint } from "@/components/ui/PageHeaderHint";

function activityIcon(kind: string) {
  switch ((kind || "").toLowerCase()) {
    case "call":
      return <PhoneCall className="h-3.5 w-3.5" />;
    case "email":
      return <Mail className="h-3.5 w-3.5" />;
    case "whatsapp":
    case "message":
      return <MessageCircle className="h-3.5 w-3.5" />;
    default:
      return <FileText className="h-3.5 w-3.5" />;
  }
}

function entityHref(entityType?: string | null, entityId?: string | null) {
  if (!entityType || !entityId) return null;
  if (entityType === "mandate") return `/equity-brain/mandato/${entityId}`;
  if (entityType === "buyer_ma" || entityType === "buyer") return `/equity-brain/buyer/${entityId}`;
  if (entityType === "company") return `/equity-brain/empresa/${entityId}`;
  return null;
}

export default function DailyDiaryPage() {
  const params = useParams<{ date?: string }>();
  const navigate = useNavigate();
  const { isAdvisor, isAdmin } = useEffectiveRoles();
  const canWrite = isAdvisor || isAdmin;

  const today = useMemo(() => new Date(), []);
  const initialDate = useMemo(() => {
    if (!params.date) return today;
    const parsed = parseISO(params.date);
    if (!isValid(parsed) || isFuture(parsed)) return today;
    return parsed;
  }, [params.date, today]);

  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  const dateStr = dateKey(selectedDate);

  // Keep URL in sync with selectedDate
  useEffect(() => {
    const next = isToday(selectedDate) ? "/equity-brain/diario" : `/equity-brain/diario/${dateStr}`;
    if (window.location.pathname !== next) {
      navigate(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateStr]);

  const { data: note, isLoading } = useDailyNote(dateStr);
  const upsertMut = useUpsertDailyNote(dateStr);
  const { data: feed, isLoading: feedLoading } = useDailyFeed(dateStr);
  const { data: streak = 0 } = useDailyStreak();

  const [body, setBody] = useState<string>("");
  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [caret, setCaret] = useState(0);
  const [mode, setMode] = useState<"edit" | "view">("edit");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const trigger = useMentionTrigger(body, caret);
  const lastLoadedFor = useRef<string>("");

  // Load note body into local state when date or remote data changes
  useEffect(() => {
    if (isLoading) return;
    const incoming = note?.body_md ?? "";
    if (lastLoadedFor.current !== dateStr) {
      setBody(incoming);
      setDirty(false);
      setLastSavedAt(note?.updated_at ? new Date(note.updated_at).getTime() : null);
      lastLoadedFor.current = dateStr;
    }
  }, [isLoading, note, dateStr]);

  // Autosave (debounce 2s)
  useEffect(() => {
    if (!dirty || !canWrite) return;
    const t = setTimeout(() => {
      upsertMut.mutate(
        { body_md: body },
        {
          onSuccess: () => {
            setLastSavedAt(Date.now());
            setDirty(false);
          },
        },
      );
    }, 2000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body, dirty, canWrite]);

  function insertMention(type: "mandate" | "buyer" | "company", ref: string, label?: string | null) {
    if (!trigger) return;
    const token = buildMentionToken(type, ref, label);
    const before = body.slice(0, trigger.start);
    const after = body.slice(caret);
    const next = `${before}${token} ${after}`;
    setBody(next);
    setDirty(true);
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

  const canGoNext = !isToday(selectedDate);
  const isViewingToday = isToday(selectedDate);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-zinc-950 text-zinc-100 p-4 md:p-6">
      {/* Header */}
      <h1 className="text-xl font-bold text-zinc-100 inline-flex items-center mb-3">
        Diário<PageHeaderHint pageKey="eb.diario" />
      </h1>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex items-center gap-2 bg-zinc-900/60 border border-zinc-800 rounded-lg p-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-zinc-400 hover:text-zinc-100"
            onClick={() => setSelectedDate((d) => subDays(d, 1))}
            aria-label="Dia anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className="h-7 px-2 text-xs text-zinc-200 hover:bg-zinc-800 gap-2"
              >
                <CalendarDays className="h-3.5 w-3.5 text-[#D9F564]" />
                <span className="capitalize">
                  {format(selectedDate, "EEEE, dd 'de' MMMM yyyy", { locale: ptBR })}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-zinc-900 border-zinc-800" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && setSelectedDate(d)}
                disabled={(d) => d > new Date()}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-zinc-400 hover:text-zinc-100 disabled:opacity-30"
            onClick={() => canGoNext && setSelectedDate((d) => addDays(d, 1))}
            disabled={!canGoNext}
            aria-label="Próximo dia"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isViewingToday && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-[11px] text-[#D9F564] hover:bg-[#D9F564]/10"
              onClick={() => setSelectedDate(today)}
            >
              Hoje
            </Button>
          )}
        </div>

        {streak > 0 && (
          <Badge
            variant="outline"
            className="bg-transparent border-[#D9F564]/40 text-[#D9F564] text-[11px] gap-1"
          >
            <Flame className="h-3 w-3" /> {streak} {streak === 1 ? "dia" : "dias"} seguidos
          </Badge>
        )}

        <div className="ml-auto flex items-center gap-2 text-[11px] text-zinc-500">
          {upsertMut.isPending && <span>Salvando…</span>}
          {!upsertMut.isPending && dirty && <span className="text-amber-400">Não salvo</span>}
          {!upsertMut.isPending && !dirty && lastSavedAt && (
            <span>Salvo · {format(new Date(lastSavedAt), "HH:mm")}</span>
          )}
        </div>
      </div>

      {/* Body: 2-column grid (responsive) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        {/* Editor */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-3 min-h-[60vh]">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-zinc-500">
              {isViewingToday ? "Plano do dia" : "Diário"} · {format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}
            </div>
            <div className="flex items-center gap-2">
              {canWrite && (
                <TemplatePicker
                  scope="daily"
                  context={{ date: format(selectedDate, "dd/MM/yyyy", { locale: ptBR }) }}
                  onInsert={(md) => {
                    setBody((prev) => (prev.trim() ? `${prev}\n\n${md}` : md));
                    setDirty(true);
                  }}
                />
              )}
              <div className="flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900/60 p-0.5">
                <button
                  onClick={() => setMode("edit")}
                  className={cn(
                    "px-2 py-1 text-[10px] rounded transition-colors inline-flex items-center gap-1",
                    mode === "edit" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-100",
                  )}
                >
                  <Pencil className="h-3 w-3" /> Editar
                </button>
                <button
                  onClick={() => setMode("view")}
                  className={cn(
                    "px-2 py-1 text-[10px] rounded transition-colors inline-flex items-center gap-1",
                    mode === "view" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-100",
                  )}
                >
                  <Eye className="h-3 w-3" /> Visualizar
                </button>
              </div>
            </div>
          </div>

          {mode === "edit" ? (
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={body}
                placeholder="Comece o dia escrevendo o que importa…  Use @ para mencionar mandato, buyer ou empresa."
                onChange={(e) => {
                  setBody(e.target.value);
                  setDirty(true);
                  setCaret(e.target.selectionStart ?? 0);
                }}
                onKeyUp={(e) => setCaret((e.target as HTMLTextAreaElement).selectionStart ?? 0)}
                onClick={(e) => setCaret((e.target as HTMLTextAreaElement).selectionStart ?? 0)}
                disabled={!canWrite}
                rows={22}
                className="text-sm bg-zinc-950 border-zinc-800 text-zinc-100 font-mono min-h-[55vh] resize-y"
              />
              {trigger && (
                <MentionAutocomplete
                  query={trigger.query}
                  onPick={(s) => insertMention(s.type, s.ref, s.label)}
                  onClose={() => setCaret((c) => c)}
                />
              )}
              {canWrite && !body.trim() && (
                <div className="mt-2 text-[11px] text-zinc-500">
                  Dica: clique em <span className="text-zinc-300">Template</span> no topo para começar com uma estrutura.
                </div>
              )}
              {dirty && canWrite && (
                <div className="mt-2 flex justify-end">
                  <Button
                    size="sm"
                    onClick={() =>
                      upsertMut.mutate(
                        { body_md: body },
                        { onSuccess: () => { setLastSavedAt(Date.now()); setDirty(false); } },
                      )
                    }
                    disabled={upsertMut.isPending}
                    className="bg-[#D9F564] text-zinc-950 hover:bg-[#D9F564]/90 h-7 text-xs"
                  >
                    <Save className="h-3 w-3 mr-1" /> Salvar agora
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-zinc-950 border border-zinc-800 rounded p-4 min-h-[55vh]">
              {body.trim() ? (
                <NoteRenderer body={body} />
              ) : (
                <div className="text-xs text-zinc-500 italic">Nenhuma anotação para esse dia ainda.</div>
              )}
            </div>
          )}
        </div>

        {/* Feed column */}
        <div className="space-y-3">
          <MariInsightCard dateStr={dateStr} isToday={isViewingToday} />

          <FeedCard title="Atividades do dia" count={feed?.activities.length ?? 0} loading={feedLoading}>
            {!feedLoading && (feed?.activities ?? []).length === 0 && (
              <EmptyHint>
                Nenhuma atividade hoje. Abra o{" "}
                <a href="/equity-brain/hoje" className="text-[#D9F564] hover:underline">WhatsApp Bridge</a>{" "}
                para registrar uma.
              </EmptyHint>
            )}
            {(feed?.activities ?? []).map((a: any) => {
              const href = entityHref(a.entity_type, a.entity_id);
              const inner = (
                <div className="flex items-start gap-2 text-[11px] text-zinc-300 hover:bg-zinc-800/60 rounded px-2 py-2">
                  <span className="text-zinc-500 mt-0.5">{activityIcon(a.kind)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{a.kind ?? "Atividade"}</div>
                    {a.body && <div className="text-zinc-500 line-clamp-2 break-words">{a.body}</div>}
                  </div>
                  <span className="text-zinc-600 text-[10px] tabular-nums shrink-0">
                    {format(new Date(a.created_at), "HH:mm")}
                  </span>
                </div>
              );
              return href ? (
                <a key={a.id} href={href} className="block">
                  {inner}
                </a>
              ) : (
                <div key={a.id}>{inner}</div>
              );
            })}
          </FeedCard>

          <FeedCard title="Notas que criei hoje" count={feed?.notes.length ?? 0} loading={feedLoading}>
            {!feedLoading && (feed?.notes ?? []).length === 0 && (
              <EmptyHint>Você ainda não escreveu notas em outras entidades hoje.</EmptyHint>
            )}
            {(feed?.notes ?? []).map((n: any) => {
              const href = entityHref(n.entity_type, n.entity_id);
              const content = (
                <div className="px-2 py-2 text-[11px] hover:bg-zinc-800/60 rounded">
                  <div className="flex items-center gap-1 text-zinc-400">
                    <FileText className="h-3 w-3" />
                    <span className="uppercase tracking-wide text-[9px]">{n.entity_type}</span>
                  </div>
                  {n.title && <div className="text-zinc-200 font-medium truncate mt-0.5">{n.title}</div>}
                  <div className="text-zinc-500 line-clamp-2 break-words">{n.body_md}</div>
                </div>
              );
              return href ? (
                <a key={n.id} href={href}>{content}</a>
              ) : (
                <div key={n.id}>{content}</div>
              );
            })}
          </FeedCard>

          <FeedCard title="Deals que mexeram" count={feed?.deals.length ?? 0} loading={feedLoading}>
            {!feedLoading && (feed?.deals ?? []).length === 0 && (
              <EmptyHint>Nenhum deal movimentou hoje.</EmptyHint>
            )}
            {(feed?.deals ?? []).map((d: any) => (
              <a
                key={d.id}
                href={`/equity-brain/deal/${d.id}`}
                className="block px-2 py-2 text-[11px] hover:bg-zinc-800/60 rounded"
              >
                <div className="flex items-center gap-2">
                  <Briefcase className="h-3 w-3 text-zinc-500" />
                  <span className="font-medium text-zinc-200 truncate">{d.cnpj ?? d.id.slice(0, 8)}</span>
                  <span className="ml-auto text-[10px] text-zinc-500 tabular-nums">
                    {format(new Date(d.updated_at), "HH:mm")}
                  </span>
                </div>
                <div className="text-zinc-500 break-words">
                  Stage: <span className="text-zinc-300">{d.stage ?? "—"}</span>
                  {d.outcome && (
                    <>
                      {" · "}Outcome: <span className="text-zinc-300">{d.outcome}</span>
                    </>
                  )}
                </div>
              </a>
            ))}
          </FeedCard>

          <FeedCard title="Pendências IA" count={feed?.ai?.length ?? 0} loading={feedLoading}>
            {!feedLoading && (feed?.ai ?? []).length === 0 && (
              <EmptyHint>Nenhuma análise da Mari executada hoje.</EmptyHint>
            )}
            {(feed?.ai ?? []).map((r: any) => {
              const fn = (r.function_name ?? "").replace(/^claude-/, "");
              const isErr = r.status && r.status !== "success" && r.status !== "ok";
              const target = r.cnpj
                ? `/equity-brain/empresa/${r.cnpj}`
                : r.match_id
                ? `/equity-brain/match/${r.match_id}`
                : r.buyer_id
                ? `/equity-brain/buyer/${r.buyer_id}`
                : null;
              const inner = (
                <div className="px-2 py-2 text-[11px] hover:bg-zinc-800/60 rounded">
                  <div className="flex items-center gap-1.5">
                    {isErr ? (
                      <AlertTriangle className="h-3 w-3 text-amber-400" />
                    ) : (
                      <Sparkles className="h-3 w-3 text-[#D9F564]" />
                    )}
                    <span className="font-medium text-zinc-200 truncate">{fn || "ai-run"}</span>
                    <span className="ml-auto text-[10px] text-zinc-500 tabular-nums">
                      {format(new Date(r.created_at), "HH:mm")}
                    </span>
                  </div>
                  <div className="text-zinc-500 truncate">
                    {r.cnpj ? `CNPJ ${r.cnpj}` : r.match_id ? `Match ${r.match_id.slice(0, 8)}` : r.buyer_id ? `Buyer ${r.buyer_id.slice(0, 8)}` : "—"}
                    {isErr && r.error_message && <span className="text-amber-400"> · {r.error_message.slice(0, 60)}</span>}
                  </div>
                </div>
              );
              return target ? (
                <a key={r.id} href={target}>{inner}</a>
              ) : (
                <div key={r.id}>{inner}</div>
              );
            })}
          </FeedCard>
        </div>
      </div>
    </div>
  );
}

function FeedCard({
  title,
  count,
  loading,
  children,
}: {
  title: string;
  count: number;
  loading?: boolean;
  children: React.ReactNode;
}) {
  const hasItems = count > 0;
  return (
    <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg">
      <div className="px-3 py-2 border-b border-zinc-800 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wide">{title}</span>
        {loading ? (
          <span className="h-4 w-6 rounded bg-zinc-800/60 animate-pulse" />
        ) : (
          <span
            className={
              hasItems
                ? "text-[10px] tabular-nums px-1.5 py-0.5 rounded bg-[#D9F564]/15 text-[#D9F564] border border-[#D9F564]/30"
                : "text-[10px] text-zinc-600 tabular-nums px-1.5"
            }
          >
            {count}
          </span>
        )}
      </div>
      <div className="p-1.5 space-y-0.5 max-h-[28vh] overflow-y-auto">
        {loading ? (
          <div className="space-y-1.5 p-1.5">
            <div className="h-3 bg-zinc-800/60 rounded animate-pulse" />
            <div className="h-3 bg-zinc-800/60 rounded animate-pulse w-2/3" />
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] text-zinc-600 italic px-2 py-3">{children}</div>;
}

