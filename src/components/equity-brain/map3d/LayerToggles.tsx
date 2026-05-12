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

const ITEMS: { key: keyof LayerFlags; label: string; Icon: any }[] = [
  { key: "columns", label: "Colunas", Icon: Columns3 },
  { key: "hexagons", label: "Hexágonos", Icon: Hexagon },
  { key: "arcs", label: "Arcos", Icon: Spline },
];

export function LayerToggles({ flags, onChange }: Props) {
  return (
    <div className="absolute bottom-3 left-3 z-[600] flex flex-col gap-0.5 p-1 rounded-md bg-zinc-900/80 backdrop-blur-md border border-zinc-800 shadow-lg">
      <div className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 px-2 pt-1 pb-0.5">
        Camadas
      </div>
      {ITEMS.map(({ key, label, Icon }) => {
        const active = flags[key];
        return (
          <button
            key={key}
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
