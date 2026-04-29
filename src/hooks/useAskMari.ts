import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type MariMessage = { role: "user" | "assistant"; content: string };

export function useAskMari(entity_type: "mandate" | "buyer" | "hub", entity_id?: string) {
  const [messages, setMessages] = useState<MariMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const send = async (text: string) => {
    if (!text.trim()) return;
    setMessages(m => [...m, { role: "user", content: text }]);
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("mari-chat", {
        body: { entity_type, entity_id, message: text },
      });
      if (error) throw error;
      const reply = data?.reply ?? "(sem resposta)";
      setMessages(m => [...m, { role: "assistant", content: reply }]);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao falar com a Mari");
    } finally {
      setLoading(false);
    }
  };

  return { messages, loading, send };
}
