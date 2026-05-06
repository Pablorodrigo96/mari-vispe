import { useEffect, useRef, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getCoordsByIbge } from "@/lib/ibgeCoordinates";
import { getCoordinates, stateCapitals } from "@/lib/brazilCoordinates";
import type { AnatelFootprintRow } from "@/hooks/useAnatelProvider";

interface Props {
  rows: AnatelFootprintRow[];
  height?: string;
  empresa?: string;
}

const VOLT = "#D9F564";

function fmt(n: number): string {
  return new Intl.NumberFormat("pt-BR").format(n);
}

type Resolved = AnatelFootprintRow & { lat: number; lng: number; approx: boolean };

function resolveRow(r: AnatelFootprintRow): Resolved | null {
  // 1. IBGE code (instant, accurate for all 5570+ municipalities)
  const ibge = getCoordsByIbge(r.codigo_ibge_cidade);
  if (ibge) return { ...r, ...ibge, approx: false };
  // 2. static dictionary (city name)
  const dict = getCoordinates(r.cidade, r.estado);
  if (dict) {
    const cap = stateCapitals[r.estado];
    const isCapitalFallback = !!cap && cap.lat === dict.lat && cap.lng === dict.lng;
    return { ...r, ...dict, approx: isCapitalFallback };
  }
  // 3. fallback to state capital
  const cap = stateCapitals[r.estado];
  if (cap) return { ...r, ...cap, approx: true };
  return null;
}

export function AnatelProviderMap({ rows, height = "70vh", empresa }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  const resolved = useMemo<Resolved[]>(() => {
    const out: Resolved[] = [];
    for (const r of rows) {
      const x = resolveRow(r);
      if (x) out.push(x);
    }
    return out;
  }, [rows]);

  // init map once
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

    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }
    if (!resolved.length) return;

    const group = L.layerGroup();
    const hub = resolved.reduce((acc, cur) =>
      cur.acessos_empresa > acc.acessos_empresa ? cur : acc, resolved[0]);

    resolved.forEach((p) => {
      if (p === hub) return;
      L.polyline(
        [[hub.lat, hub.lng], [p.lat, p.lng]],
        { color: VOLT, weight: 1.1, opacity: 0.4, dashArray: "4 5" },
      ).addTo(group);
    });

    const maxA = Math.max(...resolved.map((r) => r.acessos_empresa), 1);

    resolved.forEach((p) => {
      const isHub = p === hub;
      const radius = isHub
        ? 12
        : Math.max(4, Math.min(13, Math.log10(p.acessos_empresa + 10) * 3.5));
      const marker = L.circleMarker([p.lat, p.lng], {
        radius,
        color: isHub ? "#fafaf7" : VOLT,
        weight: isHub ? 2 : 1,
        fillColor: VOLT,
        fillOpacity: p.approx ? 0.35 : (isHub ? 0.95 : 0.7),
        dashArray: p.approx ? "2 3" : undefined,
      });
      const sharePart = p.share_pct != null
        ? `<div style="font-size:11px;color:#52525b">Share municipal: <b style="color:#0a0a0a">${p.share_pct}%</b> (rank ${p.rank_municipio} de ${p.n_provedores})</div>`
        : "";
      const approxPart = p.approx
        ? `<div style="font-size:10px;color:#b45309;margin-top:4px">⚠ localização aproximada (capital UF)</div>`
        : "";
      marker.bindPopup(`
        <div style="min-width:200px;font-family:inherit">
          <strong style="color:#0a0a0a;font-size:13px">${p.cidade}/${p.estado}${isHub ? " · sede" : ""}</strong>
          <div style="font-size:11px;color:#52525b;margin-top:4px">
            Acessos: <b style="color:#0a0a0a">${fmt(p.acessos_empresa)}</b>
            ${maxA ? ` (${Math.round((p.acessos_empresa / maxA) * 100)}% do pico)` : ""}
          </div>
          ${sharePart}
          ${approxPart}
        </div>
      `);
      marker.addTo(group);
    });

    group.addTo(map);
    layerRef.current = group;

    const bounds = L.latLngBounds(resolved.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 });
  }, [resolved]);

  const approxCount = resolved.filter((r) => r.approx).length;

  return (
    <div className="relative">
      <div ref={containerRef} style={{ height, width: "100%", borderRadius: 8 }} />
      {empresa && (
        <div className="absolute top-3 left-3 z-[500] bg-zinc-900/90 border border-zinc-700 px-3 py-1.5 rounded text-xs text-zinc-200 max-w-[60%] truncate">
          <span className="text-zinc-500">Provedor:</span>{" "}
          <span className="font-semibold text-[#D9F564]">{empresa}</span>
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
