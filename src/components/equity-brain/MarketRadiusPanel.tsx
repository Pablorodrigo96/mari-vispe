import { useState } from "react";
import { Search, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { MarketProvider } from "@/hooks/useAnatelMarketRadius";

interface Props {
  buyerCount: number;
  hasProviders: boolean;
  radiusKm: number;
  onRadiusChange: (km: number) => void;
  sameUfOnly: boolean;
  onSameUfOnlyChange: (v: boolean) => void;
  onSearch: () => void;
  onClear: () => void;
  isLoading: boolean;
  result: { cells: number; providers: MarketProvider[] } | null;
  totalAcessos: number;
  onAddProvider: (cnpj: string, empresa: string) => void;
  canAddMore: boolean;
  alreadySelected: Set<string>;
}

function fmt(n: number): string {
  return new Intl.NumberFormat("pt-BR").format(n);
}

export function MarketRadiusPanel({
  buyerCount,
  hasProviders,
  radiusKm,
  onRadiusChange,
  sameUfOnly,
  onSameUfOnlyChange,
  onSearch,
  onClear,
  isLoading,
  result,
  totalAcessos,
  onAddProvider,
  canAddMore,
  alreadySelected,
}: Props) {
  const [showAll, setShowAll] = useState(false);
  const disabled = !hasProviders;
  const top = result?.providers ?? [];
  const visible = showAll ? top.slice(0, 50) : top.slice(0, 20);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">
          Buscar empresas no raio
        </div>
        <div className="text-[10px] text-zinc-500 text-right max-w-[55%]">
          {!hasProviders
            ? "Selecione ao menos 1 provedor"
            : buyerCount === 0
              ? "Sem 🎯 marcado: usando todos os slots como semente"
              : `${buyerCount} comprador${buyerCount > 1 ? "es" : ""} marcado${buyerCount > 1 ? "s" : ""}`}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between text-[11px] text-zinc-300 mb-1">
          <span>Raio de busca</span>
          <span className="font-bold text-[#FB923C]">{radiusKm} km</span>
        </div>
        <Slider
          min={10}
          max={500}
          step={5}
          value={[radiusKm]}
          onValueChange={(v) => onRadiusChange(v[0])}
          disabled={disabled}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="same-uf" className="text-[11px] text-zinc-400 cursor-pointer">
          Apenas mesma UF do comprador
        </Label>
        <Switch
          id="same-uf"
          checked={sameUfOnly}
          onCheckedChange={onSameUfOnlyChange}
          disabled={disabled}
        />
      </div>

      <div className="flex gap-2">
        <Button
          onClick={onSearch}
          disabled={disabled || isLoading}
          size="sm"
          className="flex-1 bg-[#FB923C] hover:bg-[#F97316] text-zinc-950 font-semibold"
        >
          {isLoading ? (
            <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Buscando…</>
          ) : (
            <><Search className="h-3.5 w-3.5 mr-1.5" /> Buscar empresas no raio</>
          )}
        </Button>
        {result && (
          <Button onClick={onClear} size="sm" variant="outline" className="bg-transparent border-zinc-700 text-zinc-300">
            Limpar
          </Button>
        )}
      </div>

      {result && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-zinc-950/60 border border-[#FB923C]/40 rounded p-2">
              <div className="text-[10px] text-zinc-500 uppercase">Provedores</div>
              <div className="text-lg font-bold text-[#FB923C]">{top.length}</div>
            </div>
            <div className="bg-zinc-950/60 border border-zinc-800 rounded p-2">
              <div className="text-[10px] text-zinc-500 uppercase">Cidades</div>
              <div className="text-lg font-bold text-zinc-100">{result.cells}</div>
            </div>
            <div className="bg-zinc-950/60 border border-zinc-800 rounded p-2">
              <div className="text-[10px] text-zinc-500 uppercase">Acessos</div>
              <div className="text-lg font-bold text-zinc-100">{fmt(totalAcessos)}</div>
            </div>
          </div>

          {top.length > 0 && (
            <div>
              <div className="text-[11px] text-zinc-400 font-semibold mb-1.5">
                Top {visible.length} provedores na região
              </div>
              <div className="max-h-72 overflow-auto space-y-1 pr-1">
                {visible.map((p, i) => {
                  const isSel = alreadySelected.has(p.cnpj);
                  return (
                    <div
                      key={p.cnpj}
                      className="flex items-center gap-2 px-2 py-1.5 bg-zinc-950/60 border border-zinc-800 rounded text-[11px]"
                    >
                      <span className="text-zinc-500 w-5 shrink-0">{i + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-zinc-100 font-medium truncate">{p.empresa}</div>
                        <div className="text-[10px] text-zinc-500">
                          {p.cidades} cid. · {fmt(p.acessos)} acessos
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-[10px] hover:bg-[#D9F564]/10 hover:text-[#D9F564]"
                        disabled={isSel || !canAddMore}
                        onClick={() => onAddProvider(p.cnpj, p.empresa)}
                        title={isSel ? "Já está nos slots" : !canAddMore ? "Limite de 3 slots" : "Adicionar como camada"}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
              {top.length > visible.length && !showAll && (
                <button
                  onClick={() => setShowAll(true)}
                  className="text-[11px] text-zinc-500 hover:text-zinc-200 mt-2"
                >
                  Mostrar até 50 →
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
