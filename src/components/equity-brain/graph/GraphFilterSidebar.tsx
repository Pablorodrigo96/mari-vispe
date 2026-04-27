/**
 * Sidebar esquerda de filtros do Grafo Estratégico.
 */

import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { EDGE_LAYERS, NODE_LABELS, NODE_COLORS, type LayerKey } from "@/lib/equityGraphScoring";
import { cn } from "@/lib/utils";

interface Props {
  collapsed: boolean;
  onToggleCollapse: () => void;

  verticals: string[];
  ufs: string[];
  thesesList: { thesis_key: string; display_name: string }[];
  buyersList: { id: string; nome: string }[];

  selectedVerticals: Set<string>;
  selectedUfs: Set<string>;
  selectedNodeTypes: Set<string>;
  enabledLayers: Set<LayerKey>;
  minWeight: number;
  minConfidence: number;
  thesisFilter: string | null;
  buyerFilter: string | null;

  onChange: (patch: Partial<{
    selectedVerticals: Set<string>;
    selectedUfs: Set<string>;
    selectedNodeTypes: Set<string>;
    enabledLayers: Set<LayerKey>;
    minWeight: number;
    minConfidence: number;
    thesisFilter: string | null;
    buyerFilter: string | null;
  }>) => void;
  onReset: () => void;
}

const ALL_NODE_TYPES = Object.keys(NODE_LABELS);
const ALL_LAYERS = Object.keys(EDGE_LAYERS) as LayerKey[];

function toggleSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export function GraphFilterSidebar(props: Props) {
  const {
    collapsed, onToggleCollapse,
    verticals, ufs, thesesList, buyersList,
    selectedVerticals, selectedUfs, selectedNodeTypes,
    enabledLayers, minWeight, minConfidence,
    thesisFilter, buyerFilter,
    onChange, onReset,
  } = props;

  if (collapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        className="absolute top-3 left-3 z-20 h-9 w-9 rounded-md bg-zinc-900/90 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-emerald-300 backdrop-blur"
        title="Mostrar filtros"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    );
  }

  return (
    <aside className="absolute top-0 left-0 h-full w-64 bg-zinc-950/95 border-r border-zinc-800 overflow-y-auto z-10 backdrop-blur">
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 sticky top-0 bg-zinc-950/95">
        <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-300">Filtros</span>
        <div className="flex items-center gap-1">
          <button
            onClick={onReset}
            title="Resetar"
            className="text-zinc-500 hover:text-rose-400 p-1"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onToggleCollapse}
            title="Recolher"
            className="text-zinc-500 hover:text-zinc-200 p-1"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="p-3 space-y-4">
        {/* LAYERS (atalhos) */}
        <Section title="🧬 Layers de Análise">
          <div className="space-y-1">
            {ALL_LAYERS.map((k) => {
              const layer = EDGE_LAYERS[k];
              const active = enabledLayers.has(k);
              return (
                <button
                  key={k}
                  onClick={() => onChange({ enabledLayers: toggleSet(enabledLayers, k) })}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 rounded text-[11px] transition-colors text-left",
                    active
                      ? "bg-emerald-950/50 text-emerald-300 border border-emerald-900/60"
                      : "text-zinc-500 hover:text-zinc-200 border border-transparent hover:bg-zinc-900",
                  )}
                >
                  <span>{layer.icon}</span>
                  <span className="flex-1">{layer.label}</span>
                </button>
              );
            })}
          </div>
        </Section>

        {/* TIPO DE NODE */}
        <Section title="Tipo de Node">
          <div className="grid grid-cols-2 gap-1">
            {ALL_NODE_TYPES.map((t) => {
              const active = selectedNodeTypes.has(t);
              return (
                <button
                  key={t}
                  onClick={() => onChange({ selectedNodeTypes: toggleSet(selectedNodeTypes, t) })}
                  className={cn(
                    "flex items-center gap-1.5 px-1.5 py-1 rounded text-[10px] transition-colors",
                    active ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900",
                  )}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full shrink-0"
                    style={{ background: NODE_COLORS[t] }}
                  />
                  <span className="truncate">{NODE_LABELS[t]}</span>
                </button>
              );
            })}
          </div>
        </Section>

        {/* PESO MÍNIMO */}
        <Section title={`Peso mínimo: ${(minWeight * 100).toFixed(0)}%`}>
          <Slider
            min={0} max={1} step={0.05}
            value={[minWeight]}
            onValueChange={([v]) => onChange({ minWeight: v })}
            className="mt-1"
          />
        </Section>

        {/* CONFIDENCE MÍNIMA */}
        <Section title={`Confidence mín.: ${(minConfidence * 100).toFixed(0)}%`}>
          <Slider
            min={0} max={1} step={0.05}
            value={[minConfidence]}
            onValueChange={([v]) => onChange({ minConfidence: v })}
            className="mt-1"
          />
        </Section>

        {/* VERTICAL */}
        {verticals.length > 0 && (
          <Section title={`Vertical (${selectedVerticals.size || "todas"})`}>
            <div className="flex flex-wrap gap-1">
              {verticals.map((v) => {
                const active = selectedVerticals.has(v);
                return (
                  <button
                    key={v}
                    onClick={() => onChange({ selectedVerticals: toggleSet(selectedVerticals, v) })}
                    className={cn(
                      "px-1.5 py-0.5 rounded text-[10px] transition-colors",
                      active
                        ? "bg-emerald-600 text-zinc-950 font-bold"
                        : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100",
                    )}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
          </Section>
        )}

        {/* UF */}
        {ufs.length > 0 && (
          <Section title={`UF (${selectedUfs.size || "todas"})`}>
            <div className="flex flex-wrap gap-1">
              {ufs.map((uf) => {
                const active = selectedUfs.has(uf);
                return (
                  <button
                    key={uf}
                    onClick={() => onChange({ selectedUfs: toggleSet(selectedUfs, uf) })}
                    className={cn(
                      "px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-colors",
                      active
                        ? "bg-emerald-600 text-zinc-950"
                        : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100",
                    )}
                  >
                    {uf}
                  </button>
                );
              })}
            </div>
          </Section>
        )}

        {/* TESE */}
        <Section title="Tese">
          <Select
            value={thesisFilter ?? "__all"}
            onValueChange={(v) => onChange({ thesisFilter: v === "__all" ? null : v })}
          >
            <SelectTrigger className="h-8 bg-zinc-900 border-zinc-800 text-zinc-200 text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800 max-h-60">
              <SelectItem value="__all">Todas as teses</SelectItem>
              {thesesList.map((t) => (
                <SelectItem key={t.thesis_key} value={t.thesis_key}>{t.display_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Section>

        {/* BUYER */}
        <Section title="Buyer">
          <Select
            value={buyerFilter ?? "__all"}
            onValueChange={(v) => onChange({ buyerFilter: v === "__all" ? null : v })}
          >
            <SelectTrigger className="h-8 bg-zinc-900 border-zinc-800 text-zinc-200 text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800 max-h-60">
              <SelectItem value="__all">Todos os buyers</SelectItem>
              {buyersList.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Section>
      </div>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider font-bold text-zinc-500 mb-1.5">
        {title}
      </div>
      {children}
    </div>
  );
}
