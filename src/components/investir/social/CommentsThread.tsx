import { useEffect, useState } from "react";
import { Send, BadgeCheck, Loader2 } from "lucide-react";
import type { Comment } from "@/types/social";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = {
  initial: Comment[];
  tokenId?: string | null;
  founderUserId?: string | null;
};

const timeAgo = (iso: string) => {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60); if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24); return `${d}d`;
};

export function CommentsThread({ initial, tokenId, founderUserId }: Props) {
  const [comments, setComments] = useState<Comment[]>(initial);
  const [text, setText] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("Você");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setUserId(data.user.id);
      const { data: p } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (p?.full_name) setUserName(p.full_name);
    });
  }, []);

  useEffect(() => {
    if (!tokenId) return;
    (async () => {
      const { data } = await supabase
        .from("company_comments")
        .select("id, user_id, body, created_at")
        .eq("token_id", tokenId)
        .order("created_at", { ascending: true })
        .limit(50);
      if (!data?.length) return;
      const ids = Array.from(new Set(data.map((c: any) => c.user_id)));
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", ids);
      const nameById = new Map((profs || []).map((p: any) => [p.user_id, p.full_name]));
      const mapped: Comment[] = data.map((c: any) => ({
        id: c.id,
        author: nameById.get(c.user_id) || "Investidor",
        body: c.body,
        isFounder: !!(founderUserId && c.user_id === founderUserId),
        createdAt: timeAgo(c.created_at),
      }));
      setComments(mapped);
    })();
  }, [tokenId, founderUserId]);

  async function send() {
    const v = text.trim();
    if (!v) return;
    if (!userId) {
      toast.error("Entre na Mari para comentar.");
      return;
    }
    setSending(true);
    const optimistic: Comment = {
      id: `local-${Date.now()}`, author: userName, body: v, createdAt: "agora",
      isFounder: !!(founderUserId && userId === founderUserId),
    };
    setComments((c) => [...c, optimistic]);
    setText("");

    if (tokenId) {
      const { error } = await supabase.from("company_comments").insert({
        token_id: tokenId, user_id: userId, body: v,
      });
      if (error) {
        setComments((c) => c.filter((x) => x.id !== optimistic.id));
        toast.error("Não foi possível enviar agora.");
      }
    }
    setSending(false);
  }

  return (
    <section id="comentarios" className="m-card p-5 md:p-6">
      <h3 className="text-bone font-bold text-base md:text-lg mb-4">Comunidade</h3>
      <ul className="space-y-4 mb-4">
        {comments.map((c) => (
          <li key={c.id} className="flex gap-3">
            <div className={`w-8 h-8 rounded-full grid place-items-center text-xs font-bold shrink-0 ${c.isFounder ? "bg-[var(--m-pink-bg,rgba(190,24,93,0.2))] text-[var(--m-pink,#BE185D)]" : "bg-bone/10 text-bone"}`}>
              {c.author[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-bone font-semibold text-sm">{c.author}</span>
                {c.isFounder && (
                  <span className="m-chip m-chip-pink">
                    <BadgeCheck className="w-2.5 h-2.5" /> fundador
                  </span>
                )}
                <span className="text-bone/45 text-[10px]">· {c.createdAt}</span>
              </div>
              <p className={`text-sm leading-snug mt-0.5 break-words ${c.isFounder ? "text-bone font-medium" : "text-bone/85"}`}>
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
          onKeyDown={(e) => e.key === "Enter" && !sending && send()}
          placeholder={userId ? "Comente, faça uma pergunta…" : "Entre na Mari para comentar"}
          disabled={!userId || sending}
          className="flex-1 bg-bone/10 border border-bone/15 rounded-full px-4 py-2 text-sm text-bone placeholder:text-bone/45 focus:outline-none focus:border-bone focus:ring-2 focus:ring-bone/10 disabled:opacity-50"
        />
        <button
          onClick={send}
          disabled={!userId || sending || !text.trim()}
          className="m-cta px-3 py-2 disabled:opacity-40"
          aria-label="Enviar"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </section>
  );
}

