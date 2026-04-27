import { useQuery } from "@tanstack/react-query";
import { Loader2, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export default function TesesPage() {
  const teses = useQuery({
    queryKey: ["eb", "theses-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .schema("equity_brain" as any).from("investment_theses" as any)
        .select("*").order("category");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const usage = useQuery({
    queryKey: ["eb", "thesis-usage"],
    queryFn: async () => {
      const { data, error } = await supabase
        .schema("equity_brain" as any).from("buyer_theses" as any)
        .select("thesis_key").eq("active", true);
      if (error) throw error;
      const counts = new Map<string, number>();
      (data ?? []).forEach((r: any) => counts.set(r.thesis_key, (counts.get(r.thesis_key) ?? 0) + 1));
      return counts;
    },
  });

  return (
    <div className="p-6 space-y-4 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Catálogo de Teses</h1>
        <p className="text-sm text-zinc-500 mt-1">{teses.data?.length ?? 0} teses ativas · usadas pelos buyers para classificar oportunidades</p>
      </div>

      {teses.isLoading && (
        <div className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin text-emerald-500 mx-auto" /></div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(teses.data ?? []).map((t) => {
          const used = usage.data?.get(t.thesis_key) ?? 0;
          return (
            <div key={t.thesis_key} className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-emerald-400 border border-zinc-700">{t.thesis_key}</span>
                  <h3 className="text-base font-bold text-zinc-100 mt-2">{t.display_name}</h3>
                  <div className="text-[10px] text-zinc-500 mt-0.5 uppercase tracking-wider">{t.category}</div>
                </div>
                <div className={cn(
                  "shrink-0 px-2 py-0.5 rounded text-[10px] border",
                  t.active ? "bg-emerald-950/40 text-emerald-300 border-emerald-900" : "bg-zinc-800 text-zinc-500 border-zinc-700",
                )}>{t.active ? "ativa" : "inativa"}</div>
              </div>

              <p className="text-sm text-zinc-400 leading-relaxed">{t.description}</p>

              {Array.isArray(t.required_signals) && t.required_signals.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Sinais obrigatórios</div>
                  <div className="flex flex-wrap gap-1">
                    {t.required_signals.map((s: string) => (
                      <span key={s} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-950/40 text-rose-300 border border-rose-900/40">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {Array.isArray(t.boosting_signals) && t.boosting_signals.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Sinais de boost</div>
                  <div className="flex flex-wrap gap-1">
                    {t.boosting_signals.map((s: string) => (
                      <span key={s} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-950/40 text-blue-300 border border-blue-900/40">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {t.default_pitch_template && (
                <div className="pt-2 border-t border-zinc-800">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Template de pitch</div>
                  <div className="text-xs text-zinc-400 italic line-clamp-3">"{t.default_pitch_template}"</div>
                </div>
              )}

              <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-xs">
                <span className="text-zinc-500">
                  Usada por <span className="text-emerald-400 font-mono font-bold">{used}</span> buyer{used !== 1 ? "s" : ""}
                </span>
                <Lightbulb className="h-3.5 w-3.5 text-zinc-600" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
