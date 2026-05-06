import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getCoordinatesAsync, type CityCoordinates } from "@/lib/brazilCoordinates";
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

export function AnatelProviderMap({ rows, height = "70vh", empresa }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const [resolving, setResolving] = useState(false);

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
    if (!rows.length) return;

    let cancelled = false;
    setResolving(true);

    (async () => {
      // resolve coords with cache + state capital fallback
      const resolved: Array<AnatelFootprintRow & CityCoordinates> = [];
      for (const r of rows) {
        const c = await getCoordinatesAsync(r.cidade, r.estado);
        if (c && !cancelled) {
          resolved.push({ ...r, ...c });
        }
        if (cancelled) return;
      }
      if (cancelled || !resolved.length) {
        setResolving(false);
        return;
      }

      const group = L.layerGroup();
      // hub = cidade com maior nº de acessos
      const hub = resolved.reduce((acc, cur) =>
        cur.acessos_empresa > acc.acessos_empresa ? cur : acc, resolved[0]);

      // polylines hub -> spokes
      resolved.forEach((p) => {
        if (p === hub) return;
        L.polyline(
          [[hub.lat, hub.lng], [p.lat, p.lng]],
          {
            color: VOLT,
            weight: 1.2,
            opacity: 0.45,
            dashArray: "4 5",
          }
        ).addTo(group);
      });

      const maxA = Math.max(...resolved.map((r) => r.acessos_empresa), 1);

      resolved.forEach((p) => {
        const isHub = p === hub;
        const radius = isHub ? 12 : Math.max(5, Math.min(13, Math.log10(p.acessos_empresa + 10) * 4));
        const marker = L.circleMarker([p.lat, p.lng], {
          radius,
          color: isHub ? "#fafaf7" : VOLT,
          weight: isHub ? 2 : 1,
          fillColor: VOLT,
          fillOpacity: isHub ? 0.95 : 0.7,
        });
        const sharePart = p.share_pct != null
          ? `<div style="font-size:11px;color:#52525b">Share municipal: <b style="color:#0a0a0a">${p.share_pct}%</b> (rank ${p.rank_municipio} de ${p.n_provedores})</div>`
          : "";
        marker.bindPopup(`
          <div style="min-width:200px;font-family:inherit">
            <strong style="color:#0a0a0a;font-size:13px">${p.cidade}/${p.estado}${isHub ? " · sede" : ""}</strong>
            <div style="font-size:11px;color:#52525b;margin-top:4px">
              Acessos: <b style="color:#0a0a0a">${fmt(p.acessos_empresa)}</b>
              ${maxA ? ` (${Math.round((p.acessos_empresa / maxA) * 100)}% do pico)` : ""}
            </div>
            ${sharePart}
          </div>
        `);
        marker.addTo(group);
      });

      group.addTo(map);
      layerRef.current = group;

      const bounds = L.latLngBounds(resolved.map((p) => [p.lat, p.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 });
      setResolving(false);
    })();

    return () => { cancelled = true; };
  }, [rows]);

  return (
    <div className="relative">
      <div ref={containerRef} style={{ height, width: "100%", borderRadius: 8 }} />
      {resolving && (
        <div className="absolute top-3 right-3 z-[500] bg-zinc-900/90 border border-zinc-700 px-3 py-1.5 rounded text-xs text-zinc-200">
          Geocodificando cidades…
        </div>
      )}
      {empresa && (
        <div className="absolute top-3 left-3 z-[500] bg-zinc-900/90 border border-zinc-700 px-3 py-1.5 rounded text-xs text-zinc-200 max-w-[60%] truncate">
          <span className="text-zinc-500">Provedor:</span>{" "}
          <span className="font-semibold text-[#D9F564]">{empresa}</span>
        </div>
      )}
    </div>
  );
}
