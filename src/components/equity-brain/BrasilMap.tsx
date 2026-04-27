import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  choroplethColor,
  tierFromScore,
  tierHslColor,
  formatNumber,
} from "@/lib/equityBrain";
import { loadBrazilStatesGeo } from "@/lib/brazilStatesGeo";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";

export interface BrasilMapFilters {
  ufs: string[];
  setores: string[];
  minScore: number;
  showBuyers: boolean;
}

interface BrasilMapProps {
  filters: BrasilMapFilters;
  onSelectCompany?: (cnpj: string) => void;
}

// Centroide aproximado por UF (fallback para flyTo, evita calcular do GeoJSON)
const UF_CENTROIDS: Record<string, [number, number]> = {
  AC: [-9.0, -70.0],  AL: [-9.6, -36.8],  AM: [-4.0, -63.0],  AP: [1.4, -51.8],
  BA: [-12.5, -41.7], CE: [-5.0, -39.5],  DF: [-15.78, -47.93],ES: [-19.5, -40.5],
  GO: [-15.9, -49.4], MA: [-5.0, -45.3],  MG: [-18.5, -44.0], MS: [-20.5, -54.5],
  MT: [-13.0, -55.5], PA: [-4.0, -53.0],  PB: [-7.2, -36.7],  PE: [-8.5, -37.5],
  PI: [-7.0, -42.5],  PR: [-24.5, -51.5], RJ: [-22.5, -42.8], RN: [-5.7, -36.5],
  RO: [-10.7, -63.0], RR: [2.0, -61.4],   RS: [-30.0, -53.5], SC: [-27.3, -50.0],
  SE: [-10.5, -37.5], SP: [-22.0, -48.5], TO: [-10.5, -48.0],
};

