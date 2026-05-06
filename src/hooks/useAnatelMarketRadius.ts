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

export interface SelectedFootprint {
  cnpj: string;
  cities: Set<string>; // chave ibge:<code> ou nm:<cidade.lower()>|<uf>
  centroid: { lat: number; lng: number };
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
  overlapCidades: number;
  overlapPct: number;
  distMinKm: number;
  score: number;
  lat: number;
  lng: number;
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

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Resolve, no cliente, todos os códigos IBGE cuja cidade está dentro do raio
 *  de qualquer cidade-semente. Inclui as próprias sementes. */
export function citiesWithinRadius(seeds: SeedCity[], radiusKm: number): string[] {
  if (!seeds.length || radiusKm <= 0) return [];
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
  selectedFootprints?: SelectedFootprint[];
  excludeCnpjs?: string[];
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

      // Agrega por provedor: acessos, cidades atendidas (com chave + lat/lng/acessos para centroide)
      type Acc = {
        cnpj: string;
        empresa: string;
        acessos: number;
        cityKeys: Set<string>;
        sumLatW: number;
        sumLngW: number;
        sumW: number;
      };
      const provMap = new Map<string, Acc>();
      const excludeSet = new Set((input.excludeCnpjs ?? []).map((c) => c.replace(/\D/g, "")));

      for (const c of cells) {
        const cityKey = c.codigo_ibge_cidade
          ? `ibge:${c.codigo_ibge_cidade}`
          : `nm:${(c.cidade || "").toLowerCase()}|${c.estado}`;
        for (const p of c.providers) {
          const key = String(p.cnpj ?? "").replace(/\D/g, "");
          if (!key || excludeSet.has(key)) continue;
          const acessos = Number(p.acessos ?? 0);
          const cur = provMap.get(key) ?? {
            cnpj: key,
            empresa: p.empresa,
            acessos: 0,
            cityKeys: new Set<string>(),
            sumLatW: 0,
            sumLngW: 0,
            sumW: 0,
          };
          cur.acessos += acessos;
          cur.cityKeys.add(cityKey);
          const w = Math.max(acessos, 1);
          cur.sumLatW += c.lat * w;
          cur.sumLngW += c.lng * w;
          cur.sumW += w;
          provMap.set(key, cur);
        }
      }

      const footprints = input.selectedFootprints ?? [];
      const providers: MarketProvider[] = Array.from(provMap.values()).map((a) => {
        const lat = a.sumW ? a.sumLatW / a.sumW : 0;
        const lng = a.sumW ? a.sumLngW / a.sumW : 0;
        // overlap = união das cidades dos slots ∩ cidades do candidato
        let overlap = 0;
        for (const k of a.cityKeys) {
          for (const fp of footprints) {
            if (fp.cities.has(k)) { overlap++; break; }
          }
        }
        const cidades = a.cityKeys.size;
        const overlapPct = cidades ? overlap / cidades : 0;
        // distância ao slot mais próximo
        let distMin = Infinity;
        for (const fp of footprints) {
          const d = haversineKm(lat, lng, fp.centroid.lat, fp.centroid.lng);
          if (d < distMin) distMin = d;
        }
        if (!isFinite(distMin)) distMin = 0;
        const proximityScore = 1 - clamp01(distMin / Math.max(input.radiusKm, 1));
        const compScore = 1 - overlapPct;
        const score = Math.round((60 * compScore + 40 * proximityScore) * 100) / 100;
        return {
          cnpj: a.cnpj,
          empresa: a.empresa,
          acessos: a.acessos,
          cidades,
          overlapCidades: overlap,
          overlapPct,
          distMinKm: Math.round(distMin * 10) / 10,
          score,
          lat,
          lng,
        };
      });

      // Ordena por score desc; quando não há footprints, cai para acessos como antes
      if (footprints.length) {
        providers.sort((a, b) => b.score - a.score);
      } else {
        providers.sort((a, b) => b.acessos - a.acessos);
      }

      return { cells, providers, ibgesQueried: ibges.length };
    },
  });
}
