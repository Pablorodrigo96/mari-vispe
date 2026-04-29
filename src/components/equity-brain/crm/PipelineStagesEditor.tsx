import { useState } from "react";
import { X, Plus, GripVertical, Trash2, Check } from "lucide-react";
import {
  usePipelineStages,
  useUpsertPipelineStage,
  useArchivePipelineStage,
  useReorderPipelineStages,
  STAGE_COLOR_OPTIONS,
  STAGE_COLOR_CLASSES,
  type PipelineStage,
} from "@/hooks/usePipelineStages";
import { cn } from "@/lib/utils";

type Props = { onClose: () => void };

export function PipelineStagesEditor({ onClose }: Props) {
  const { data: stages = [] } = usePipelineStages();
  const upsert = useUpsertPipelineStage();
  const archive = useArchivePipelineStage();
  const reorder = useReorderPipelineStages();

  const [draftKey, setDraftKey] = useState("");
  const [draftLabel, setDraftLabel] = useState("");
  const [draftColor, setDraftColor] = useState("zinc");
  const [draftSla, setDraftSla] = useState(14);
  const [editing, setEditing] = useState<Record<string, Partial<PipelineStage>>>({});
  const [dragId, setDragId] = useState<string | null>(null);

  const ordered = [...stages].sort((a, b) => a.position - b.position);

  const handleAdd = () => {
    const key = draftKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
    if (!key || !draftLabel.trim()) return;
    upsert.mutate(
      {
        key,
        label: draftLabel.trim(),
        color: draftColor,
        sla_days: draftSla,
        position: (ordered[ordered.length - 1]?.position ?? 0) + 1,
      },
      {
        onSuccess: () => {
          setDraftKey("");
          setDraftLabel("");
          setDraftColor("zinc");
          setDraftSla(14);
        },
      },
    );
  };

  const inputCls = "w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-[11px] text-zinc-100 focus:border-[#D9F564] outline-none";

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      <div
        className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(820px,95vw)] max-h-[92vh] overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl p-4 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
          <div>
            <div className="text-sm font-semibold text-zinc-100">Configurar etapas do pipeline</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">
              Arraste pelo ícone para reordenar. SLA define quando a oportunidade vira "Congelada".
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-1.5">
          {ordered.map((s) => {
            const draft = editing[s.id] ?? {};
            const label = draft.label ?? s.label;
            const color = draft.color ?? s.color;
            const sla = draft.sla_days ?? s.sla_days;
            const isTerminal = draft.is_terminal ?? s.is_terminal;
            const isDirty = Object.keys(draft).length > 0;

            return (
              <div
                key={s.id}
                draggable
                onDragStart={() => setDragId(s.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (!dragId || dragId === s.id) return;
                  const ids = ordered.map((x) => x.id);
                  const fromIdx = ids.indexOf(dragId);
                  const toIdx = ids.indexOf(s.id);
                  ids.splice(toIdx, 0, ids.splice(fromIdx, 1)[0]);
                  reorder.mutate(ids);
                  setDragId(null);
                }}
                className={cn(
                  "flex items-center gap-2 border rounded p-2",
                  STAGE_COLOR_CLASSES[color] ?? STAGE_COLOR_CLASSES.zinc,
                )}
              >
                <GripVertical className="h-3.5 w-3.5 text-zinc-500 shrink-0 cursor-grab" />
                <code className="text-[10px] text-zinc-500 w-32 truncate">{s.key}</code>
                <input
                  className={cn(inputCls, "flex-1")}
                  value={label}
                  onChange={(e) => setEditing((m) => ({ ...m, [s.id]: { ...m[s.id], label: e.target.value } }))}
                />
                <select
                  className={cn(inputCls, "w-24")}
                  value={color}
                  onChange={(e) => setEditing((m) => ({ ...m, [s.id]: { ...m[s.id], color: e.target.value } }))}
                >
                  {STAGE_COLOR_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    className={cn(inputCls, "w-16")}
                    value={sla}
                    onChange={(e) =>
                      setEditing((m) => ({ ...m, [s.id]: { ...m[s.id], sla_days: Number(e.target.value) } }))
                    }
                  />
                  <span className="text-[9px] text-zinc-500">d SLA</span>
                </div>
                <label className="flex items-center gap-1 text-[10px] text-zinc-400">
                  <input
                    type="checkbox"
                    checked={isTerminal}
                    onChange={(e) => setEditing((m) => ({ ...m, [s.id]: { ...m[s.id], is_terminal: e.target.checked } }))}
                  />
                  final
                </label>
                {isDirty && (
                  <button
                    onClick={() => {
                      upsert.mutate(
                        { id: s.id, key: s.key, label, color, sla_days: sla, is_terminal: isTerminal, position: s.position },
                        { onSuccess: () => setEditing((m) => { const x = { ...m }; delete x[s.id]; return x; }) },
                      );
                    }}
                    title="Salvar"
                    className="text-emerald-400 hover:text-emerald-300"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={() => {
                    const others = ordered.filter((x) => x.id !== s.id);
                    if (others.length === 0) {
                      alert("Não é possível remover a única etapa.");
                      return;
                    }
                    const target = window.prompt(
                      `Mover mandatos de "${s.label}" para qual etapa?\n\nOpções: ${others.map((x) => x.key).join(", ")}\n\n(deixe vazio para não mover)`,
                      others[0].key,
                    );
                    if (target === null) return;
                    const exists = others.find((x) => x.key === target);
                    if (target && !exists) {
                      alert("Etapa de destino inválida.");
                      return;
                    }
                    if (!confirm(`Arquivar a etapa "${s.label}"?`)) return;
                    archive.mutate({ id: s.id, currentKey: s.key, migrateToKey: target || undefined });
                  }}
                  title="Arquivar etapa"
                  className="text-rose-400 hover:text-rose-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        <div className="border-t border-zinc-800 pt-3 space-y-2">
          <div className="text-[10px] uppercase text-[#D9F564] tracking-wider font-bold">Adicionar nova etapa</div>
          <div className="grid grid-cols-[140px_1fr_100px_80px_auto] gap-2 items-center">
            <input
              className={inputCls}
              placeholder="key (ex: loi)"
              value={draftKey}
              onChange={(e) => setDraftKey(e.target.value)}
            />
            <input
              className={inputCls}
              placeholder="Nome exibido"
              value={draftLabel}
              onChange={(e) => setDraftLabel(e.target.value)}
            />
            <select className={inputCls} value={draftColor} onChange={(e) => setDraftColor(e.target.value)}>
              {STAGE_COLOR_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              type="number"
              className={inputCls}
              value={draftSla}
              onChange={(e) => setDraftSla(Number(e.target.value))}
            />
            <button
              onClick={handleAdd}
              disabled={!draftKey || !draftLabel}
              className="text-[11px] px-3 py-1.5 rounded bg-[#D9F564] text-zinc-900 font-semibold hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1"
            >
              <Plus className="h-3 w-3" /> Adicionar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
