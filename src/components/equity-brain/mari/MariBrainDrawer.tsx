import { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Send, Plus, Trash2, StopCircle, MessageSquare, Brain } from "lucide-react";
import { useMariBrain } from "@/hooks/useMariBrain";
import { getMariSuggestions } from "@/hooks/useMariContextSuggestions";
import { MariMessageBubble } from "./MariMessageBubble";
import { cn } from "@/lib/utils";

export function MariBrainDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const location = useLocation();
  const params = useParams();
  const [input, setInput] = useState("");
  const [showThreads, setShowThreads] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const {
    threads, activeThreadId, messages, streaming,
    loadThread, newThread, deleteThread, send, stop,
  } = useMariBrain();

  // Detect entity context from route
  const entityCtx = (() => {
    if (location.pathname.includes("/crm/mandate/") && params.id) {
      return { entity_type: "mandate", entity_id: params.id };
    }
    if (location.pathname.includes("/crm/buyer/") && params.id) {
      return { entity_type: "buyer", entity_id: params.id };
    }
    return {};
  })();

  const suggestions = getMariSuggestions(location.pathname);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, streaming]);

  const handleSend = (text?: string) => {
    const t = (text ?? input).trim();
    if (!t || streaming) return;
    setInput("");
    send(t, { route: location.pathname, ...entityCtx });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[520px] p-0 bg-zinc-950 border-l border-zinc-800 text-zinc-100 flex flex-col"
      >
        <SheetHeader className="px-4 py-3 border-b border-zinc-800">
          <div className="flex items-center justify-between gap-2">
            <SheetTitle className="text-zinc-100 flex items-center gap-2 text-base">
              <span className="w-7 h-7 rounded-lg bg-[#D9F564] text-[#0A0A0A] flex items-center justify-center">
                <Brain className="w-4 h-4" />
              </span>
              Mari Brain
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-medium">
                IA M&A
              </span>
            </SheetTitle>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" className="h-8 px-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800" onClick={() => setShowThreads(s => !s)}>
                <MessageSquare className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" className="h-8 px-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800" onClick={newThread}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <p className="text-xs text-zinc-500 text-left">Especialista em M&A + plataforma. Pergunte qualquer coisa.</p>
        </SheetHeader>

        {/* Threads sidebar */}
        {showThreads && (
          <div className="border-b border-zinc-800 max-h-[200px] overflow-y-auto p-2 space-y-1 bg-zinc-900/40">
            <div className="text-[10px] uppercase text-zinc-500 px-2 py-1">Conversas recentes</div>
            {threads.length === 0 && <div className="text-xs text-zinc-600 px-2 py-2">Nenhuma conversa ainda.</div>}
            {threads.map(t => (
              <div key={t.id} className={cn("group flex items-center gap-2 px-2 py-1.5 rounded text-xs cursor-pointer hover:bg-zinc-800", activeThreadId === t.id && "bg-zinc-800")}>
                <button className="flex-1 text-left truncate text-zinc-300" onClick={() => { loadThread(t.id); setShowThreads(false); }}>
                  {t.title || "(sem título)"}
                </button>
                <button onClick={() => deleteThread(t.id)} className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="space-y-3">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <Sparkles className="w-4 h-4 text-[#D9F564]" />
                  <span className="text-sm font-medium text-zinc-100">Olá. Sou a Mari Brain.</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Conheço cada KPI, fonte de dado e gráfico da plataforma — e sou senior advisor em M&A de PMEs no Brasil. Posso te ajudar a priorizar matches, destravar deals, interpretar números e seguir o playbook.
                </p>
              </div>
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500 px-1">Sugestões para esta tela</div>
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(s.prompt)}
                    className="w-full text-left text-xs px-3 py-2 rounded-lg border border-zinc-800 hover:border-[#D9F564]/40 hover:bg-zinc-900 text-zinc-300 transition-colors"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <MariMessageBubble key={i} role={m.role} content={m.content} />
          ))}
        </div>

        {/* Input */}
        <div className="border-t border-zinc-800 p-3 bg-zinc-950">
          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunte qualquer coisa…"
              disabled={streaming}
              className="bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-[#D9F564]"
            />
            {streaming ? (
              <Button type="button" size="icon" onClick={stop} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 shrink-0">
                <StopCircle className="w-4 h-4" />
              </Button>
            ) : (
              <Button type="submit" size="icon" className="bg-[#D9F564] hover:bg-[#c5e054] text-[#0A0A0A] shrink-0" disabled={!input.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            )}
          </form>
          <p className="text-[10px] text-zinc-600 mt-1.5 text-center">⌘K / Ctrl+K abre/fecha · respostas usam contexto vivo do seu usuário</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
