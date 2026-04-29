import { useState } from "react";
import { Check, X, Plus, Loader2, ListTodo } from "lucide-react";
import { useCrmTasks, useUpdateTaskStatus, useCreateTask } from "@/hooks/useCrmTasks";
import { InfoHint } from "@/components/equity-brain/InfoHint";
import { EB_TIPS } from "@/lib/ebTooltips";
import { cn } from "@/lib/utils";

export function TasksWidget({ entity_type, entity_id, compact }: { entity_type?: "mandate" | "buyer"; entity_id?: string; compact?: boolean }) {
  const { data, isLoading } = useCrmTasks(entity_type ? { entity_type, entity_id } : undefined);
  const updateStatus = useUpdateTaskStatus();
  const createTask = useCreateTask();
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const open = (data ?? []).filter(t => t.status === "open");

  const submit = () => {
    if (!newTitle.trim()) return;
    createTask.mutate({ title: newTitle.trim(), entity_type, entity_id, source: "manual" }, {
      onSuccess: () => { setNewTitle(""); setAdding(false); },
    });
  };

  return (
    <div className="bg-zinc-900/40 border border-zinc-800 rounded p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ListTodo className="h-4 w-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-zinc-100">Tarefas {compact ? "" : "abertas"}</h3>
          <span className="text-[10px] text-zinc-500">{open.length}</span>
          <InfoHint {...EB_TIPS.tarefas_abertas} />
        </div>
        <button
          onClick={() => setAdding(a => !a)}
          className="text-[11px] text-zinc-400 hover:text-zinc-100 inline-flex items-center gap-1"
        >
          <Plus className="h-3 w-3" /> Nova
        </button>
      </div>

      {adding && (
        <div className="flex items-center gap-2 mb-3">
          <input
            autoFocus
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === "Enter" && submit()}
            placeholder="Ex.: enviar infopack até sexta"
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-100 placeholder:text-zinc-600"
          />
          <button onClick={submit} className="text-[11px] px-2 py-1 rounded bg-emerald-600/20 text-emerald-300 border border-emerald-700/50">
            Salvar
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="text-xs text-zinc-500"><Loader2 className="h-3 w-3 animate-spin inline" /> carregando…</div>
      ) : open.length === 0 ? (
        <div className="text-xs text-zinc-500 italic">Nenhuma tarefa aberta.</div>
      ) : (
        <ul className="space-y-1">
          {open.slice(0, compact ? 5 : 12).map(t => (
            <li key={t.id} className="flex items-start gap-2 group">
              <button
                onClick={() => updateStatus.mutate({ id: t.id, status: "done" })}
                className="mt-0.5 h-4 w-4 rounded border border-zinc-700 hover:border-emerald-500 hover:bg-emerald-500/10 flex items-center justify-center"
                title="Concluir"
              >
                <Check className="h-3 w-3 opacity-0 group-hover:opacity-60 text-emerald-400" />
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-zinc-200 break-words">{t.title}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  {t.source === "ai" && <span className="text-[9px] uppercase px-1 py-0 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-700/40">Mari</span>}
                  {t.due_date && <span className="text-[10px] text-zinc-500">vence {new Date(t.due_date).toLocaleDateString("pt-BR")}</span>}
                  <span className={cn("text-[10px]", t.priority === "urgent" ? "text-rose-400" : t.priority === "high" ? "text-amber-400" : "text-zinc-500")}>
                    {t.priority}
                  </span>
                </div>
              </div>
              <button
                onClick={() => updateStatus.mutate({ id: t.id, status: "dismissed" })}
                className="opacity-0 group-hover:opacity-60 hover:text-rose-400"
                title="Descartar"
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
