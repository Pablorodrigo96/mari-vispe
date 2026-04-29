import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, Loader2, X, Sparkles } from "lucide-react";
import { useAskMari } from "@/hooks/useAskMari";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

const SUGGESTIONS = [
  "Quais 3 buyers eu deveria contactar essa semana?",
  "Redige um WhatsApp de follow-up educado",
  "Por que esse contato esfriou?",
  "Resumo executivo desse registro",
];

export function AskMariDrawer({ entity_type, entity_id }: { entity_type: "mandate" | "buyer" | "hub"; entity_id?: string }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const { messages, loading, send } = useAskMari(entity_type, entity_id);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const submit = () => {
    if (!input.trim() || loading) return;
    send(input);
    setInput("");
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-30 inline-flex items-center gap-2 px-4 py-2 rounded-full shadow-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm"
      >
        <Sparkles className="h-4 w-4" /> Ask Mari
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex justify-end" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <aside
            onClick={e => e.stopPropagation()}
            className="relative w-full max-w-md bg-zinc-950 border-l border-zinc-800 flex flex-col h-full"
          >
            <header className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-semibold text-zinc-100">Ask Mari</span>
                <span className="text-[10px] text-zinc-500">contexto: {entity_type}</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-100">
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && !loading && (
                <div className="space-y-2">
                  <p className="text-xs text-zinc-500">Pergunte qualquer coisa sobre este registro:</p>
                  {SUGGESTIONS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => send(s)}
                      className="block w-full text-left text-xs text-zinc-300 px-3 py-2 rounded bg-zinc-900 border border-zinc-800 hover:border-emerald-700"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded px-3 py-2 text-xs break-words",
                    m.role === "user"
                      ? "bg-emerald-600/15 border border-emerald-700/40 text-emerald-100 ml-6"
                      : "bg-zinc-900 border border-zinc-800 text-zinc-200 mr-6",
                  )}
                >
                  <div className="prose prose-sm prose-invert max-w-none">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="text-xs text-zinc-500 inline-flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" /> Mari está pensando…
                </div>
              )}
              <div ref={endRef} />
            </div>

            <footer className="border-t border-zinc-800 p-3 flex items-center gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && submit()}
                placeholder="Pergunte à Mari…"
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600"
              />
              <button
                onClick={submit}
                disabled={loading || !input.trim()}
                className="p-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50"
              >
                <Send className="h-3 w-3" />
              </button>
            </footer>
          </aside>
        </div>
      )}
    </>
  );
}
