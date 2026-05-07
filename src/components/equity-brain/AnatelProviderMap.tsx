import { useEffect, useRef, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getCoordsByIbge } from "@/lib/ibgeCoordinates";
import { getCoordinates, stateCapitals } from "@/lib/brazilCoordinates";
import type { AnatelFootprintRow } from "@/hooks/useAnatelProvider";

export const ANATEL_SLOT_COLORS = ["#D9F564", "#60A5FA", "#F472B6"];
export const MAX_ANATEL_SLOTS = 3;
export const MARKET_CANDIDATE_COLOR = "#A78BFA";

export interface ProviderLayer {
  id: string;
  empresa: string;
  color: string;
  rows: AnatelFootprintRow[];
}

export interface MarketCandidate {
  cnpj: string;
  empresa: string;
  lat: number;
  lng: number;
  score: number;
  overlapCidades: number;
  cidades: number;
  acessos: number;
  distMinKm: number;
}

export interface BuyerSeedPoint {
  lat: number;
  lng: number;
  cidade: string;
  estado: string;
}

interface Props {
  layers: ProviderLayer[];
  marketCandidates?: MarketCandidate[] | null;
  buyerSeedPoints?: BuyerSeedPoint[] | null;
  height?: string;
}

function fmt(n: number): string {
  return new Intl.NumberFormat("pt-BR").format(n);
}

type Resolved = AnatelFootprintRow & { lat: number; lng: number; approx: boolean };

