import { useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Network } from "lucide-react";
import { Link } from "react-router-dom";
import { BrasilMap, type BrasilMapFilters } from "@/components/equity-brain/BrasilMap";
import { MandateMap } from "@/components/equity-brain/MandateMap";
import { DealCard } from "@/components/equity-brain/DealCard";
import { UFS } from "@/lib/equityBrain";
import { useMandatePins } from "@/hooks/useMandatePins";
import { ProviderSynergyPanel } from "@/components/equity-brain/ProviderSynergyPanel";
import { toast } from "@/hooks/use-toast";
import { AnatelProviderMap, ANATEL_SLOT_COLORS, MAX_ANATEL_SLOTS, type MarketCandidate } from "@/components/equity-brain/AnatelProviderMap";
import {
  useAnatelProviderSearch,
  useAnatelProviderFootprints,
  useAnatelTable,
  type AnatelProviderHit,
} from "@/hooks/useAnatelProvider";
import { useAnatelMarketRadius, type SeedCity, type SelectedFootprint } from "@/hooks/useAnatelMarketRadius";
import { MarketRadiusPanel } from "@/components/equity-brain/MarketRadiusPanel";
import { getCoordsByIbge } from "@/lib/ibgeCoordinates";
import { getCoordinates, stateCapitals } from "@/lib/brazilCoordinates";
import { Input } from "@/components/ui/input";
import { Search, Radio, Target } from "lucide-react";

