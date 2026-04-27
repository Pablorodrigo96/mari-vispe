import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Network } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BrasilMap, type BrasilMapFilters } from "@/components/equity-brain/BrasilMap";
import { DealCard } from "@/components/equity-brain/DealCard";
import { EBStatCard } from "@/components/equity-brain/EBStatCard";
import { UFS, formatNumber } from "@/lib/equityBrain";

export default function MapaPage() {
  const [drawerCnpj, setDrawerCnpj] = useState<string | null>(null);
  const [filters, setFilters] = useState<BrasilMapFilters>({
    ufs: [],
    setores: [],
    minScore: 0,
    showBuyers: false,
  });

  // KPIs
  const ufStatsQ = useQuery({
    queryKey: ["mapa", "kpi-uf"],
    queryFn: async () => {
      const { data } = await supabase
        .from("eb_v_opportunities_by_uf" as any)
        .select("uf,total,premium_count,top_setor")
        .order("premium_count", { ascending: false });
      return (data ?? []) as any[];
    },
  });

  const muniStatsQ = useQuery({
    queryKey: ["mapa", "kpi-muni"],
    queryFn: async () => {
      const { data } = await supabase
        .from("eb_v_opportunities_by_municipio" as any)
        .select("municipio,uf,premium_count,total")
        .order("premium_count", { ascending: false })
        .limit(50);
      return (data ?? []) as any[];
    },
  });

  const kpis = useMemo(() => {
    const top = ufStatsQ.data?.[0];
    // Setor mais quente: top_setor mais frequente entre UFs
    const setorTally = new Map<string, number>();
    (ufStatsQ.data ?? []).forEach((r) => {
      if (r.top_setor) setorTally.set(r.top_setor, (setorTally.get(r.top_setor) ?? 0) + r.premium_count);
    });
    const topSetor = Array.from(setorTally.entries()).sort((a, b) => b[1] - a[1])[0];

    // Concentração: % de premium em top 5 cidades
    const muni = muniStatsQ.data ?? [];
    const totalPremium = muni.reduce((s, m) => s + (m.premium_count ?? 0), 0);
    const top5Premium = muni.slice(0, 5).reduce((s, m) => s + (m.premium_count ?? 0), 0);
    const concentration = totalPremium > 0 ? Math.round((top5Premium / totalPremium) * 100) : 0;

    return {
      topUf: top ? `${top.uf} (${formatNumber(top.premium_count)})` : "—",
      topSetor: topSetor ? `${topSetor[0]}` : "—",
      concentration: `${concentration}%`,
    };
  }, [ufStatsQ.data, muniStatsQ.data]);

  const toggleUf = (uf: string) => {
    setFilters((f) => ({
      ...f,
      ufs: f.ufs.includes(uf) ? f.ufs.filter((x) => x !== uf) : [...f.ufs, uf],
    }));
  };

  return (
    <div className="flex flex-col h-[calc(100vh-1px)] bg-zinc-950">
      {/* KPIs topo */}
      <div className="grid grid-cols-3 gap-3 p-4 border-b border-zinc-800">
        <EBStatCard label="UF com mais oportunidades" value={kpis.topUf} accent="emerald" />
        <EBStatCard label="Setor mais quente" value={kpis.topSetor} accent="amber" />
        <EBStatCard label="Concentração top 5 cidades" value={kpis.concentration} accent="blue" />
      </div>

      {/* Mapa + sidebar filtros */}
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 relative">
          <BrasilMap filters={filters} onSelectCompany={setDrawerCnpj} />

          {/* Botão flutuante para Grafo */}
          <Link
            to="/equity-brain/grafo"
            className="absolute bottom-6 left-6 z-[1000] flex items-center gap-2 px-4 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold text-sm shadow-lg shadow-emerald-900/40 transition-colors"
          >
            <Network className="h-4 w-4" />
            Trocar para Grafo →
          </Link>
        </div>

        {/* Sidebar filtros */}
        <aside className="w-72 shrink-0 bg-zinc-900 border-l border-zinc-800 overflow-y-auto p-4 space-y-5">
          <div>
            <h3 className="text-zinc-300 text-xs font-bold uppercase tracking-wider mb-2">
              Score M&A mínimo
            </h3>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={filters.minScore}
              onChange={(e) => setFilters((f) => ({ ...f, minScore: Number(e.target.value) }))}
              className="w-full accent-emerald-500"
            />
            <div className="text-emerald-400 text-sm font-bold">{filters.minScore}</div>
          </div>

          <div>
            <h3 className="text-zinc-300 text-xs font-bold uppercase tracking-wider mb-2">UFs</h3>
            <div className="grid grid-cols-4 gap-1.5">
              {UFS.map((uf) => {
                const active = filters.ufs.includes(uf);
                return (
                  <button
                    key={uf}
                    onClick={() => toggleUf(uf)}
                    className={`px-1.5 py-1 rounded text-[11px] font-mono font-semibold transition-colors ${
                      active
                        ? "bg-emerald-500 text-zinc-950"
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100"
                    }`}
                  >
                    {uf}
                  </button>
                );
              })}
            </div>
            {filters.ufs.length > 0 && (
              <button
                onClick={() => setFilters((f) => ({ ...f, ufs: [] }))}
                className="text-[10px] text-zinc-500 hover:text-zinc-300 mt-2"
              >
                Limpar UFs
              </button>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
            <Label htmlFor="show-buyers" className="text-zinc-300 text-xs font-semibold cursor-pointer">
              Mostrar buyers
            </Label>
            <Switch
              id="show-buyers"
              checked={filters.showBuyers}
              onCheckedChange={(v) => setFilters((f) => ({ ...f, showBuyers: v }))}
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-emerald-300"
            onClick={() => {
              try {
                sessionStorage.setItem("eb_global_filters", JSON.stringify(filters));
              } catch {}
            }}
          >
            Vincular ao filtro de tabela
          </Button>

          <p className="text-[10px] text-zinc-600 leading-relaxed pt-3 border-t border-zinc-800">
            Faça zoom para ver clusters por município e, em zoom 9+, pins individuais por CNPJ. Pulse esverdeado = oportunidade premium.
          </p>
        </aside>
      </div>

      {/* Drawer empresa */}
      <Sheet open={!!drawerCnpj} onOpenChange={(open) => !open && setDrawerCnpj(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl bg-zinc-950 border-zinc-800 overflow-y-auto p-0">
          {drawerCnpj && <DealCard cnpj={drawerCnpj} mode="drawer" />}
        </SheetContent>
      </Sheet>
    </div>
  );
}
