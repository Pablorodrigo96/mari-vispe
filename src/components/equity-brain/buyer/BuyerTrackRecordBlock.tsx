import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EditableField } from "../EditableField";
import { useUpdateBuyer } from "@/hooks/useUpdateBuyer";
import { Skeleton } from "@/components/ui/skeleton";

export function BuyerTrackRecordBlock({ buyer }: { buyer: any }) {
  const upd = useUpdateBuyer(buyer.id);
  const save = (field: string, value: any) =>
    upd.mutateAsync({ field, value, oldValue: buyer[field] });

  const benchmarkQ = useQuery({
    queryKey: ["buyer-benchmark", buyer?.nome],
    enabled: !!buyer?.nome,
    queryFn: async () => {
      const firstWord = String(buyer.nome).split(/\s+/)[0];
      const { data, error } = await (supabase as any)
        .schema("equity_brain")
        .from("benchmark_transactions")
        .select("id, alvo_nome, setor, subsetor, data_anuncio, ev_brl_mm, multiplo_ev_ebitda, fase_ciclo_setorial")
        .ilike("comprador_nome", `%${firstWord}%`)
        .order("data_anuncio", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-4">
      <div className="bg-zinc-900/40 border border-zinc-800 rounded p-4">
        <h3 className="text-sm font-bold text-zinc-100 mb-3">Métricas do comprador</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          <div>
            <EditableField label="Total deals históricos" value={buyer.deals_realizados} onSave={(v) => save("deals_realizados", v)} type="number" />
            <EditableField label="Deals últimos 12m" value={buyer.deals_last_12m} onSave={(v) => save("deals_last_12m", v)} type="number" />
          </div>
          <div>
            <EditableField label="Múltiplo médio recente" value={buyer.avg_multiple_paid_recent} onSave={(v) => save("avg_multiple_paid_recent", v)} type="number" />
            <EditableField label="Última captação (R$)" value={buyer.recent_capital_raise_brl} onSave={(v) => save("recent_capital_raise_brl", v)} type="number" />
          </div>
        </div>
      </div>

      <div className="bg-zinc-900/40 border border-zinc-800 rounded p-4">
        <h3 className="text-sm font-bold text-zinc-100 mb-3">Deals históricos (Vispe Database)</h3>
        {benchmarkQ.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (benchmarkQ.data ?? []).length === 0 ? (
          <p className="text-xs text-zinc-500 italic">
            Nenhum deal histórico identificado deste buyer na base Vispe (busca por nome).
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-zinc-500 text-left">
                <tr className="border-b border-zinc-800">
                  <th className="py-1.5 pr-2">Alvo</th>
                  <th className="py-1.5 pr-2">Setor</th>
                  <th className="py-1.5 pr-2">Data</th>
                  <th className="py-1.5 pr-2">EV (R$ MM)</th>
                  <th className="py-1.5 pr-2">Múltiplo</th>
                  <th className="py-1.5">Fase ciclo</th>
                </tr>
              </thead>
              <tbody className="text-zinc-300">
                {(benchmarkQ.data ?? []).map((d: any) => (
                  <tr key={d.id} className="border-b border-zinc-900">
                    <td className="py-1.5 pr-2 break-words">{d.alvo_nome ?? "—"}</td>
                    <td className="py-1.5 pr-2">{d.setor ?? "—"}{d.subsetor ? `/${d.subsetor}` : ""}</td>
                    <td className="py-1.5 pr-2">{d.data_anuncio ?? "—"}</td>
                    <td className="py-1.5 pr-2">{d.ev_brl_mm ?? "—"}</td>
                    <td className="py-1.5 pr-2">{d.multiplo_ev_ebitda ? `${d.multiplo_ev_ebitda}x` : "—"}</td>
                    <td className="py-1.5">{d.fase_ciclo_setorial ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
