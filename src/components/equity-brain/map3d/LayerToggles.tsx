import { cn } from "@/lib/utils";
import { Columns3, Hexagon, Spline } from "lucide-react";

export interface LayerFlags {
  columns: boolean;
  hexagons: boolean;
  arcs: boolean;
}

interface Props {
  flags: LayerFlags;
  onChange: (next: LayerFlags) => void;
}

const ITEMS: { key: keyof LayerFlags; label: string; Icon: any; demo?: boolean }[] = [
  { key: "columns", label: "Colunas", Icon: Columns3 },
  { key: "hexagons", label: "Hexágonos", Icon: Hexagon },
  { key: "arcs", label: "Arcos (demo)", Icon: Spline, demo: true },
];

export function LayerToggles({ flags, onChange }: Props) {
  return (
    <div
      role="group"
      aria-label="Camadas do mapa 3D"
      className="absolute bottom-3 left-3 z-[600] flex flex-col gap-0.5 p-1 rounded-md bg-zinc-900/80 backdrop-blur-md border border-zinc-800 shadow-lg"
    >
      <div className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 px-2 pt-1 pb-0.5">
        Camadas
      </div>
      {ITEMS.map(({ key, label, Icon, demo }) => {
        const active = flags[key];
        return (
          <button
            key={key}
            type="button"
            aria-pressed={active}
            aria-label={`Camada ${label}`}
            title={demo ? "Visual de demonstração — sem dados reais ainda" : undefined}
            onClick={() => onChange({ ...flags, [key]: !active })}
            className={cn(
              "flex items-center gap-2 px-2 py-1 rounded text-[11px] font-mono transition-colors text-left",
              active
                ? "bg-[#D9F564]/15 text-[#D9F564]"
                : "text-zinc-400 hover:text-zinc-100",
            )}
          >
            <Icon className="h-3 w-3" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
