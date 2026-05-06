import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ibgeData from "@/data/ibgeMunicipios.json";

const ibgeMap = ibgeData as unknown as Record<string, [number, number]>;

export interface SeedCity {
  ibge: string;
  lat: number;
  lng: number;
  uf?: string;
}

export interface MarketCell {
  cidade: string;
  estado: string;
  codigo_ibge_cidade: string;
  lat: number;
  lng: number;
  acessos_total: number;
  n_provedores: number;
  top_empresa: string;
  top_cnpj: string;
  providers: { empresa: string; cnpj: string; acessos: number }[];
}

export interface MarketProvider {
  cnpj: string;
  empresa: string;
  acessos: number;
  cidades: number;
}

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Resolve, no cliente, todos os códigos IBGE cuja cidade está dentro do raio
 *  de qualquer cidade-semente. Inclui as próprias sementes. */
export function citiesWithinRadius(seeds: SeedCity[], radiusKm: number): string[] {
  if (!seeds.length || radiusKm <= 0) return [];
  // Bounding box rápido para evitar haversine em todos os 5570 sempre
  const out = new Set<string>();
  const padDeg = radiusKm / 111 + 0.1;
  for (const [code, [lat, lng]] of Object.entries(ibgeMap)) {
    let inside = false;
    for (const s of seeds) {
      if (Math.abs(lat - s.lat) > padDeg) continue;
      if (Math.abs(lng - s.lng) > padDeg) continue;
      if (haversineKm(lat, lng, s.lat, s.lng) <= radiusKm) {
        inside = true;
        break;
      }
    }
    if (inside) out.add(code);
  }
  return Array.from(out);
}

export interface MarketSearchInput {
  table: string;
  seeds: SeedCity[];
  radiusKm: number;
  sameUfOnly?: boolean;
}

export function useAnatelMarketRadius() {
  return useMutation({
    mutationFn: async (input: MarketSearchInput) => {
      const ibges = citiesWithinRadius(input.seeds, input.radiusKm);
      if (!ibges.length) return { cells: [] as MarketCell[], providers: [] as MarketProvider[], ibgesQueried: 0 };

      const uf = input.sameUfOnly && input.seeds[0]?.uf ? input.seeds[0].uf : null;
      const { data, error } = await supabase.functions.invoke("anatel-query", {
        body: {
          action: "companies_in_cities",
          params: { table: input.table, ibge_codes: ibges, uf },
        },
      });
      if (error) throw error;

      const rawCells: any[] = (data as any)?.rows ?? [];
      const cells: MarketCell[] = rawCells
        .map((r) => {
          const code = String(r.codigo_ibge_cidade ?? "");
          const coord = ibgeMap[code] || ibgeMap[code.slice(0, 7)] || ibgeMap[code.slice(0, 6)];
          if (!coord) return null;
          return {
            cidade: r.cidade,
            estado: String(r.estado ?? "").toUpperCase(),
            codigo_ibge_cidade: code,
            lat: coord[0],
            lng: coord[1],
            acessos_total: Number(r.acessos_total ?? 0),
            n_provedores: Number(r.n_provedores ?? 0),
            top_empresa: r.top_empresa ?? "—",
            top_cnpj: String(r.top_cnpj ?? "").replace(/\D/g, ""),
            providers: Array.isArray(r.providers) ? r.providers : [],
          } as MarketCell;
        })
        .filter(Boolean) as MarketCell[];

      // Agrega top providers
      const provMap = new Map<string, MarketProvider>();
      for (const c of cells) {
        for (const p of c.providers) {
          const key = String(p.cnpj ?? "").replace(/\D/g, "");
          if (!key) continue;
          const cur = provMap.get(key) ?? {
            cnpj: key,
            empresa: p.empresa,
            acessos: 0,
            cidades: 0,
          };
          cur.acessos += Number(p.acessos ?? 0);
          cur.cidades += 1;
          provMap.set(key, cur);
        }
      }
      const providers = Array.from(provMap.values()).sort((a, b) => b.acessos - a.acessos);

      return { cells, providers, ibgesQueried: ibges.length };
    },
  });
}