export function BrasilMap({ filters, onSelectCompany }: BrasilMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const choroLayerRef = useRef<L.GeoJSON | null>(null);
  const clusterLayerRef = useRef<any>(null);
  const pinLayerRef = useRef<L.LayerGroup | null>(null);
  const buyerLayerRef = useRef<L.LayerGroup | null>(null);

  const [zoom, setZoom] = useState(4);
  const [bounds, setBounds] = useState<L.LatLngBounds | null>(null);

  // ---- Inicializa mapa ----
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [-15.78, -47.93],
      zoom: 4,
      minZoom: 4,
      maxZoom: 14,
      zoomControl: true,
      preferCanvas: true,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "&copy; <a href='https://carto.com/'>CARTO</a>",
      subdomains: "abcd",
    }).addTo(map);

    map.on("zoomend", () => setZoom(map.getZoom()));
    map.on("moveend", () => setBounds(map.getBounds()));

    setBounds(map.getBounds());
    mapRef.current = map;

    const t = setTimeout(() => map.invalidateSize(), 150);
    return () => {
      clearTimeout(t);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ---- Queries ----
  const ufQ = useQuery({
    queryKey: ["eb", "map", "by-uf"],
    queryFn: async () => {
      const { data, error } = await supabase
        .schema("equity_brain" as any)
        .from("v_opportunities_by_uf" as any)
        .select("uf,total,premium_count,strong_count,avg_ma_score,top_setor");
      if (error) throw error;
      return data as Array<{
        uf: string;
        total: number;
        premium_count: number;
        strong_count: number;
        avg_ma_score: number;
        top_setor: string | null;
      }>;
    },
    staleTime: 60_000,
  });

  // Bounding box arredondada para estabilizar queryKey
  const roundedBounds = bounds
    ? {
        s: Math.floor(bounds.getSouth() * 10) / 10,
        n: Math.ceil(bounds.getNorth() * 10) / 10,
        w: Math.floor(bounds.getWest() * 10) / 10,
        e: Math.ceil(bounds.getEast() * 10) / 10,
      }
    : null;

  const muniQ = useQuery({
    enabled: zoom >= 6 && zoom < 9 && !!roundedBounds,
    queryKey: ["eb", "map", "muni", roundedBounds, filters.ufs, filters.minScore],
    queryFn: async () => {
      let q = supabase
        .schema("equity_brain" as any)
        .from("v_opportunities_by_municipio" as any)
        .select("uf,municipio,total,premium_count,avg_ma_score,lat_centroid,lng_centroid")
        .gte("lat_centroid", roundedBounds!.s)
        .lte("lat_centroid", roundedBounds!.n)
        .gte("lng_centroid", roundedBounds!.w)
        .lte("lng_centroid", roundedBounds!.e)
        .gte("avg_ma_score", filters.minScore || 0)
        .limit(2000);
      if (filters.ufs.length) q = q.in("uf", filters.ufs);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const pinQ = useQuery({
    enabled: zoom >= 9 && !!roundedBounds,
    queryKey: ["eb", "map", "pins", roundedBounds, filters.ufs, filters.setores, filters.minScore],
    queryFn: async () => {
      // Pegamos coords da tabela companies via join filtrando por bounds
      let q = supabase
        .schema("equity_brain" as any)
        .from("companies" as any)
        .select("cnpj,razao_social,nome_fantasia,uf,municipio,setor_ma,latitude,longitude")
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .gte("latitude", roundedBounds!.s)
        .lte("latitude", roundedBounds!.n)
        .gte("longitude", roundedBounds!.w)
        .lte("longitude", roundedBounds!.e)
        .limit(500);
      if (filters.ufs.length) q = q.in("uf", filters.ufs);
      if (filters.setores.length) q = q.in("setor_ma", filters.setores);
      const { data: companies, error } = await q;
      if (error) throw error;
      if (!companies?.length) return [];

      // Busca scores dos CNPJs visíveis
      const cnpjs = companies.map((c: any) => c.cnpj);
      const { data: scored } = await supabase
        .schema("equity_brain" as any)
        .from("companies_scored" as any)
        .select("cnpj,ma_score")
        .in("cnpj", cnpjs);
      const scoreMap = new Map<string, number>(
        (scored ?? []).map((r: any) => [r.cnpj, Number(r.ma_score ?? 0)]),
      );
      return companies
        .map((c: any) => ({
          ...c,
          ma_score: scoreMap.get(c.cnpj) ?? 0,
        }))
        .filter((c: any) => c.ma_score >= (filters.minScore || 0));
    },
  });

  const buyersQ = useQuery({
    enabled: filters.showBuyers && zoom >= 7,
    queryKey: ["eb", "map", "buyers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .schema("equity_brain" as any)
        .from("buyers" as any)
        .select("id,name,buyer_type,uf");
      if (error) throw error;
      return data as Array<{ id: string; name: string; buyer_type: string | null; uf: string | null }>;
    },
  });

  // ---- Render: choropleth UF (zoom 4-5) ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (choroLayerRef.current) {
      map.removeLayer(choroLayerRef.current);
      choroLayerRef.current = null;
    }
    if (zoom > 5 || !ufQ.data) return;

    let cancelled = false;
    loadBrazilStatesGeo()
      .then((geo) => {
        if (cancelled) return;
        const ufStats = new Map(ufQ.data!.map((r) => [r.uf, r]));

        const layer = L.geoJSON(geo as any, {
          style: (feature: any) => {
            const uf = feature.properties.sigla as string;
            const stats = ufStats.get(uf);
            const density = stats ? (stats.premium_count + stats.strong_count) / Math.max(stats.total, 1) : 0;
            return {
              fillColor: choroplethColor(density),
              fillOpacity: 0.7,
              color: "#3f3f46",
              weight: 1,
            };
          },
          onEachFeature: (feature: any, lyr: L.Layer) => {
            const uf = feature.properties.sigla as string;
            const stats = ufStats.get(uf);
            const tooltip = stats
              ? `<strong>${uf}</strong> — ${stats.premium_count} premium · ${stats.total} total<br/><span style="color:#a1a1aa">score médio ${formatNumber(stats.avg_ma_score)}${stats.top_setor ? ` · ${stats.top_setor}` : ""}</span>`
              : `<strong>${uf}</strong> — sem dados`;
            (lyr as L.Path).bindTooltip(tooltip, {
              sticky: true,
              direction: "top",
              className: "eb-tooltip",
            });
            lyr.on("mouseover", (e) => (e.target as L.Path).setStyle({ weight: 2, color: "#10b981" }));
            lyr.on("mouseout", (e) => layer.resetStyle(e.target));
            lyr.on("click", () => {
              const center = UF_CENTROIDS[uf];
              if (center) map.flyTo(center, 7, { duration: 0.8 });
            });
          },
        }).addTo(map);

        choroLayerRef.current = layer;
      })
      .catch(() => {
        /* falha silenciosa — fica só com tile */
      });

    return () => {
      cancelled = true;
    };
  }, [zoom, ufQ.data]);

  // ---- Render: clusters por município (zoom 6-8) ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (clusterLayerRef.current) {
      map.removeLayer(clusterLayerRef.current);
      clusterLayerRef.current = null;
    }
    if (zoom < 6 || zoom >= 9 || !muniQ.data) return;

    const cluster = (L as any).markerClusterGroup({
      maxClusterRadius: 50,
      showCoverageOnHover: false,
      iconCreateFunction: (c: any) => {
        const total = c
          .getAllChildMarkers()
          .reduce((sum: number, m: any) => sum + (m.options.eb_total ?? 1), 0);
        const px = total >= 100 ? 60 : total >= 20 ? 50 : 42;
        return L.divIcon({
          html: `<div style="background:hsl(160,84%,39%);color:#0f172a;width:${px}px;height:${px}px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;border:3px solid hsl(160,84%,55%);box-shadow:0 2px 12px rgba(0,0,0,0.5)">${formatNumber(total)}</div>`,
          className: "",
          iconSize: L.point(px, px),
        });
      },
    });

    muniQ.data.forEach((m: any) => {
      if (m.lat_centroid == null || m.lng_centroid == null) return;
      const marker = L.marker([Number(m.lat_centroid), Number(m.lng_centroid)], {
        icon: L.divIcon({
          html: `<div style="background:hsl(160,70%,38%);color:#fff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;border:2px solid hsl(160,84%,55%)">${m.total}</div>`,
          className: "",
          iconSize: L.point(28, 28),
        }),
      } as any);
      (marker as any).options.eb_total = m.total;
      marker.bindTooltip(
        `<strong>${m.municipio}/${m.uf}</strong> — ${m.total} oportunidades<br/><span style="color:#a1a1aa">${m.premium_count} premium · score ${formatNumber(m.avg_ma_score)}</span>`,
        { direction: "top" },
      );
      marker.on("click", () => map.flyTo([Number(m.lat_centroid), Number(m.lng_centroid)], 11, { duration: 0.6 }));
      cluster.addLayer(marker);
    });

    map.addLayer(cluster);
    clusterLayerRef.current = cluster;
  }, [zoom, muniQ.data]);

  // ---- Render: pins individuais (zoom 9+) ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (pinLayerRef.current) {
      map.removeLayer(pinLayerRef.current);
      pinLayerRef.current = null;
    }
    if (zoom < 9 || !pinQ.data) return;

    const group = L.layerGroup();
    pinQ.data.forEach((c: any) => {
      const tier = tierFromScore(c.ma_score);
      const color = tierHslColor(tier);
      const pulseClass = tier === "premium" ? "eb-pin-pulse" : "";
      const size = tier === "premium" ? 18 : 14;
      const marker = L.marker([Number(c.latitude), Number(c.longitude)], {
        icon: L.divIcon({
          html: `<div class="${pulseClass}" style="background:${color};width:${size}px;height:${size}px;border-radius:50%;border:2px solid rgba(255,255,255,0.85);box-shadow:0 0 0 2px ${color}55"></div>`,
          className: "",
          iconSize: L.point(size, size),
          iconAnchor: L.point(size / 2, size / 2),
        }),
      });
      marker.bindTooltip(
        `<strong>${c.razao_social ?? c.nome_fantasia ?? c.cnpj}</strong><br/><span style="color:#a1a1aa">${c.municipio ?? ""}/${c.uf ?? ""} · ${c.setor_ma ?? "—"} · score ${formatNumber(c.ma_score)}</span>`,
        { direction: "top" },
      );
      marker.on("click", () => onSelectCompany?.(c.cnpj));
      group.addLayer(marker);
    });

    group.addTo(map);
    pinLayerRef.current = group;
  }, [zoom, pinQ.data, onSelectCompany]);

  // ---- Render: buyers (toggle) ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (buyerLayerRef.current) {
      map.removeLayer(buyerLayerRef.current);
      buyerLayerRef.current = null;
    }
    if (!filters.showBuyers || zoom < 7 || !buyersQ.data) return;

    const group = L.layerGroup();
    buyersQ.data.forEach((b) => {
      const center = b.uf ? UF_CENTROIDS[b.uf] : null;
      if (!center) return;
      // jitter pequeno para evitar empilhamento
      const lat = center[0] + (Math.random() - 0.5) * 0.6;
      const lng = center[1] + (Math.random() - 0.5) * 0.6;
      const marker = L.marker([lat, lng], {
        icon: L.divIcon({
          html: `<div style="width:0;height:0;border-left:9px solid transparent;border-right:9px solid transparent;border-bottom:16px solid hsl(217,91%,60%);filter:drop-shadow(0 1px 3px rgba(0,0,0,0.6))"></div>`,
          className: "",
          iconSize: L.point(18, 16),
          iconAnchor: L.point(9, 8),
        }),
      });
      marker.bindTooltip(
        `<strong>${b.name}</strong><br/><span style="color:#93c5fd">Buyer · ${b.buyer_type ?? "—"}</span>`,
        { direction: "top" },
      );
      group.addLayer(marker);
    });

    group.addTo(map);
    buyerLayerRef.current = group;
  }, [filters.showBuyers, zoom, buyersQ.data]);

  const isLoading = ufQ.isLoading || (zoom >= 9 && pinQ.isLoading);

  return (
    <div className="relative w-full h-full">
      <style>{`
        .eb-tooltip {
          background: rgba(24,24,27,0.95) !important;
          color: #f4f4f5 !important;
          border: 1px solid #3f3f46 !important;
          border-radius: 6px !important;
          font-size: 12px !important;
          padding: 6px 9px !important;
          box-shadow: 0 4px 16px rgba(0,0,0,0.5) !important;
        }
        .eb-tooltip::before { display: none !important; }
        .leaflet-container { background: #0a0a0b !important; }
        @keyframes ebPinPulse {
          0%   { box-shadow: 0 0 0 0 rgba(16,185,129,0.7); }
          70%  { box-shadow: 0 0 0 14px rgba(16,185,129,0); }
          100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); }
        }
        .eb-pin-pulse { animation: ebPinPulse 2s infinite; }
      `}</style>

      <div ref={containerRef} className="w-full h-full" />

      {/* Legenda + indicador de zoom */}
      <div className="absolute top-3 right-3 z-[1000] bg-zinc-900/90 backdrop-blur border border-zinc-800 rounded-lg p-3 text-xs space-y-2 min-w-[180px]">
        <div className="text-zinc-400 text-[10px] uppercase tracking-wider font-bold">
          {zoom <= 5 ? "Visão Brasil" : zoom < 9 ? "Visão Regional" : "Empresas"}
        </div>
        {zoom >= 9 ? (
          <div className="space-y-1.5">
            <Legend color={tierHslColor("premium")} label="Premium (≥80)" />
            <Legend color={tierHslColor("strong")}  label="Strong (60-79)" />
            <Legend color={tierHslColor("standard")} label="Standard (<60)" />
          </div>
        ) : (
          <div className="space-y-1.5">
            <Legend color="hsl(160,84%,45%)" label="Alta densidade" />
            <Legend color="hsl(160,60%,30%)" label="Média densidade" />
            <Legend color="hsl(160,30%,16%)" label="Baixa densidade" />
          </div>
        )}
        {filters.showBuyers && (
          <div className="border-t border-zinc-800 pt-2">
            <Legend color="hsl(217,91%,60%)" label="Buyer (zoom ≥7)" shape="triangle" />
          </div>
        )}
      </div>

      {isLoading && (
        <div className="absolute bottom-4 left-4 z-[1000] bg-zinc-900/95 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-300 flex items-center gap-2">
          <div className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          Carregando dados…
        </div>
      )}
    </div>
  );
}

function Legend({ color, label, shape = "circle" }: { color: string; label: string; shape?: "circle" | "triangle" }) {
  return (
    <div className="flex items-center gap-2 text-zinc-300">
      {shape === "triangle" ? (
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: "6px solid transparent",
            borderRight: "6px solid transparent",
            borderBottom: `10px solid ${color}`,
          }}
        />
      ) : (
        <div className="w-3 h-3 rounded-full" style={{ background: color }} />
      )}
      <span>{label}</span>
    </div>
  );
}
