import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Brain, TrendingUp, TrendingDown } from "lucide-react";
import { InfoHint } from "@/components/equity-brain/InfoHint";
import { EB_TIPS } from "@/lib/ebTooltips";

/**
 * Mostra como o Equity Brain v2 está aprendendo sobre este buyer:
 * - últimas mudanças de preferência (declaradas)
 * - thetas revelados atuais (top 5 com maior peso)
 */
export function LearningInsightsCard({ buyerId }: { buyerId: string }) {
  const [history, setHistory] = useState<any[]>([]);
  const [thetas, setThetas] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    (async () => {
      const h = await supabase
        .from("eb_buyer_preferences_history" as any)
        .select("*")
        .eq("buyer_id", buyerId)
        .order("changed_at", { ascending: false })
        .limit(5);
      setHistory((h.data as any[]) ?? []);

      const t = await supabase
        .from("buyer_revealed_thetas" as any)
        .select("thetas")
        .eq("buyer_id", buyerId)
        .maybeSingle();
      setThetas((t.data as any)?.thetas ?? null);
    })();
  }, [buyerId]);

  const top = thetas
    ? Object.entries(thetas)
        .filter(([k]) => k !== "version")
        .sort(([, a], [, b]) => Number(b) - Number(a))
        .slice(0, 6)
    : [];

  return (
    <div className="bg-zinc-900/40 border border-zinc-800 rounded p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Brain className="h-4 w-4 text-emerald-400" />
        <h3 className="text-sm font-bold text-zinc-100">Como o Mari está aprendendo sobre este buyer</h3>
        <InfoHint {...EB_TIPS.como_motor_aprende} />
      </div>

      {top.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] uppercase text-zinc-400">Pesos revelados (top)</div>
          {top.map(([k, v]) => (
            <div key={k} className="flex items-center gap-2">
              <div className="w-32 text-[11px] text-zinc-300 truncate">{k}</div>
              <div className="flex-1 h-1.5 bg-zinc-900 rounded">
                <div className="h-1.5 rounded bg-emerald-500"
                  style={{ width: `${Math.max(0, Math.min(100, Math.round(Number(v) * 100)))}%` }} />
              </div>
              <div className="w-10 text-right text-[10px] text-zinc-300">
                {Math.round(Number(v) * 100)}%
              </div>
            </div>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] uppercase text-zinc-400 mt-2">Mudanças recentes (declaradas)</div>
          {history.map((h: any) => (
            <div key={h.id} className="text-[11px] text-zinc-300 flex items-center gap-1">
              {h.delta_kind === "added" ? <TrendingUp className="h-3 w-3 text-emerald-400" /> : <TrendingDown className="h-3 w-3 text-rose-400" />}
              <span className="text-zinc-400">{h.field}:</span>
              <span className="break-words">{(JSON.stringify(h.delta ?? null) ?? "").slice(0, 120)}</span>
            </div>
          ))}
        </div>
      )}

      {top.length === 0 && history.length === 0 && (
        <div className="text-[11px] text-zinc-400">
          Ainda sem sinais suficientes. Conforme você marca interesses, envia teasers
          e atualiza preferências, o motor refina os pesos automaticamente.
        </div>
      )}
    </div>
  );
}