export default function MapaPage() {
  const [drawerCnpj, setDrawerCnpj] = useState<string | null>(null);
  const [mode, setMode] = useState<"heat" | "mandates" | "anatel">("heat");
  const mandatePinsQ = useMandatePins();

  // Anatel provider state (multi-select up to 3)
  const [selectedProviders, setSelectedProviders] = useState<AnatelProviderHit[]>([]);
  const [providerQuery, setProviderQuery] = useState("");
  const { table: anatelTable } = useAnatelTable();
  const providerSearchQ = useAnatelProviderSearch(providerQuery, anatelTable);
  const footprintQs = useAnatelProviderFootprints(
    selectedProviders.map((p) => p.cnpj),
    anatelTable,
  );

  const addProvider = (hit: AnatelProviderHit) => {
    setSelectedProviders((prev) => {
      if (prev.find((p) => p.cnpj === hit.cnpj)) return prev;
      if (prev.length >= MAX_ANATEL_SLOTS) return prev;
      return [...prev, hit];
    });
    setProviderQuery("");
  };
  const removeProvider = (cnpj: string) => {
    setSelectedProviders((prev) => prev.filter((p) => p.cnpj !== cnpj));
    setBuyerCnpjs((prev) => {
      const next = new Set(prev);
      next.delete(cnpj);
      return next;
    });
  };

  // Buyer-mode + market radius
  const [buyerCnpjs, setBuyerCnpjs] = useState<Set<string>>(new Set());
  const [radiusKm, setRadiusKm] = useState(50);
  const [sameUfOnly, setSameUfOnly] = useState(false);
  const [hasMarketResult, setHasMarketResult] = useState(false);
  const marketSearch = useAnatelMarketRadius();

  const toggleBuyer = (cnpj: string) => {
    setBuyerCnpjs((prev) => {
      const next = new Set(prev);
      if (next.has(cnpj)) next.delete(cnpj);
      else next.add(cnpj);
      return next;
    });
  };

  const buildSeeds = (): SeedCity[] => {
    const seeds: SeedCity[] = [];
    const useAll = buyerCnpjs.size === 0; // fallback: usar todos slots
    selectedProviders.forEach((p, idx) => {
      if (!useAll && !buyerCnpjs.has(p.cnpj)) return;
      const rows = footprintQs[idx]?.data ?? [];
      for (const r of rows) {
        let coord = getCoordsByIbge(r.codigo_ibge_cidade);
        if (!coord) coord = getCoordinates(r.cidade, r.estado) ?? null;
        if (!coord) coord = stateCapitals[r.estado] ?? null;
        if (!coord) continue;
        seeds.push({
          ibge: String(r.codigo_ibge_cidade ?? ""),
          lat: coord.lat,
          lng: coord.lng,
          uf: r.estado,
        });
      }
    });
    return seeds;
  };

  const handleSearchMarket = async () => {
    if (!anatelTable) {
      toast({ title: "Base Anatel indisponível", variant: "destructive" });
      return;
    }
    if (selectedProviders.length === 0) {
      toast({ title: "Selecione ao menos 1 provedor antes de buscar." });
      return;
    }
    const seeds = buildSeeds();
    console.log("[market] seeds:", seeds.length, "radius:", radiusKm, "buyers:", buyerCnpjs.size);
    if (!seeds.length) {
      toast({ title: "Sem cidades semente", description: "Aguarde os footprints carregarem.", variant: "destructive" });
      return;
    }
    try {
      // Monta footprints dos slots p/ cálculo de overlap + centroide
      const selectedFootprints: SelectedFootprint[] = selectedProviders.map((p, idx) => {
        const rows = footprintQs[idx]?.data ?? [];
        const cities = new Set<string>();
        let sumLatW = 0, sumLngW = 0, sumW = 0;
        for (const r of rows) {
          const k = r.codigo_ibge_cidade
            ? `ibge:${r.codigo_ibge_cidade}`
            : `nm:${(r.cidade || "").toLowerCase()}|${r.estado}`;
          cities.add(k);
          let coord = getCoordsByIbge(r.codigo_ibge_cidade);
          if (!coord) coord = getCoordinates(r.cidade, r.estado) ?? null;
          if (!coord) coord = stateCapitals[r.estado] ?? null;
          if (!coord) continue;
          const w = Math.max(r.acessos_empresa ?? 0, 1);
          sumLatW += coord.lat * w;
          sumLngW += coord.lng * w;
          sumW += w;
        }
        return {
          cnpj: p.cnpj,
          cities,
          centroid: { lat: sumW ? sumLatW / sumW : 0, lng: sumW ? sumLngW / sumW : 0 },
        };
      });

      const res = await marketSearch.mutateAsync({
        table: anatelTable,
        seeds,
        radiusKm,
        sameUfOnly,
        selectedFootprints,
        excludeCnpjs: selectedProviders.map((p) => p.cnpj),
      });
      console.log("[market] result:", res.cells.length, "cells", res.providers.length, "providers");
      setHasMarketResult(true);
      toast({
        title: `Mercado encontrado`,
        description: `${res.providers.length} candidatos complementares em ${res.cells.length} cidades (raio ${radiusKm}km).`,
      });
    } catch (e: any) {
      console.error("market search error", e);
      toast({
        title: "Erro ao buscar mercado",
        description: e?.message ?? String(e),
        variant: "destructive",
      });
    }
  };

  const clearMarket = () => {
    setHasMarketResult(false);
    marketSearch.reset();
  };

  const [filters, setFilters] = useState<BrasilMapFilters>({
    ufs: [],
    setores: [],
    minScore: 0,
    showBuyers: false,
  });

  const toggleUf = (uf: string) => {
    setFilters((f) => ({
      ...f,
      ufs: f.ufs.includes(uf) ? f.ufs.filter((x) => x !== uf) : [...f.ufs, uf],
    }));
  };

  return (
    <div className="flex flex-col h-[calc(100vh-1px)] bg-zinc-950">

      {/* Toggle modo */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800 bg-zinc-900/40">
        <span className="text-[11px] text-zinc-500 uppercase tracking-wider">Visualização:</span>
        <button
          onClick={() => setMode("heat")}
          className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${mode === "heat" ? "bg-emerald-500 text-zinc-950" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}
        >
          Heatmap empresas
        </button>
        <button
          onClick={() => setMode("mandates")}
          className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${mode === "mandates" ? "bg-emerald-500 text-zinc-950" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}
        >
          Mandatos ({mandatePinsQ.data?.length ?? 0})
        </button>
        <button
          onClick={() => setMode("anatel")}
          className={`px-3 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 ${mode === "anatel" ? "bg-[#D9F564] text-zinc-950" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}
        >
          <Radio className="h-3 w-3" /> Provedor Anatel
        </button>
      </div>

      {/* Mapa + sidebar filtros */}
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 relative">
          {mode === "heat" ? (
            <BrasilMap filters={filters} onSelectCompany={setDrawerCnpj} />
          ) : mode === "mandates" ? (
            <div className="p-4 h-full overflow-auto">
              {mandatePinsQ.isLoading ? (
                <div className="text-zinc-400 text-sm">Carregando mandatos…</div>
              ) : (mandatePinsQ.data?.length ?? 0) === 0 ? (
                <div className="text-zinc-400 text-sm space-y-2">
                  <p>Nenhum mandato geocodificado ainda.</p>
                  <p className="text-[11px] text-zinc-500">A geocodificação está rodando em background. Volte em alguns minutos.</p>
                </div>
              ) : (
                <MandateMap mandates={mandatePinsQ.data ?? []} height="calc(100vh - 220px)" />
              )}
            </div>
          ) : (
            <div className="p-4 h-full overflow-auto space-y-3">
              {/* Search bar */}
              <div className="relative max-w-xl">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input
                  value={providerQuery}
                  onChange={(e) => setProviderQuery(e.target.value)}
                  placeholder={
                    selectedProviders.length >= MAX_ANATEL_SLOTS
                      ? `Máximo de ${MAX_ANATEL_SLOTS} provedores. Remova um para adicionar outro.`
                      : `Buscar provedor (${selectedProviders.length}/${MAX_ANATEL_SLOTS})…`
                  }
                  disabled={selectedProviders.length >= MAX_ANATEL_SLOTS}
                  className="pl-9 bg-zinc-900 border-zinc-700 text-zinc-100"
                />
                {providerQuery.length >= 2 && selectedProviders.length < MAX_ANATEL_SLOTS && (
                  <div className="absolute z-[600] mt-1 w-full bg-zinc-900 border border-zinc-700 rounded shadow-lg max-h-72 overflow-auto">
                    {providerSearchQ.isLoading ? (
                      <div className="px-3 py-2 text-xs text-zinc-500">Buscando…</div>
                    ) : (providerSearchQ.data?.length ?? 0) === 0 ? (
                      <div className="px-3 py-2 text-xs text-zinc-500">Nenhum provedor encontrado.</div>
                    ) : (
                      providerSearchQ.data!.map((hit) => {
                        const already = selectedProviders.find((p) => p.cnpj === hit.cnpj);
                        return (
                          <button
                            key={hit.cnpj}
                            onClick={() => addProvider(hit)}
                            disabled={!!already}
                            className="w-full text-left px-3 py-2 hover:bg-zinc-800 border-b border-zinc-800/60 last:border-0 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <div className="text-sm text-zinc-100 font-medium truncate">
                              {hit.empresa} {already && <span className="text-[10px] text-zinc-500">(já adicionado)</span>}
                            </div>
                            <div className="text-[11px] text-zinc-500 flex justify-between">
                              <span>CNPJ {hit.cnpj}</span>
                              <span className="text-[#D9F564]">{new Intl.NumberFormat("pt-BR").format(hit.acessos)} acessos</span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Chips selecionados (com toggle comprador) */}
              {selectedProviders.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedProviders.map((p, idx) => {
                    const color = ANATEL_SLOT_COLORS[idx];
                    const isBuyer = buyerCnpjs.has(p.cnpj);
                    return (
                      <div
                        key={p.cnpj}
                        className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-700 text-xs"
                      >
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                        <span className="text-zinc-100 font-medium truncate max-w-[200px]">{p.empresa}</span>
                        <button
                          onClick={() => toggleBuyer(p.cnpj)}
                          title={isBuyer ? "Remover marca de comprador" : "Marcar como comprador"}
                          className={`flex items-center gap-1 ml-1 px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                            isBuyer
                              ? "bg-[#FB923C]/20 text-[#FB923C] border border-[#FB923C]/40"
                              : "bg-zinc-800 text-zinc-500 hover:text-zinc-200"
                          }`}
                        >
                          <Target className="h-2.5 w-2.5" /> comprador
                        </button>
                        <button
                          onClick={() => removeProvider(p.cnpj)}
                          className="text-zinc-500 hover:text-zinc-200 ml-1"
                          aria-label="Remover"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                  {selectedProviders.length > 1 && (
                    <button
                      onClick={() => { setSelectedProviders([]); setBuyerCnpjs(new Set()); }}
                      className="text-[11px] text-zinc-500 hover:text-zinc-200 px-2"
                    >
                      Limpar todos
                    </button>
                  )}
                </div>
              )}

              {/* Map / states */}
              {selectedProviders.length === 0 ? (
                <div className="text-zinc-400 text-sm border border-dashed border-zinc-800 rounded p-6 text-center">
                  <Radio className="h-6 w-6 mx-auto mb-2 text-[#D9F564]" />
                  Selecione até {MAX_ANATEL_SLOTS} provedores de telecom para sobrepor suas malhas geográficas.
                  <div className="text-[11px] text-zinc-600 mt-1">Cada provedor recebe uma cor distinta; cidades em comum aparecem com pontos lado a lado.</div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3">
                  <div className="space-y-3 min-w-0">
                    {selectedProviders.length >= 2 && (
                      <ProviderSynergyPanel
                        providers={selectedProviders.map((p, idx) => ({
                          cnpj: p.cnpj,
                          empresa: p.empresa,
                          color: ANATEL_SLOT_COLORS[idx],
                          rows: footprintQs[idx]?.data ?? [],
                        }))}
                        buyerCnpjs={buyerCnpjs}
                      />
                    )}
                    {/* KPI por provedor */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {selectedProviders.map((p, idx) => {
                        const color = ANATEL_SLOT_COLORS[idx];
                        const q = footprintQs[idx];
                        const data = q?.data ?? [];
                        return (
                          <div
                            key={p.cnpj}
                            className="bg-zinc-900 border border-zinc-800 rounded p-3"
                            style={{ borderLeft: `3px solid ${color}` }}
                          >
                            <div className="text-[11px] text-zinc-200 font-semibold truncate">{p.empresa}</div>
                            {q?.isLoading ? (
                              <div className="text-[11px] text-zinc-500 mt-1">Carregando…</div>
                            ) : q?.error ? (
                              <div className="text-[11px] text-red-400 mt-1">Erro ao carregar</div>
                            ) : (
                              <div className="flex gap-3 mt-1 text-[11px] text-zinc-400">
                                <span><b className="text-zinc-100">{data.length}</b> cidades</span>
                                <span><b className="text-zinc-100">{new Set(data.map((r) => r.estado)).size}</b> UFs</span>
                                <span style={{ color }}>
                                  <b>{new Intl.NumberFormat("pt-BR").format(data.reduce((s, r) => s + r.acessos_empresa, 0))}</b>
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <AnatelProviderMap
                      layers={selectedProviders.map((p, idx) => ({
                        id: p.cnpj,
                        empresa: p.empresa,
                        color: ANATEL_SLOT_COLORS[idx],
                        rows: footprintQs[idx]?.data ?? [],
                      }))}
                      marketCandidates={
                        hasMarketResult
                          ? (marketSearch.data?.providers ?? [])
                              .slice(0, 20)
                              .map<MarketCandidate>((p) => ({
                                cnpj: p.cnpj,
                                empresa: p.empresa,
                                lat: p.lat,
                                lng: p.lng,
                                score: p.score,
                                overlapCidades: p.overlapCidades,
                                cidades: p.cidades,
                                acessos: p.acessos,
                                distMinKm: p.distMinKm,
                              }))
                          : null
                      }
                      height="calc(100vh - 380px)"
                    />
                  </div>
                  <MarketRadiusPanel
                    buyerCount={buyerCnpjs.size}
                    hasProviders={selectedProviders.length > 0}
                    radiusKm={radiusKm}
                    onRadiusChange={setRadiusKm}
                    sameUfOnly={sameUfOnly}
                    onSameUfOnlyChange={setSameUfOnly}
                    onSearch={handleSearchMarket}
                    onClear={clearMarket}
                    isLoading={marketSearch.isPending}
                    result={
                      hasMarketResult
                        ? {
                            cells: marketSearch.data?.cells.length ?? 0,
                            providers: marketSearch.data?.providers ?? [],
                          }
                        : null
                    }
                    totalAcessos={marketSearch.data?.cells.reduce((s, c) => s + c.acessos_total, 0) ?? 0}
                    onAddProvider={(cnpj, empresa) =>
                      addProvider({ cnpj, empresa, acessos: 0 })
                    }
                    canAddMore={selectedProviders.length < MAX_ANATEL_SLOTS}
                    alreadySelected={new Set(selectedProviders.map((p) => p.cnpj))}
                  />
                </div>
              )}
            </div>
          )}

          {/* Botão flutuante para Grafo */}
          <Link
            to="/equity-brain/grafo"
            className="absolute bottom-6 left-6 z-[1000] flex items-center gap-2 px-4 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold text-sm shadow-lg shadow-emerald-900/40 transition-colors"
          >
            <Network className="h-4 w-4" />
            Trocar para Grafo →
          </Link>
        </div>

        {/* Sidebar filtros — só no Heatmap */}
        {mode === "heat" && (
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
        )}
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
