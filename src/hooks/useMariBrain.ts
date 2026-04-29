import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type MariBrainMessage = {
  id?: string;
  role: "user" | "assistant";
  content: string;
};

export type MariBrainThread = {
  id: string;
  title: string | null;
  route: string | null;
  updated_at: string;
};

export function useMariBrain() {
  const [threads, setThreads] = useState<MariBrainThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MariBrainMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const loadThreads = useCallback(async () => {
    const { data, error } = await supabase
      .from("mari_brain_threads")
      .select("id, title, route, updated_at")
      .order("updated_at", { ascending: false })
      .limit(30);
    if (!error && data) setThreads(data as MariBrainThread[]);
  }, []);

  const loadThread = useCallback(async (threadId: string) => {
    setLoading(true);
    setActiveThreadId(threadId);
    const { data, error } = await supabase
      .from("mari_brain_messages")
      .select("id, role, content")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });
    if (!error && data) {
      setMessages(data as MariBrainMessage[]);
    }
    setLoading(false);
  }, []);

  const newThread = useCallback(() => {
    setActiveThreadId(null);
    setMessages([]);
  }, []);

  const deleteThread = useCallback(async (threadId: string) => {
    await supabase.from("mari_brain_threads").delete().eq("id", threadId);
    if (activeThreadId === threadId) newThread();
    loadThreads();
  }, [activeThreadId, loadThreads, newThread]);

  const send = useCallback(async (text: string, opts?: { route?: string; entity_type?: string; entity_id?: string }) => {
    if (!text.trim()) return;

    setMessages(m => [...m, { role: "user", content: text }, { role: "assistant", content: "" }]);
    setStreaming(true);

    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Não autenticado");

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mari-brain`;
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          thread_id: activeThreadId,
          message: text,
          route: opts?.route,
          entity_type: opts?.entity_type,
          entity_id: opts?.entity_id,
        }),
        signal: ctrl.signal,
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `Erro ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantSoFar = "";
      let newThreadId: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line || line.startsWith(":")) continue;

          if (line.startsWith("event: thread")) continue;
          if (line.startsWith("data: ")) {
            const json = line.slice(6).trim();
            if (json === "[DONE]") continue;
            try {
              const p = JSON.parse(json);
              if (p.thread_id) {
                newThreadId = p.thread_id;
                continue;
              }
              const c = p.choices?.[0]?.delta?.content;
              if (c) {
                assistantSoFar += c;
                setMessages(prev => {
                  const copy = [...prev];
                  copy[copy.length - 1] = { role: "assistant", content: assistantSoFar };
                  return copy;
                });
              }
            } catch {
              buffer = line + "\n" + buffer;
              break;
            }
          }
        }
      }

      if (newThreadId && !activeThreadId) {
        setActiveThreadId(newThreadId);
        loadThreads();
      } else {
        loadThreads();
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        toast.error(e.message ?? "Erro ao falar com a Mari");
        setMessages(prev => prev.slice(0, -1)); // remove placeholder assistant
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [activeThreadId, loadThreads]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  useEffect(() => { loadThreads(); }, [loadThreads]);

  return { threads, activeThreadId, messages, loading, streaming, loadThreads, loadThread, newThread, deleteThread, send, stop };
}