function resolveRow(r: AnatelFootprintRow): Resolved | null {
  const ibge = getCoordsByIbge(r.codigo_ibge_cidade);
  if (ibge) return { ...r, ...ibge, approx: false };
  const dict = getCoordinates(r.cidade, r.estado);
  if (dict) {
    const cap = stateCapitals[r.estado];
    const isCapitalFallback = !!cap && cap.lat === dict.lat && cap.lng === dict.lng;
    return { ...r, ...dict, approx: isCapitalFallback };
  }
  const cap = stateCapitals[r.estado];
  if (cap) return { ...r, ...cap, approx: true };
  return null;
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function AnatelProviderMap({ layers, marketCandidates, buyerSeedPoints, height = "70vh" }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  const resolvedLayers = useMemo(() => {
    return layers.map((layer) => {
      const resolved: Resolved[] = [];
      for (const r of layer.rows) {
        const x = resolveRow(r);
        if (x) resolved.push(x);
      }
      return { ...layer, resolved };
    });
  }, [layers]);

  // Cidades com sobreposição de rede (atendidas por 2+ provedores selecionados)
  const overlapInfo = useMemo(() => {
    const counts = new Map<string, number>();
    for (const layer of resolvedLayers) {
      const seenLayer = new Set<string>();
      for (const r of layer.resolved) {
        const k = r.codigo_ibge_cidade
          ? `ibge:${r.codigo_ibge_cidade}`
          : `nm:${(r.cidade || "").toLowerCase()}|${r.estado}`;
        if (seenLayer.has(k)) continue;
        seenLayer.add(k);
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
    }
    return counts;
  }, [resolvedLayers]);
  const OVERLAP_COLOR = "#EF4444";
  const cityKeyOf = (r: AnatelFootprintRow) =>
    r.codigo_ibge_cidade
      ? `ibge:${r.codigo_ibge_cidade}`
      : `nm:${(r.cidade || "").toLowerCase()}|${r.estado}`;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [-15.78, -47.93],
      zoom: 4,
      minZoom: 3,
      maxZoom: 16,
      preferCanvas: true,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "&copy; CARTO &copy; OSM",
      subdomains: "abcd",
    }).addTo(map);
    mapRef.current = map;
    const t = setTimeout(() => map.invalidateSize(), 150);
    return () => {
      clearTimeout(t);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (layerGroupRef.current) {
      map.removeLayer(layerGroupRef.current);
      layerGroupRef.current = null;
    }
    if (!resolvedLayers.length && !marketCandidates?.length) return;

    const group = L.layerGroup();
    const allPoints: [number, number][] = [];

    // Track collisions per (lat,lng) key across layers, for offset
    const cityCounts = new Map<string, number>();

    resolvedLayers.forEach((layer, layerIdx) => {
      const { resolved, color, empresa } = layer;
      if (!resolved.length) return;

      const hub = resolved.reduce((acc, cur) =>
        cur.acessos_empresa > acc.acessos_empresa ? cur : acc, resolved[0]);

      // Mesh k-NN within layer
      const k = resolved.length > 400 ? 2 : 3;
      const MAX_EDGE_KM = 600;
      const seen = new Set<string>();
      for (let i = 0; i < resolved.length; i++) {
        const a = resolved[i];
        const dists: { j: number; d: number }[] = [];
        for (let j = 0; j < resolved.length; j++) {
          if (i === j) continue;
          dists.push({ j, d: haversineKm(a, resolved[j]) });
        }
        dists.sort((x, y) => x.d - y.d);
        for (const { j, d } of dists.slice(0, k)) {
          if (d > MAX_EDGE_KM) continue;
          const key = i < j ? `${i}|${j}` : `${j}|${i}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const b = resolved[j];
          L.polyline(
            [[a.lat, a.lng], [b.lat, b.lng]],
            { color, weight: 0.8, opacity: 0.5, dashArray: "3 4" },
          ).addTo(group);
        }
      }

      const maxA = Math.max(...resolved.map((r) => r.acessos_empresa), 1);

      resolved.forEach((p) => {
        const cityKey = `${p.lat.toFixed(3)}|${p.lng.toFixed(3)}`;
        const collisionIdx = cityCounts.get(cityKey) ?? 0;
        cityCounts.set(cityKey, collisionIdx + 1);
        // Offset radial em graus (~0.04° ≈ ~4km) para não sobrepor
        const offsetDeg = 0.04;
        const angle = (collisionIdx * 2 * Math.PI) / 3; // 3 slots
        const olat = p.lat + (collisionIdx > 0 ? offsetDeg * Math.sin(angle) : 0);
        const olng = p.lng + (collisionIdx > 0 ? offsetDeg * Math.cos(angle) : 0);

        const isHub = p === hub;
        const overlapN = overlapInfo.get(cityKeyOf(p)) ?? 0;
        const isOverlap = overlapN >= 2;
        const radius = isHub
          ? 12
          : Math.max(4, Math.min(13, Math.log10(p.acessos_empresa + 10) * 3.5));
        const strokeColor = isOverlap ? OVERLAP_COLOR : isHub ? "#fafaf7" : color;
        const fillCol = isOverlap ? OVERLAP_COLOR : color;
        const marker = L.circleMarker([olat, olng], {
          radius,
          color: strokeColor,
          weight: isOverlap ? 2 : isHub ? 2 : 1,
          fillColor: fillCol,
          fillOpacity: p.approx ? 0.35 : isOverlap ? 0.85 : (isHub ? 0.95 : 0.7),
          dashArray: p.approx ? "2 3" : undefined,
        });
        const sharePart = p.share_pct != null
          ? `<div style="font-size:11px;color:#52525b">Share municipal: <b style="color:#0a0a0a">${p.share_pct}%</b> (rank ${p.rank_municipio} de ${p.n_provedores})</div>`
          : "";
        const approxPart = p.approx
          ? `<div style="font-size:10px;color:#b45309;margin-top:4px">⚠ localização aproximada (capital UF)</div>`
          : "";
        const overlapPart = isOverlap
          ? `<div style="font-size:11px;color:#b91c1c;margin-top:4px;font-weight:600">⚠ Sobreposição: cidade atendida por ${overlapN} provedores selecionados</div>`
          : "";
        marker.bindPopup(`
          <div style="min-width:220px;font-family:inherit">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
              <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color}"></span>
              <strong style="color:#0a0a0a;font-size:12px">${empresa}</strong>
            </div>
            <div style="color:#0a0a0a;font-size:13px;font-weight:600">${p.cidade}/${p.estado}${isHub ? " · sede" : ""}</div>
            <div style="font-size:11px;color:#52525b;margin-top:4px">
              Acessos: <b style="color:#0a0a0a">${fmt(p.acessos_empresa)}</b>
              ${maxA ? ` (${Math.round((p.acessos_empresa / maxA) * 100)}% do pico)` : ""}
            </div>
            ${sharePart}
            ${overlapPart}
            ${approxPart}
          </div>
        `);
        marker.addTo(group);
        allPoints.push([olat, olng]);
      });
    });

    // ---- Cidades-semente do comprador (anéis laranja pontilhados) ----
    if (buyerSeedPoints && buyerSeedPoints.length && marketCandidates && marketCandidates.length) {
      const SEED_COLOR = "#FB923C";
      for (const s of buyerSeedPoints) {
        if (!isFinite(s.lat) || !isFinite(s.lng)) continue;
        const ring = L.circleMarker([s.lat, s.lng], {
          radius: 7,
          color: SEED_COLOR,
          weight: 2,
          fillColor: SEED_COLOR,
          fillOpacity: 0,
          dashArray: "3 3",
        });
        ring.bindTooltip(
          `<div style="font-size:11px"><b>${s.cidade}/${s.estado}</b><br/>Cidade-semente — comprador atende aqui</div>`,
          { direction: "top" },
        );
        ring.addTo(group);
        allPoints.push([s.lat, s.lng]);
      }
    }

    // ---- Candidatos complementares (cor distinta, sem círculo de raio) ----
    if (marketCandidates && marketCandidates.length) {
      for (const c of marketCandidates) {
        if (!isFinite(c.lat) || !isFinite(c.lng) || (c.lat === 0 && c.lng === 0)) continue;
        const r = Math.max(5, Math.min(14, 5 + (c.score / 100) * 9));
        const m = L.circleMarker([c.lat, c.lng], {
          radius: r,
          color: MARKET_CANDIDATE_COLOR,
          weight: 2,
          fillColor: MARKET_CANDIDATE_COLOR,
          fillOpacity: 0.7,
        });
        m.bindPopup(`
          <div style="min-width:220px;font-family:inherit">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
              <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${MARKET_CANDIDATE_COLOR}"></span>
              <strong style="color:#0a0a0a;font-size:12px">Candidato complementar</strong>
            </div>
            <div style="color:#0a0a0a;font-size:13px;font-weight:600">${c.empresa}</div>
            <div style="font-size:11px;color:#52525b;margin-top:4px">
              Score: <b style="color:#0a0a0a">${c.score.toFixed(0)}</b> ·
              Overlap: <b style="color:#0a0a0a">${c.overlapCidades}/${c.cidades}</b> cid.
            </div>
            <div style="font-size:11px;color:#52525b;margin-top:2px">
              Distância: <b style="color:#0a0a0a">~${c.distMinKm.toFixed(0)} km</b> ·
              <b style="color:#0a0a0a">${fmt(c.acessos)}</b> acessos
            </div>
          </div>
        `);
        m.addTo(group);
        allPoints.push([c.lat, c.lng]);
      }
    }

    group.addTo(map);
    layerGroupRef.current = group;

    if (allPoints.length) {
      const bounds = L.latLngBounds(allPoints);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 });
    }
  }, [resolvedLayers, marketCandidates, buyerSeedPoints, overlapInfo]);

  const approxCount = resolvedLayers.reduce(
    (acc, l) => acc + l.resolved.filter((r) => r.approx).length, 0,
  );

  return (
    <div className="relative">
      <div ref={containerRef} style={{ height, width: "100%", borderRadius: 8 }} />
      {(resolvedLayers.length > 0 || (marketCandidates?.length ?? 0) > 0) && (
        <div className="absolute top-3 right-3 z-[500] bg-zinc-900/90 border border-zinc-700 rounded p-2 space-y-1 max-w-[280px]">
          {resolvedLayers.map((l) => (
            <div key={l.id} className="flex items-center gap-2 text-[11px] text-zinc-200">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: l.color }}
              />
              <span className="font-semibold truncate">{l.empresa}</span>
              <span className="text-zinc-500 shrink-0 ml-auto">{l.resolved.length} cid.</span>
            </div>
          ))}
          {marketCandidates && marketCandidates.length > 0 && (
            <div className="flex items-center gap-2 text-[11px] text-zinc-200 border-t border-zinc-700/60 pt-1 mt-1">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: MARKET_CANDIDATE_COLOR }}
              />
              <span className="font-semibold truncate">Candidatos complementares</span>
              <span className="text-zinc-500 shrink-0 ml-auto">{marketCandidates.length}</span>
            </div>
          )}
        </div>
      )}
      {approxCount > 0 && (
        <div className="absolute bottom-3 right-3 z-[500] bg-zinc-900/90 border border-zinc-700 px-2 py-1 rounded text-[10px] text-amber-400">
          {approxCount} cidade{approxCount > 1 ? "s" : ""} sem código IBGE (localização aproximada)
        </div>
      )}
    </div>
  );
}
