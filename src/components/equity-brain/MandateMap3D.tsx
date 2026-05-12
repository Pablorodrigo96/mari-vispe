import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import DeckGL from "@deck.gl/react";
// @ts-ignore - react-map-gl v8 ships maplibre subpath
import { Map as MapLibreMap } from "react-map-gl/maplibre";
import { ScatterplotLayer, ColumnLayer, ArcLayer } from "@deck.gl/layers";
import { HexagonLayer } from "@deck.gl/aggregation-layers";
import { _GlobeView as GlobeView, MapView, FlyToInterpolator } from "@deck.gl/core";
import "maplibre-gl/dist/maplibre-gl.css";
import type { MandatePin } from "@/components/equity-brain/MandateMap";
import { colorByPhase, VOLT_RGB } from "./map3d/colors";
import { Toggle3D } from "./map3d/Toggle3D";
import { LayerToggles, type LayerFlags } from "./map3d/LayerToggles";
import { useIsMobile } from "@/hooks/use-mobile";
import { stateCapitals } from "@/lib/brazilCoordinates";

const CARTO_DARK = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

interface ViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
  transitionDuration?: number;
  transitionInterpolator?: any;
}

interface Props {
  mandates: MandatePin[];
  initialView?: { center: [number, number]; zoom: number };
  onViewChange?: (v: { center: [number, number]; zoom: number }) => void;
  onMode2D: () => void;
}

interface UFCluster {
  uf: string;
  longitude: number;
  latitude: number;
  count: number;
  topPhase: string | null;
}

function aggregateByUF(mandates: MandatePin[]): UFCluster[] {
  const map = new Map<string, { n: number; phases: Record<string, number> }>();
  for (const m of mandates) {
    const uf = (m.uf || "").toUpperCase();
    if (!uf) continue;
    const cur = map.get(uf) ?? { n: 0, phases: {} };
    cur.n += 1;
    if (m.fase) cur.phases[m.fase] = (cur.phases[m.fase] ?? 0) + 1;
    map.set(uf, cur);
  }
  const out: UFCluster[] = [];
  for (const [uf, v] of map.entries()) {
    const cap = stateCapitals[uf];
    if (!cap) continue; // sem capital conhecida, ignora
    const topPhase =
      Object.entries(v.phases).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    out.push({ uf, longitude: cap.lng, latitude: cap.lat, count: v.n, topPhase });
  }
  return out;
}

