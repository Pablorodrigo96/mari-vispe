import { useRef, useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { toast } from "@/hooks/use-toast";
import { Database, Upload, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const FASES = ["early","early_mid","mid","mid_late","peak","late","n_a"];

export default function BenchmarkPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [filterSetor, setFilterSetor] = useState("");
  const [filterFase, setFilterFase] = useState("");
  const [filterTipo, setFilterTipo] = useState("");
  const [search, setSearch] = useState("");
  const [drawer, setDrawer] = useState<any>(null);

  const dataQ = useQuery({
    queryKey: ["benchmark", filterSetor, filterFase, filterTipo, search],
    queryFn: async () => {
      let q = supabase
        .schema("equity_brain" as any)
        .from("benchmark_transactions" as any)
        .select("*")
        .order("id");
      if (filterSetor) q = q.eq("setor", filterSetor);
      if (filterFase) q = q.eq("fase_ciclo_setorial", filterFase);
      if (filterTipo) q = q.eq("tipo_comprador", filterTipo);
      if (search) q = q.or(`alvo_nome.ilike.%${search}%,comprador_nome.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const stats = useMemo(() => {
    const rows = dataQ.data ?? [];
    const bySetor: Record<string, number> = {};
    let multSum = 0, multCount = 0;
    for (const r of rows) {
      bySetor[r.setor ?? "n/a"] = (bySetor[r.setor ?? "n/a"] ?? 0) + 1;
      if (r.multiplo_ev_ebitda) { multSum += Number(r.multiplo_ev_ebitda); multCount++; }
    }
    return {
      total: rows.length,
      multMedio: multCount ? (multSum / multCount).toFixed(2) : "—",
      bySetor,
    };
  }, [dataQ.data]);

  const setores = useMemo(
    () => Array.from(new Set((dataQ.data ?? []).map(r => r.setor).filter(Boolean))).sort(),
    [dataQ.data],
  );
  const tipos = useMemo(
    () => Array.from(new Set((dataQ.data ?? []).map(r => r.tipo_comprador).filter(Boolean))).sort(),
    [dataQ.data],
  );

  async function handleUpload(file: File) {
    setLoading(true);
    try {
      const text = await file.text();
      const { data, error } = await supabase.functions.invoke("eb-load-benchmark-transactions", {
        body: { transactions_json: text },
      });
      if (error) throw error;
      toast({
        title: "Carregamento concluído",
        description: `${data.inserted}/${data.total} transações inseridas. ${data.errors?.length ?? 0} erros.`,
      });
      qc.invalidateQueries({ queryKey: ["benchmark"] });
    } catch (e: any) {
      toast({ title: "Erro no upload", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dark min-h-screen bg-zinc-950 text-zinc-100 p-6 space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6 text-[#D9F564]" /> Base Benchmark
          </h1>
          <p className="text-sm text-zinc-500 mt-1">55 transações Vispe v1.0 — Metodologia Três Assimetrias</p>
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
          />
          <Button
            onClick={() => fileRef.current?.click()}
            disabled={loading}
            className="bg-[#D9F564] text-zinc-950 hover:bg-[#D9F564]/90"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
            Carregar JSON
          </Button>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-xs text-zinc-500">Total transações</div>
          <div className="text-2xl font-bold text-[#D9F564] mt-1">{stats.total}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-xs text-zinc-500">Múltiplo médio EV/EBITDA</div>
          <div className="text-2xl font-bold mt-1">{stats.multMedio}x</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-xs text-zinc-500">Distribuição por setor</div>
          <div className="text-xs mt-1 space-y-0.5 max-h-20 overflow-y-auto">
            {Object.entries(stats.bySetor)
              .sort(([,a],[,b]) => b - a)
              .map(([s, n]) => (
                <div key={s} className="flex justify-between gap-4">
                  <span className="text-zinc-300 truncate">{s}</span>
                  <span className="text-zinc-500 tabular-nums">{n}</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          placeholder="Buscar alvo ou comprador..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-zinc-900 border-zinc-800 text-xs h-8 max-w-xs"
        />
        <select value={filterSetor} onChange={e => setFilterSetor(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded text-xs h-8 px-2">
          <option value="">Todos setores</option>
          {setores.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterFase} onChange={e => setFilterFase(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded text-xs h-8 px-2">
          <option value="">Todas fases</option>
          {FASES.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded text-xs h-8 px-2">
          <option value="">Todos tipos</option>
          {tipos.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Tabela */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-auto">
        <table className="w-full text-xs">
          <thead className="bg-zinc-950 text-zinc-500">
            <tr>
              <th className="text-left px-3 py-2">ID</th>
              <th className="text-left px-3 py-2">Alvo</th>
              <th className="text-left px-3 py-2">Comprador</th>
              <th className="text-left px-3 py-2">Setor</th>
              <th className="text-left px-3 py-2">Tipo</th>
              <th className="text-left px-3 py-2">Fase</th>
              <th className="text-right px-3 py-2">EV (R$ MM)</th>
              <th className="text-right px-3 py-2">×EBITDA</th>
              <th className="text-center px-3 py-2">Crítico</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {dataQ.isLoading && (
              <tr><td colSpan={9} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto text-[#D9F564]" /></td></tr>
            )}
            {(dataQ.data ?? []).map((r) => (
              <tr key={r.id} onClick={() => setDrawer(r)} className="hover:bg-zinc-800/50 cursor-pointer">
                <td className="px-3 py-2 font-mono text-zinc-500">{r.id}</td>
                <td className="px-3 py-2 text-zinc-100 truncate max-w-[200px]">{r.alvo_nome}</td>
                <td className="px-3 py-2 text-zinc-300 truncate max-w-[200px]">{r.comprador_nome}</td>
                <td className="px-3 py-2 text-zinc-400">{r.setor}</td>
                <td className="px-3 py-2 text-zinc-400 text-[10px]">{r.tipo_comprador ?? "—"}</td>
                <td className="px-3 py-2 text-zinc-500">{r.fase_ciclo_setorial ?? "—"}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{r.ev_brl_mm ?? "—"}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{r.multiplo_ev_ebitda ?? "—"}</td>
                <td className="px-3 py-2 text-center">
                  {r.flag_caso_critico && <AlertTriangle className="h-3.5 w-3.5 text-amber-400 inline" />}
                </td>
              </tr>
            ))}
            {!dataQ.isLoading && (dataQ.data ?? []).length === 0 && (
              <tr><td colSpan={9} className="text-center py-8 text-zinc-500">Nenhuma transação. Carregue o JSON acima.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Sheet open={!!drawer} onOpenChange={(o) => !o && setDrawer(null)}>
        <SheetContent side="right" className="dark bg-zinc-950 border-l border-zinc-800 text-zinc-100 w-full sm:max-w-2xl overflow-y-auto">
          {drawer && (
            <div className="space-y-4 p-2">
              <h2 className="text-lg font-bold">{drawer.id} · {drawer.alvo_nome}</h2>
              <div className="text-xs text-zinc-400">{drawer.comprador_nome} ({drawer.tipo_comprador ?? "?"})</div>
              {drawer.tese_estrategica && (
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Tese</div>
                  <div className="text-sm break-words">{drawer.tese_estrategica}</div>
                </div>
              )}
              <pre className="text-[10px] bg-zinc-900 border border-zinc-800 rounded p-3 overflow-auto max-h-[60vh]">
                {JSON.stringify(drawer.raw_data, null, 2)}
              </pre>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
