import { Radio } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useVertical, VERTICAL_OPTIONS, type VerticalKey } from "@/hooks/useVertical";

/**
 * Dropdown no header do Equity Brain para escolher o vertical em foco.
 * Default no piloto: ISP/Telecom. A escolha persiste em localStorage e
 * dispara refetch automático nas páginas que usam `useVertical()`.
 */
export function VerticalSelector() {
  const { vertical, setVertical } = useVertical();

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
        Vertical
      </span>
      <Select value={vertical} onValueChange={(v) => setVertical(v as VerticalKey)}>
        <SelectTrigger
          className="h-8 w-[180px] bg-zinc-900 border-zinc-800 text-zinc-200 text-xs gap-2"
        >
          <Radio className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <SelectValue placeholder="Selecionar vertical" />
        </SelectTrigger>
        <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
          {VERTICAL_OPTIONS.map((opt) => (
            <SelectItem
              key={opt.value}
              value={opt.value}
              className="focus:bg-emerald-950/40 focus:text-emerald-300"
            >
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
