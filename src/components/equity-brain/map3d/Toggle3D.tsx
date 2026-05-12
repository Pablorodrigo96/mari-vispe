import { cn } from "@/lib/utils";

interface Props {
  mode: "2d" | "3d";
  onChange: (m: "2d" | "3d") => void;
}

export function Toggle3D({ mode, onChange }: Props) {
  return (
    <div
      role="group"
      aria-label="Alternar visualização 2D ou 3D"
      className="absolute top-3 right-3 z-[600] flex items-center gap-0.5 p-0.5 rounded-md bg-zinc-900/80 backdrop-blur-md border border-zinc-800 shadow-lg"
    >
      {(["2d", "3d"] as const).map((m) => {
        const active = mode === m;
        return (
          <button
            key={m}
            type="button"
            aria-pressed={active}
            aria-label={`Visualização ${m.toUpperCase()}`}
            onClick={() => onChange(m)}
            className={cn(
              "px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider rounded-sm transition-colors",
              active
                ? "bg-[#D9F564] text-zinc-900 font-semibold"
                : "text-zinc-400 hover:text-zinc-100",
            )}
          >
            {m}
          </button>
        );
      })}
    </div>
  );
}
