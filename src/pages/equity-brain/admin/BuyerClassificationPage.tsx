import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Tags, Loader2, Play } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

export default function BuyerClassificationPage() {
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);

  const statsQ = useQuery({
    queryKey: ["buyer-classification-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .schema("equity_brain" as any)
        .from("buyers" as any)
        .select("tipo_comprador, tipo_classified_confidence, is_synthetic");
      if (error) throw error;
      const real = (data ?? []).filter((b: any) => !b.is_synthetic);
      const classified = real.filter((b: any) => b.tipo_comprador);
      const pending = real.length - classified.length;
      const avgConf = classified.length
        ? classified.reduce((s: number, b: any) => s + (Number(b.tipo_classified_confidence) || 0), 0) / classified.length
        : 0;
      const dist: Record<string, number> = {};
      for (const b of classified) dist[b.tipo_comprador] = (dist[b.tipo_comprador] ?? 0) + 1;
      return {
        total: real.length,
        classified: classified.length,
        pending,
        avgConfidence: avgConf,
        dist: Object.entries(dist).map(([tipo, count]) => ({ tipo, count })).sort((a,b) => b.count - a.count),
      };
    },
  });

  const recentQ = useQuery({
    queryKey: ["buyer-classification-recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .schema("equity_brain" as any)
        .from("buyers" as any)
        .select("id, nome, tipo_comprador, tipo_classified_at, tipo_classified_confidence, tipo_classified_reasoning")
        .not("tipo_classified_at", "is", null)
        .order("tipo_classified_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  async function runBatch(limit: number) {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("mari-classify-buyer-type", {
        body: { batch: true, limit },
      });
      if (error) throw error;
      toast({
        title: "Batch concluído",
        description: `${data.success}/${data.total} classificados, ${data.errors} erros`,
      });
      qc.invalidateQueries({ queryKey: ["buyer-classification-stats"] });
      qc.invalidateQueries({ queryKey: ["buyer-classification-recent"] });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  }

  function runAll() {
    const pending = statsQ.data?.pending ?? 0;
    if (!pending) return;
    const minutes = Math.ceil(pending / 60);
    if (!confirm(`Classificar ${pending} buyers pendentes? Estimativa: ~${minutes} minutos.`)) return;
    runBatch(pending);
  }

  const s = statsQ.data;

  return (
    <div className="dark min-h-screen bg-zinc-950 text-zinc-100 p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Tags className="h-6 w-6 text-[#D9F564]" /> Classificar Buyers
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Atribui um dos 11 tipos da taxonomia Vispe (Mari/Gemini)
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => runBatch(50)}
            disabled={running || !s?.pending}
            variant="outline"
            className="bg-zinc-900 border-zinc-700 hover:bg-zinc-800"
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            Próximos 50
          </Button>
          <Button
            onClick={runAll}
            disabled={running || !s?.pending}
            className="bg-[#D9F564] text-zinc-950 hover:bg-[#D9F564]/90"
          >
            Todos pendentes ({s?.pending ?? 0})
          </Button>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Total buyers" value={s?.total ?? "—"} />
        <Kpi label="Classificados" value={s?.classified ?? "—"} accent />
        <Kpi label="Pendentes" value={s?.pending ?? "—"} />
        <Kpi label="Confidence médio" value={s ? s.avgConfidence.toFixed(2) : "—"} />
      </div>

      {/* Distribuição */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <h2 className="text-sm font-semibold text-zinc-200 mb-3">Distribuição por tipo</h2>
        {s?.dist && s.dist.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={s.dist} margin={{ top: 8, right: 8, bottom: 40, left: 0 }}>
              <XAxis dataKey="tipo" stroke="#71717a" angle={-30} textAnchor="end" interval={0} fontSize={10} />
              <YAxis stroke="#71717a" fontSize={10} />
              <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", fontSize: 11 }} />
              <Bar dataKey="count" fill="#D9F564" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-xs text-zinc-500 text-center py-8">Sem classificações ainda.</div>
        )}
      </div>

      {/* Recentes */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-auto">
        <h2 className="text-sm font-semibold text-zinc-200 px-4 pt-3">Últimas classificações</h2>
        <table className="w-full text-xs mt-2">
          <thead className="bg-zinc-950 text-zinc-500">
            <tr>
              <th className="text-left px-3 py-2">Buyer</th>
              <th className="text-left px-3 py-2">Tipo</th>
              <th className="text-right px-3 py-2">Confidence</th>
              <th className="text-left px-3 py-2">Reasoning</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {(recentQ.data ?? []).map((b: any) => (
              <tr key={b.id}>
                <td className="px-3 py-2 text-zinc-100 truncate max-w-[200px]">{b.nome}</td>
                <td className="px-3 py-2 text-zinc-400 text-[10px]">{b.tipo_comprador}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{Number(b.tipo_classified_confidence ?? 0).toFixed(2)}</td>
                <td className="px-3 py-2 text-zinc-500 text-[11px] break-words max-w-md">{b.tipo_classified_reasoning ?? "—"}</td>
              </tr>
            ))}
            {(recentQ.data ?? []).length === 0 && (
              <tr><td colSpan={4} className="text-center py-6 text-zinc-500">Nenhuma classificação ainda.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: any; accent?: boolean }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${accent ? "text-[#D9F564]" : ""}`}>{value}</div>
    </div>
  );
}
