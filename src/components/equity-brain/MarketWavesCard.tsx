import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, Waves } from "lucide-react";
import { toast } from "sonner";

type WaveRow = {
  setor: string;
  uf: string;
  seller_pressure: number;
  seller_count: number;
  buyer_demand: number;
  buyer_count: number;
  wave_score: number;
  computed_at: string;
};

export function MarketWavesCard() {
  const [rows, setRows] = useState<WaveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await (supabase as any)
      .schema("equity_brain")
      .from("market_waves")
      .select("*")
      .order("wave_score", { ascending: false })
      .limit(200);
    setRows((data ?? []) as WaveRow[]);
    setLoading(false);
  }

  async function recompute() {
    setRunning(true);
    try {
      const { error } = await supabase.functions.invoke("compute-market-waves");
      if (error) throw error;
      toast.success("Ondas de mercado recalculadas");
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao recalcular");
    } finally {
      setRunning(false);
    }
  }

  useEffect(() => { load(); }, []);

  const total = rows.length;
  const lastUpdate = rows[0]?.computed_at;

  return (
    <Card className="!bg-slate-900/60 backdrop-blur-md border-slate-800">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div>
          <CardTitle className="text-base text-foreground flex items-center gap-2">
            <Waves className="h-4 w-4 text-cyan-400" />
            Ondas de Mercado (setor × UF)
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1 break-words">
            Tensão estrutural = pressão de venda × densidade de demanda. {total} células ativas
            {lastUpdate && ` · atualizado ${new Date(lastUpdate).toLocaleString("pt-BR")}`}.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={recompute} disabled={running} className="bg-transparent">
          {running ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
          Recalcular
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-xs text-muted-foreground py-4 text-center">Carregando…</div>
        ) : rows.length === 0 ? (
          <div className="text-xs text-muted-foreground py-4 text-center">
            Nenhuma onda computada. Clique em Recalcular.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[360px]">
            <table className="w-full text-xs">
              <thead className="text-[10px] text-muted-foreground border-b border-slate-800 sticky top-0 bg-slate-900">
                <tr>
                  <th className="text-left py-1 px-2">Setor</th>
                  <th className="text-left py-1 px-2">UF</th>
                  <th className="text-right py-1 px-2">Sellers</th>
                  <th className="text-right py-1 px-2">Pressão</th>
                  <th className="text-right py-1 px-2">Buyers</th>
                  <th className="text-right py-1 px-2">Demanda</th>
                  <th className="text-right py-1 px-2">Wave</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 30).map((r, i) => (
                  <tr key={i} className="border-b border-slate-800/40">
                    <td className="py-1 px-2 break-words">{r.setor}</td>
                    <td className="py-1 px-2 font-mono">{r.uf}</td>
                    <td className="py-1 px-2 text-right">{r.seller_count}</td>
                    <td className="py-1 px-2 text-right text-amber-300">{(r.seller_pressure * 100).toFixed(0)}%</td>
                    <td className="py-1 px-2 text-right">{r.buyer_count}</td>
                    <td className="py-1 px-2 text-right text-cyan-300">{(r.buyer_demand * 100).toFixed(0)}%</td>
                    <td className="py-1 px-2 text-right">
                      <Badge
                        variant="outline"
                        className={`bg-transparent text-xs ${
                          r.wave_score >= 0.4 ? "border-emerald-500/60 text-emerald-300"
                            : r.wave_score >= 0.25 ? "border-amber-500/60 text-amber-300"
                              : "border-slate-600 text-slate-400"
                        }`}
                      >
                        {(r.wave_score * 100).toFixed(0)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
