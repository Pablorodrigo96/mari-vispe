import { lazy, Suspense, useState } from "react";
import type { MandatePin } from "@/components/equity-brain/MandateMap";
import { MandateMap } from "@/components/equity-brain/MandateMap";
import { Toggle3D } from "@/components/equity-brain/map3d/Toggle3D";

const MandateMap3D = lazy(() => import("@/components/equity-brain/MandateMap3D"));

const STORAGE_KEY = "eb.mapa.mandates.mode";

interface Props {
  mandates: MandatePin[];
  height?: string;
}

export function MandateMapSwitcher({ mandates, height = "calc(100vh - 220px)" }: Props) {
  const [mode, setMode] = useState<"2d" | "3d">(() => {
    if (typeof window === "undefined") return "2d";
    return (localStorage.getItem(STORAGE_KEY) as "2d" | "3d") || "2d";
  });
  const [sharedView, setSharedView] = useState<{ center: [number, number]; zoom: number }>({
    center: [-51.9253, -14.235],
    zoom: 4,
  });

  function changeMode(next: "2d" | "3d") {
    setMode(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
  }

  return (
    <div className="relative w-full" style={{ height }}>
      {mode === "2d" ? (
        <div className="w-full h-full relative">
          <MandateMap
            mandates={mandates}
            height="100%"
            initialView={sharedView}
            onViewChange={setSharedView}
          />
          <Toggle3D mode="2d" onChange={changeMode} />
        </div>
      ) : (
        <Suspense
          fallback={
            <div className="w-full h-full flex items-center justify-center bg-zinc-950 border border-zinc-800 rounded text-zinc-500 text-xs font-mono uppercase tracking-wider">
              Carregando engine 3D…
            </div>
          }
        >
          <MandateMap3D
            mandates={mandates}
            initialView={sharedView}
            onViewChange={setSharedView}
            onMode2D={() => changeMode("2d")}
          />
        </Suspense>
      )}
    </div>
  );
}
