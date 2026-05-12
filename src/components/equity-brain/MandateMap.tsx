import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

export interface MandatePin {
  id: string;
  fase: string | null;
  pipeline_stage?: string | null;
  outcome?: string | null;
  company_cnpj: string | null;
  razao_social: string | null;
  municipio: string | null;
  uf: string | null;
  faturamento_estimado: number | null;
  latitude: number;
  longitude: number;
}

const PHASE_COLORS: Record<string, string> = {
  match: "#3b82f6",
  cold: "#94a3b8",
  nbo: "#f59e0b",
  spa: "#8b5cf6",
  closed: "#10b981",
  cancelado: "#ef4444",
};

function colorFor(m: MandatePin): string {
  if (m.outcome === "won" || m.outcome === "lost") return PHASE_COLORS.closed;
  return PHASE_COLORS[m.fase ?? ""] ?? "#71717a";
}

function makeIcon(color: string) {
  return L.divIcon({
    className: "mandate-marker",
    html: `<div style="background:${color};width:18px;height:18px;border-radius:50%;border:2px solid #fafaf7;box-shadow:0 2px 4px rgba(0,0,0,.5)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function fmtBRL(v: number | null): string {
  if (v == null) return "—";
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}MM`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}K`;
  return `R$ ${v}`;
}

interface Props {
  mandates: MandatePin[];
  height?: string;
  initialView?: { center: [number, number]; zoom: number };
  onViewChange?: (v: { center: [number, number]; zoom: number }) => void;
}

export function MandateMap({ mandates, height = "70vh", initialView, onViewChange }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<any>(null);
  const onViewChangeRef = useRef(onViewChange);
  onViewChangeRef.current = onViewChange;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const center: [number, number] = initialView
      ? [initialView.center[1], initialView.center[0]]
      : [-15.78, -47.93];
    const map = L.map(containerRef.current, {
      center,
      zoom: initialView?.zoom ?? 4,
      minZoom: 4,
      maxZoom: 16,
      preferCanvas: true,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "&copy; CARTO &copy; OSM",
      subdomains: "abcd",
    }).addTo(map);
    map.on("moveend", () => {
      const c = map.getCenter();
      onViewChangeRef.current?.({ center: [c.lng, c.lat], zoom: map.getZoom() });
    });
    mapRef.current = map;
    const t = setTimeout(() => map.invalidateSize(), 150);
    return () => {
      clearTimeout(t);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (clusterRef.current) {
      map.removeLayer(clusterRef.current);
      clusterRef.current = null;
    }
    if (!mandates.length) return;

    const cluster = (L as any).markerClusterGroup({
      chunkedLoading: true,
      showCoverageOnHover: false,
      maxClusterRadius: 40,
    });

    mandates.forEach((m) => {
      const marker = L.marker([m.latitude, m.longitude], { icon: makeIcon(colorFor(m)) });
      const html = `
        <div style="min-width:200px;font-family:inherit">
          <strong style="color:#0a0a0a;font-size:13px">${m.razao_social ?? "Empresa"}</strong>
          <div style="font-size:11px;color:#52525b;margin-top:4px">
            Fase: <span style="font-weight:600;color:#0a0a0a">${m.fase ?? "—"}</span>
          </div>
          <div style="font-size:11px;color:#52525b">Faturamento: ${fmtBRL(m.faturamento_estimado)}</div>
          <div style="font-size:11px;color:#52525b">${m.municipio ?? "—"}/${m.uf ?? "—"}</div>
          <a href="/equity-brain/crm/mandate/${m.id}"
             style="display:inline-block;margin-top:8px;font-size:11px;color:#16a34a;font-weight:600;text-decoration:none">
            Abrir mandato →
          </a>
        </div>`;
      marker.bindPopup(html);
      cluster.addLayer(marker);
    });

    map.addLayer(cluster);
    clusterRef.current = cluster;
  }, [mandates]);

  return (
    <div className="space-y-2">
      <div ref={containerRef} style={{ height, width: "100%", borderRadius: 8 }} />
      <div className="flex flex-wrap gap-3 text-[10px] text-zinc-400 px-1">
        {Object.entries(PHASE_COLORS).map(([phase, color]) => (
          <div key={phase} className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: color }} />
            {phase}
          </div>
        ))}
      </div>
    </div>
  );
}