export default function MandateMap3D({
  mandates,
  initialView,
  onViewChange,
  onMode2D,
}: Props) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const flownRef = useRef(false);
  const pulseRef = useRef(1);

  const basePitch = isMobile ? 30 : 45;

  const [viewState, setViewState] = useState<ViewState>(() => ({
    longitude: initialView?.center[0] ?? -51.9253,
    latitude: initialView?.center[1] ?? -14.235,
    zoom: initialView?.zoom ?? 4,
    pitch: basePitch,
    bearing: 0,
  }));

  const [flags, setFlags] = useState<LayerFlags>({
    columns: true,
    hexagons: false,
    arcs: false,
  });

  // Tick para forçar re-render de updateTriggers (NÃO recria o array de layers).
  const [pulseTick, setPulseTick] = useState(0);

  // Views memoizados — evita recriar WebGL context.
  const mapView = useMemo(() => new MapView({ id: "map" }), []);
  const globeView = useMemo(() => new GlobeView({ id: "globe" }), []);

  // Flyto cinematográfico no primeiro acesso da sessão.
  useEffect(() => {
    if (flownRef.current) return;
    if (sessionStorage.getItem("eb.mapa.3d.flown") === "1") {
      flownRef.current = true;
      return;
    }
    flownRef.current = true;
    sessionStorage.setItem("eb.mapa.3d.flown", "1");
    setViewState((v) => ({ ...v, zoom: 2, pitch: 0 }));
    const t = setTimeout(() => {
      setViewState((v) => ({
        ...v,
        longitude: -51.9253,
        latitude: -14.235,
        zoom: 4,
        pitch: basePitch,
        bearing: 0,
        transitionDuration: 2500,
        transitionInterpolator: new FlyToInterpolator(),
      }));
    }, 50);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pulsação: atualiza ref + tick leve (apenas ColumnLayer reage via updateTriggers).
  useEffect(() => {
    if (isMobile) return;
    let phase = 0;
    const id = setInterval(() => {
      phase = (phase + 0.08) % (2 * Math.PI);
      pulseRef.current = 0.7 + 0.3 * Math.sin(phase);
      setPulseTick((t) => (t + 1) % 1_000_000);
    }, 80);
    return () => clearInterval(id);
  }, [isMobile]);

  const clusters = useMemo(() => aggregateByUF(mandates), [mandates]);

  const usesGlobe = !isMobile && viewState.zoom <= 2.5;
  const minZoom = isMobile ? 3 : 2;

  const layers = useMemo(() => {
    const arr: any[] = [];

    if (flags.columns) {
      arr.push(
        new ColumnLayer<UFCluster>({
          id: "mandate-columns",
          data: clusters,
          diskResolution: 16,
          radius: 35000,
          extruded: true,
          pickable: true,
          elevationScale: 800,
          getPosition: (d) => [d.longitude, d.latitude],
          getElevation: (d) => d.count,
          getFillColor: (d) => {
            const c = colorByPhase(d.topPhase, 220);
            const hot = d.topPhase === "match" || d.topPhase === "nbo";
            if (hot && !isMobile) {
              return [c[0], c[1], c[2], Math.floor(c[3] * pulseRef.current)];
            }
            return c;
          },
          updateTriggers: {
            getFillColor: [pulseTick, isMobile],
          },
          material: { ambient: 0.6, diffuse: 0.6, shininess: 32, specularColor: [60, 64, 70] },
        }),
      );
    }

    if (flags.hexagons) {
      arr.push(
        new HexagonLayer<MandatePin>({
          id: "mandate-hex",
          data: mandates,
          pickable: false,
          extruded: true,
          radius: 50000,
          elevationScale: 200,
          getPosition: (d) => [d.longitude, d.latitude],
          colorRange: [
            [40, 40, 40],
            [80, 100, 30],
            [130, 170, 40],
            [180, 220, 60],
            [200, 240, 70],
            [217, 245, 100],
          ],
          opacity: 0.55,
        }),
      );
    }

    arr.push(
      new ScatterplotLayer<MandatePin>({
        id: "mandate-points",
        data: mandates,
        pickable: true,
        opacity: 0.9,
        filled: true,
        radiusMinPixels: 3,
        radiusMaxPixels: 12,
        getPosition: (d) => [d.longitude, d.latitude],
        getFillColor: (d) => colorByPhase(d.fase, 230),
        getRadius: 6,
        onClick: ({ object }) => {
          if (object?.id) navigate(`/equity-brain/crm/mandate/${object.id}`);
        },
      }),
    );

    if (flags.arcs) {
      const top = [...clusters].sort((a, b) => b.count - a.count).slice(0, 5);
      const arcs: { from: [number, number]; to: [number, number] }[] = [];
      for (let i = 0; i < top.length; i++) {
        for (let j = i + 1; j < top.length; j++) {
          arcs.push({
            from: [top[i].longitude, top[i].latitude],
            to: [top[j].longitude, top[j].latitude],
          });
        }
      }
      arr.push(
        new ArcLayer({
          id: "mandate-arcs",
          data: arcs,
          pickable: false,
          getSourcePosition: (d: any) => d.from,
          getTargetPosition: (d: any) => d.to,
          getSourceColor: [...VOLT_RGB, 180] as any,
          getTargetColor: [0, 153, 255, 180],
          getWidth: 2,
          getHeight: 0.5,
        }),
      );
    }

    return arr;
    // Note: pulseTick is in updateTriggers, not array deps — só recria quando flags/clusters/mandates mudam.
  }, [flags, clusters, mandates, isMobile, navigate, pulseTick]);

  const getTooltip = ({ object, layer }: any) => {
    if (!object) return null;
    if (layer?.id === "mandate-columns") {
      const c = object as UFCluster;
      return {
        html: `<div style="font-family:ui-monospace,monospace;font-size:11px;line-height:1.5">
          <div style="color:#D9F564;font-weight:700;letter-spacing:.05em">${c.uf}</div>
          <div style="color:#a1a1aa">MANDATOS&nbsp;&nbsp;<b style="color:#fafafa">${c.count}</b></div>
          ${c.topPhase ? `<div style="color:#a1a1aa">FASE DOMINANTE&nbsp;&nbsp;<b style="color:#fafafa">${c.topPhase}</b></div>` : ""}
        </div>`,
        style: {
          background: "rgba(24,24,27,0.95)",
          border: "1px solid #3f3f46",
          borderRadius: "6px",
          padding: "8px 10px",
          color: "#fafafa",
        },
      };
    }
    if (layer?.id === "mandate-points") {
      const m = object as MandatePin;
      return {
        html: `<div style="font-family:ui-monospace,monospace;font-size:11px;line-height:1.5">
          <div style="color:#fafafa;font-weight:600">${m.razao_social ?? "Empresa"}</div>
          <div style="color:#a1a1aa">${m.municipio ?? "—"} · ${m.uf ?? "—"}</div>
          <div style="color:#a1a1aa">Fase: <b style="color:#D9F564">${m.fase ?? "—"}</b></div>
        </div>`,
        style: {
          background: "rgba(24,24,27,0.95)",
          border: "1px solid #3f3f46",
          borderRadius: "6px",
          padding: "8px 10px",
        },
      };
    }
    return null;
  };

  return (
    <div className="relative w-full h-full">
      <DeckGL
        views={(usesGlobe ? globeView : mapView) as any}
        viewState={{ ...viewState, minZoom, maxZoom: 18 } as any}
        controller={true}
        onViewStateChange={({ viewState: vs }: any) => {
          // Descarta campos de transição para não "grudar" o flyto.
          const {
            transitionDuration: _td,
            transitionInterpolator: _ti,
            transitionEasing: _te,
            transitionInterruption: _tn,
            ...clean
          } = vs;
          setViewState(clean as ViewState);
          onViewChange?.({ center: [clean.longitude, clean.latitude], zoom: clean.zoom });
        }}
        layers={layers}
        getTooltip={getTooltip}
      >
        {!usesGlobe && (
          <MapLibreMap reuseMaps mapStyle={CARTO_DARK} attributionControl={false} />
        )}
      </DeckGL>

      <Toggle3D mode="3d" onChange={(m) => m === "2d" && onMode2D()} />
      <LayerToggles flags={flags} onChange={setFlags} />

      {/* Legenda compacta (esconde no mobile pra não colidir com LayerToggles) */}
      {!isMobile && (
        <div className="absolute bottom-3 right-3 z-[600] flex flex-wrap gap-2 p-2 rounded-md bg-zinc-900/80 backdrop-blur-md border border-zinc-800 text-[10px] text-zinc-400 font-mono uppercase">
          {(["match", "cold", "nbo", "spa", "closed", "cancelado"] as const).map((p) => {
            const c = colorByPhase(p, 255);
            return (
              <div key={p} className="flex items-center gap-1">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ background: `rgb(${c[0]},${c[1]},${c[2]})` }}
                />
                {p}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
