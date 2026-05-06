import type { AnatelFootprintRow } from "@/hooks/useAnatelProvider";
import { getCoordsByIbge } from "@/lib/ibgeCoordinates";
import { getCoordinates, stateCapitals } from "@/lib/brazilCoordinates";

export interface ProviderStats {
  totalAcessos: number;
  cities: Map<string, AnatelFootprintRow>; // key -> row
  ufs: Set<string>;
  centroid: { lat: number; lng: number } | null;
}

function cityKey(r: AnatelFootprintRow): string {
  if (r.codigo_ibge_cidade) return `ibge:${r.codigo_ibge_cidade}`;
  return `nm:${(r.cidade || "").toLowerCase()}|${r.estado}`;
}

function resolveCoord(r: AnatelFootprintRow): { lat: number; lng: number } | null {
  return (
    getCoordsByIbge(r.codigo_ibge_cidade) ??
    getCoordinates(r.cidade, r.estado) ??
    stateCapitals[r.estado] ??
    null
  );
}

export function computeProviderStats(rows: AnatelFootprintRow[]): ProviderStats {
  const cities = new Map<string, AnatelFootprintRow>();
  const ufs = new Set<string>();
  let totalAcessos = 0;
  let sumLat = 0;
  let sumLng = 0;
  let sumW = 0;
  for (const r of rows) {
    cities.set(cityKey(r), r);
    if (r.estado) ufs.add(r.estado);
    totalAcessos += r.acessos_empresa || 0;
    const c = resolveCoord(r);
    if (c) {
      const w = Math.max(1, r.acessos_empresa || 1);
      sumLat += c.lat * w;
      sumLng += c.lng * w;
      sumW += w;
    }
  }
  return {
    totalAcessos,
    cities,
    ufs,
    centroid: sumW > 0 ? { lat: sumLat / sumW, lng: sumLng / sumW } : null,
  };
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export type Tendency = "fusao" | "co-gestao" | "aquisicao";

export interface OverlapCity {
  cidade: string;
  uf: string;
  acessosA: number;
  acessosB: number;
}

export interface PairSynergy {
  aCnpj: string;
  bCnpj: string;
  aEmpresa: string;
  bEmpresa: string;
  aAcessos: number;
  bAcessos: number;
  overlapCount: number;
  overlapPctMinor: number; // % sobre o menor footprint (cidades)
  jaccard: number;
  distanceKm: number | null;
  synergyScore: number; // 0-100
  tendency: Tendency;
  buyerCnpj: string;
  sellerCnpj: string;
  buyerEmpresa: string;
  sellerEmpresa: string;
  buyerForced: boolean;
  headline: string;
  topOverlapCities: OverlapCity[];
}

export interface PairInput {
  cnpj: string;
  empresa: string;
  stats: ProviderStats;
}

function fmtAcessos(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

export function computePairSynergy(
  a: PairInput,
  b: PairInput,
  buyerCnpjs?: Set<string>,
): PairSynergy {
  const setA = a.stats.cities;
  const setB = b.stats.cities;
  let overlapCount = 0;
  const overlapKeys: string[] = [];
  for (const k of setA.keys()) {
    if (setB.has(k)) {
      overlapCount++;
      overlapKeys.push(k);
    }
  }
  const union = new Set<string>([...setA.keys(), ...setB.keys()]).size;
  const jaccard = union > 0 ? overlapCount / union : 0;
  const minor = Math.min(setA.size, setB.size);
  const overlapPctMinor = minor > 0 ? Math.round((overlapCount / minor) * 100) : 0;

  const distanceKm =
    a.stats.centroid && b.stats.centroid
      ? haversineKm(a.stats.centroid, b.stats.centroid)
      : null;

  const complementaridade = 1 - jaccard;
  const proximidade =
    distanceKm == null ? 0.5 : Math.max(0, Math.min(1, 1 - distanceKm / 1500));
  const synergyScore = Math.round(100 * (0.6 * complementaridade + 0.4 * proximidade));

  // Tendency by size ratio
  const aAcc = a.stats.totalAcessos;
  const bAcc = b.stats.totalAcessos;
  const major = Math.max(aAcc, bAcc);
  const minorAcc = Math.min(aAcc, bAcc);
  const ratio = major > 0 ? minorAcc / major : 0;

  let tendency: Tendency;
  if (ratio >= 0.7) tendency = "fusao";
  else if (ratio >= 0.4) tendency = "co-gestao";
  else tendency = "aquisicao";

  // Buyer/seller assignment
  let buyerCnpj: string;
  let sellerCnpj: string;
  let buyerForced = false;
  const aMarked = buyerCnpjs?.has(a.cnpj);
  const bMarked = buyerCnpjs?.has(b.cnpj);
  if (aMarked && !bMarked) {
    buyerCnpj = a.cnpj;
    sellerCnpj = b.cnpj;
    buyerForced = true;
  } else if (bMarked && !aMarked) {
    buyerCnpj = b.cnpj;
    sellerCnpj = a.cnpj;
    buyerForced = true;
  } else {
    // default: maior compra menor
    if (aAcc >= bAcc) {
      buyerCnpj = a.cnpj;
      sellerCnpj = b.cnpj;
    } else {
      buyerCnpj = b.cnpj;
      sellerCnpj = a.cnpj;
    }
  }
  const buyerEmpresa = buyerCnpj === a.cnpj ? a.empresa : b.empresa;
  const sellerEmpresa = sellerCnpj === a.cnpj ? a.empresa : b.empresa;

  // Top overlap cities (by acessos sum)
  const topOverlapCities: OverlapCity[] = overlapKeys
    .map((k) => {
      const ra = setA.get(k)!;
      const rb = setB.get(k)!;
      return {
        cidade: ra.cidade,
        uf: ra.estado,
        acessosA: ra.acessos_empresa,
        acessosB: rb.acessos_empresa,
      };
    })
    .sort((x, y) => y.acessosA + y.acessosB - (x.acessosA + x.acessosB))
    .slice(0, 5);

  // Headline
  const overlapWord =
    overlapPctMinor < 15 ? "baixo" : overlapPctMinor < 40 ? "moderado" : "alto";
  const synergyWord =
    synergyScore >= 70 ? "alta" : synergyScore >= 45 ? "média" : "baixa";
  const distStr = distanceKm == null ? "—" : `${Math.round(distanceKm)}km`;

  let headline: string;
  if (tendency === "fusao") {
    headline = `${a.empresa} (${fmtAcessos(aAcc)}) e ${b.empresa} (${fmtAcessos(bAcc)}) — tendência de fusão entre iguais. Overlap ${overlapWord} (${overlapPctMinor}%), distância ${distStr} → sinergia ${synergyWord} (${synergyScore}).`;
  } else if (tendency === "co-gestao") {
    headline = `${buyerEmpresa} (${fmtAcessos(buyerCnpj === a.cnpj ? aAcc : bAcc)}) e ${sellerEmpresa} (${fmtAcessos(sellerCnpj === a.cnpj ? aAcc : bAcc)}) — M&A com co-gestão. Overlap ${overlapWord} (${overlapPctMinor}%), ${distStr} → sinergia ${synergyWord} (${synergyScore}).`;
  } else {
    headline = `${buyerEmpresa} (${fmtAcessos(buyerCnpj === a.cnpj ? aAcc : bAcc)}) compra ${sellerEmpresa} (${fmtAcessos(sellerCnpj === a.cnpj ? aAcc : bAcc)}). Overlap ${overlapWord} (${overlapPctMinor}%), ${distStr} → sinergia ${synergyWord} (${synergyScore}).`;
  }
  if (buyerForced) headline = `${headline} (comprador marcado manualmente)`;

  return {
    aCnpj: a.cnpj,
    bCnpj: b.cnpj,
    aEmpresa: a.empresa,
    bEmpresa: b.empresa,
    aAcessos: aAcc,
    bAcessos: bAcc,
    overlapCount,
    overlapPctMinor,
    jaccard,
    distanceKm,
    synergyScore,
    tendency,
    buyerCnpj,
    sellerCnpj,
    buyerEmpresa,
    sellerEmpresa,
    buyerForced,
    headline,
    topOverlapCities,
  };
}
