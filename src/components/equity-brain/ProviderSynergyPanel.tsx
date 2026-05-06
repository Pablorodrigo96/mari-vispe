import { useMemo } from "react";
import type { AnatelFootprintRow } from "@/hooks/useAnatelProvider";
import {
  computePairSynergy,
  computeProviderStats,
  type PairInput,
  type Tendency,
} from "@/lib/anatelSynergy";

export interface SynergyProviderInput {
  cnpj: string;
  empresa: string;
  color: string;
  rows: AnatelFootprintRow[];
}

interface Props {
  providers: SynergyProviderInput[];
  buyerCnpjs: Set<string>;
}

const fmt = (n: number) => new Intl.NumberFormat("pt-BR").format(n);

const TENDENCY_BADGE: Record<Tendency, { label: string; cls: string }> = {
  fusao: {
    label: "Fusão entre iguais",
    cls: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  },
  "co-gestao": {
    label: "M&A com co-gestão",
    cls: "bg-sky-500/15 text-sky-300 border-sky-500/40",
  },
  aquisicao: {
    label: "Aquisição",
    cls: "bg-[#D9F564]/15 text-[#D9F564] border-[#D9F564]/40",
  },
};

export function ProviderSynergyPanel({ providers, buyerCnpjs }: Props) {
  const enriched = useMemo(
    () =>
      providers.map((p) => ({
        ...p,
        stats: computeProviderStats(p.rows),
      })),
    [providers],
  );

  const pairs = useMemo(() => {
    const out: ReturnType<typeof computePairSynergy>[] = [];
    for (let i = 0; i < enriched.length; i++) {
      for (let j = i + 1; j < enriched.length; j++) {
        const a: PairInput = enriched[i];
        const b: PairInput = enriched[j];
        out.push(computePairSynergy(a, b, buyerCnpjs));
      }
    }
    return out;
  }, [enriched, buyerCnpjs]);

  if (providers.length < 2) return null;

  return (
    <div className="space-y-3">
      {/* Cabeçalho lado a lado */}
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${enriched.length}, minmax(0,1fr))` }}
      >
        {enriched.map((p) => {
          const isBuyer = buyerCnpjs.has(p.cnpj);
          return (
            <div
              key={p.cnpj}
              className="bg-zinc-900 border border-zinc-800 rounded p-3"
              style={{ borderLeft: `3px solid ${p.color}` }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: p.color }}
                />
                <div className="text-[12px] text-zinc-100 font-semibold truncate">
                  {p.empresa}
                </div>
                {isBuyer && (
                  <span className="ml-auto text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#FB923C]/20 text-[#FB923C] border border-[#FB923C]/40">
                    comprador
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2 text-[10px] text-zinc-500 uppercase tracking-wider">
                <div>
                  <div>Acessos</div>
                  <div className="text-zinc-100 text-sm font-semibold normal-case tracking-normal">
                    {fmt(p.stats.totalAcessos)}
                  </div>
                </div>
                <div>
                  <div>Cidades</div>
                  <div className="text-zinc-100 text-sm font-semibold normal-case tracking-normal">
                    {p.stats.cities.size}
                  </div>
                </div>
                <div>
                  <div>UFs</div>
                  <div className="text-zinc-100 text-sm font-semibold normal-case tracking-normal">
                    {p.stats.ufs.size}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cards de pares */}
      <div className="space-y-3">
        {pairs.map((p) => {
          const tend = TENDENCY_BADGE[p.tendency];
          const a = enriched.find((x) => x.cnpj === p.aCnpj)!;
          const b = enriched.find((x) => x.cnpj === p.bCnpj)!;
          return (
            <div
              key={`${p.aCnpj}|${p.bCnpj}`}
              className="bg-zinc-900 border border-zinc-800 rounded p-3 space-y-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 text-[12px] text-zinc-100 font-semibold">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: a.color }}
                  />
                  {a.empresa}
                  <span className="text-zinc-500 mx-1">×</span>
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: b.color }}
                  />
                  {b.empresa}
                </div>
                <span
                  className={`ml-auto text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${tend.cls}`}
                >
                  {tend.label}
                </span>
              </div>

              <div className="text-[12px] text-zinc-300 leading-relaxed">
                {p.headline}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Metric
                  label="Sinergia"
                  value={`${p.synergyScore}/100`}
                  color={
                    p.synergyScore >= 70
                      ? "text-emerald-300"
                      : p.synergyScore >= 45
                        ? "text-amber-300"
                        : "text-rose-300"
                  }
                />
                <Metric
                  label="Overlap cidades"
                  value={`${p.overlapCount} (${p.overlapPctMinor}%)`}
                />
                <Metric
                  label="Distância centroides"
                  value={p.distanceKm == null ? "—" : `${Math.round(p.distanceKm)} km`}
                />
                <Metric
                  label="Comprador → Vendedor"
                  value={
                    p.tendency === "fusao"
                      ? "Fusão (iguais)"
                      : `${p.buyerEmpresa.slice(0, 14)} → ${p.sellerEmpresa.slice(0, 14)}`
                  }
                />
              </div>

              {p.topOverlapCities.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
                    Top cidades em comum
                  </div>
                  <div className="space-y-1">
                    {p.topOverlapCities.map((c, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-[11px] bg-zinc-950/40 border border-zinc-800/60 rounded px-2 py-1"
                      >
                        <div className="text-zinc-300 truncate">
                          {c.cidade}/{c.uf}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span style={{ color: a.color }}>
                            {fmt(c.acessosA)}
                          </span>
                          <span className="text-zinc-600">vs</span>
                          <span style={{ color: b.color }}>
                            {fmt(c.acessosB)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  color = "text-zinc-100",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="bg-zinc-950/40 border border-zinc-800/60 rounded px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      <div className={`text-[12px] font-semibold truncate ${color}`}>{value}</div>
    </div>
  );
}
