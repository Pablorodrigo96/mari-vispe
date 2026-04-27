/**
 * Legenda flutuante (canto inferior direito) com node types e edge types.
 */

import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { NODE_COLORS, NODE_LABELS, EDGE_COLORS, EDGE_LABELS } from "@/lib/equityGraphScoring";
import { cn } from "@/lib/utils";

export function GraphLegend() {
  const [open, setOpen] = useState(false);

  return (
    <div className="absolute bottom-4 right-4 z-10 bg-zinc-950/95 border border-zinc-800 rounded-md backdrop-blur w-60">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-zinc-300 hover:text-emerald-300"
      >
        Legenda
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
      </button>

      {open && (
        <div className={cn("p-3 space-y-3 border-t border-zinc-800")}>
          <div>
            <div className="text-[9px] uppercase tracking-wider text-zinc-500 mb-1.5">Nodes</div>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(NODE_LABELS).map(([k, label]) => (
                <div key={k} className="flex items-center gap-1.5">
                  <div
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ background: NODE_COLORS[k], boxShadow: `0 0 6px ${NODE_COLORS[k]}` }}
                  />
                  <span className="text-[10px] text-zinc-400 truncate">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[9px] uppercase tracking-wider text-zinc-500 mb-1.5">Conexões</div>
            <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
              {Object.entries(EDGE_LABELS).map(([k, label]) => (
                <div key={k} className="flex items-center gap-1.5">
                  <div
                    className="h-0.5 w-4 rounded shrink-0"
                    style={{ background: EDGE_COLORS[k] }}
                  />
                  <span className="text-[10px] text-zinc-400 truncate">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-800 text-[9px] text-zinc-500 leading-relaxed">
            <div>• <b>Rede congelada</b>: nós ficam parados após o layout inicial</div>
            <div>• <b>Clique em um nó</b>: ativa modo foco — só conexões fortes daquele nó</div>
            <div>• <b>Hover</b>: acende a vizinhança sem selecionar</div>
            <div>• <b>Tamanho do nó</b>: score + nº de conexões fortes</div>
            <div>• <b>Halo</b>: hub de oportunidade</div>
          </div>
        </div>
      )}
    </div>
  );
}
