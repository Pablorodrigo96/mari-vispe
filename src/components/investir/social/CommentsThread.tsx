import { useState } from "react";
import { Send, BadgeCheck } from "lucide-react";
import type { Comment } from "@/types/social";

export function CommentsThread({ initial }: { initial: Comment[] }) {
  const [comments, setComments] = useState<Comment[]>(initial);
  const [text, setText] = useState("");

  function send() {
    const v = text.trim();
    if (!v) return;
    setComments((c) => [
      ...c,
      { id: `local-${Date.now()}`, author: "Você", body: v, createdAt: "agora" },
    ]);
    setText("");
  }

  return (
    <section id="comentarios" className="bg-graphite/30 border border-bone/10 rounded-2xl p-5 md:p-6">
      <h3 className="text-bone font-semibold text-base md:text-lg mb-4">Comunidade</h3>
      <ul className="space-y-4 mb-4">
        {comments.map((c) => (
          <li key={c.id} className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-volt/20 grid place-items-center text-volt text-xs font-bold shrink-0">
              {c.author[0]}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-bone font-medium text-sm">{c.author}</span>
                {c.isFounder && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] uppercase tracking-wider bg-volt/20 text-volt px-1.5 py-0.5 rounded">
                    <BadgeCheck className="w-2.5 h-2.5" /> fundador
                  </span>
                )}
                <span className="text-bone/35 text-[10px]">· {c.createdAt}</span>
              </div>
              <p className={`text-sm leading-snug mt-0.5 break-words ${c.isFounder ? "text-bone" : "text-bone/80"}`}>
                {c.body}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex gap-2 border-t border-bone/10 pt-4">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Comente, faça uma pergunta…"
          className="flex-1 bg-carbon/40 border border-bone/10 rounded-full px-4 py-2 text-sm text-bone placeholder:text-bone/35 focus:outline-none focus:border-volt/50"
        />
        <button
          onClick={send}
          className="bg-volt text-carbon font-semibold p-2 rounded-full hover:bg-volt/90 transition-colors"
          aria-label="Enviar"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
}
