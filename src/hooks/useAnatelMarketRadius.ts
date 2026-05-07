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
  /** Pontos das cidades atendidas pelo comprador — usados como sementes individuais para distância. */
  cityPoints: { key: string; lat: number; lng: number; cidade?: string; estado?: string }[];
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

// Big telcos a serem excluídas dos candidatos M&A (raiz CNPJ — 8 primeiros dígitos)
const BIG_TELCO_CNPJ_ROOTS = new Set<string>([
  "02558157", // Telefônica Brasil (Vivo)
  "76535764", // Claro
  "33530486", // Embratel
  "02421421", // TIM
  "33000118", // Oi (Telemar)
  "05423963", // Oi Móvel
  "40432544", // Telemar Norte Leste
]);

const BIG_TELCO_NAME_PATTERNS: RegExp[] = [
  /\bvivo\b/i,
  /telef[oô]nica/i,
  /\bclaro\b\s*s\.?\s*a/i,
  /^\s*claro\s/i,
  /embratel/i,
  /\btim\s*(s\.?a|brasil|celular)?/i,
  /\boi\s+(s\.?a|m[oó]vel|fixa)/i,
  /telemar/i,
];

const MIN_ACESSOS_CANDIDATE = 1000;

function isBigTelco(empresa: string, cnpj: string): boolean {
  const root = (cnpj || "").replace(/\D/g, "").slice(0, 8);
  if (root && BIG_TELCO_CNPJ_ROOTS.has(root)) return true;
  const name = String(empresa || "");
  return BIG_TELCO_NAME_PATTERNS.some((re) => re.test(name));
}

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
        // cidades do candidato dentro da área de busca, com lat/lng e acessos por cidade
        cityCells: { key: string; lat: number; lng: number; acessos: number; cidade: string; estado: string }[];
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
            cityCells: [],
          };
          cur.acessos += acessos;
          if (!cur.cityKeys.has(cityKey)) {
            cur.cityKeys.add(cityKey);
            cur.cityCells.push({
              key: cityKey,
              lat: c.lat,
              lng: c.lng,
              acessos,
              cidade: c.cidade,
              estado: c.estado,
            });
          } else {
            // soma acessos na cidade existente
            const existing = cur.cityCells.find((cc) => cc.key === cityKey);
            if (existing) existing.acessos += acessos;
          }
          provMap.set(key, cur);
        }
      }

      const footprints = input.selectedFootprints ?? [];
      // União dos pontos-semente (cidades do comprador)
      const seedPoints: { lat: number; lng: number }[] = [];
      for (const fp of footprints) {
        for (const cp of fp.cityPoints) seedPoints.push({ lat: cp.lat, lng: cp.lng });
      }

      const providers: MarketProvider[] = Array.from(provMap.values())
        .filter((a) => a.acessos >= MIN_ACESSOS_CANDIDATE && !isBigTelco(a.empresa, a.cnpj))
        .map((a) => {
        // Âncora do pino: cidade do candidato com mais acessos dentro da área
        const anchor = a.cityCells.reduce(
          (best, cur) => (cur.acessos > best.acessos ? cur : best),
          a.cityCells[0],
        );
        const lat = anchor?.lat ?? 0;
        const lng = anchor?.lng ?? 0;

        // overlap = nº de cidades do candidato que também são cidades de algum slot
        let overlap = 0;
        for (const k of a.cityKeys) {
          for (const fp of footprints) {
            if (fp.cities.has(k)) { overlap++; break; }
          }
        }
        const cidades = a.cityKeys.size;
        const overlapPct = cidades ? overlap / cidades : 0;

        // distância: min entre QUALQUER cidade do candidato e QUALQUER cidade-semente
        let distMin = Infinity;
        if (seedPoints.length && a.cityCells.length) {
          for (const cc of a.cityCells) {
            for (const sp of seedPoints) {
              const d = haversineKm(cc.lat, cc.lng, sp.lat, sp.lng);
              if (d < distMin) distMin = d;
              if (distMin === 0) break;
            }
            if (distMin === 0) break;
          }
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
