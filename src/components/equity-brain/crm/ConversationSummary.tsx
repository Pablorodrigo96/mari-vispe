import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

type Summary = {
  bullets: string[];
  sentiment: "positivo" | "neutro" | "negativo";
  pending: string[];
  next_steps: string[];
};

export function ConversationSummary({ entity_type, entity_id }: { entity_type: "mandate" | "buyer"; entity_id: string }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Summary | null>(null);
  const [extra, setExtra] = useState("");
  const qc = useQueryClient();

  const run = async () => {
    setLoading(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("mari-summarize-thread", {
        body: { entity_type, entity_id, extra_text: extra },
      });
      if (error) throw error;
      setData(res);
      qc.invalidateQueries({ queryKey: ["crm-activities", entity_type, entity_id] });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao resumir");
    } finally {
      setLoading(false);
    }
  };

  const sentimentCls: Record<string, string> = {
    positivo: "text-emerald-400",
    neutro: "text-zinc-400",
    negativo: "text-rose-400",
  };

  return (
    <div className="bg-zinc-900/40 border border-zinc-800 rounded p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-zinc-100">Resumo da conversa (Mari)</h3>
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="text-[11px] px-3 py-1 rounded bg-emerald-600/20 text-emerald-300 border border-emerald-700/50 disabled:opacity-50 inline-flex items-center gap-1 bg-transparent"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          {data ? "Resumir novamente" : "Resumir conversa"}
        </button>
      </div>

      <details className="text-[11px] text-zinc-500">
        <summary className="cursor-pointer hover:text-zinc-300">Adicionar trecho colado da conversa</summary>
        <textarea
          value={extra}
          onChange={e => setExtra(e.target.value)}
          rows={4}
          placeholder="Cole aqui mensagens não registradas no CRM…"
          className="mt-2 w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs text-zinc-200"
        />
      </details>

      {data && (
        <div className="space-y-3 text-xs">
          <div>
            <div className="text-[10px] uppercase text-zinc-500 mb-1">Resumo</div>
            <ul className="list-disc list-inside text-zinc-200 space-y-0.5 break-words">
              {data.bullets.map((b, i) => <li key={i}>{b}</li>)}
            </ul>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase text-zinc-500">Sentimento</span>
            <span className={`text-xs font-semibold ${sentimentCls[data.sentiment]}`}>{data.sentiment}</span>
          </div>
          {data.pending?.length > 0 && (
            <div>
              <div className="text-[10px] uppercase text-zinc-500 mb-1">Pendências</div>
              <ul className="list-disc list-inside text-amber-200 space-y-0.5 break-words">
                {data.pending.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
          )}
          {data.next_steps?.length > 0 && (
            <div>
              <div className="text-[10px] uppercase text-zinc-500 mb-1">Próximos passos</div>
              <ul className="list-disc list-inside text-emerald-200 space-y-0.5 break-words">
                {data.next_steps.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
