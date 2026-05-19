import { Check, Circle, Lock, MinusCircle } from "lucide-react";
import { useStageTasks, useToggleStageTask, type StageTask } from "@/hooks/useStageTasks";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Props {
  dealId: string;
  stageKey: string;
  compact?: boolean;
}

const STATUS_LABEL: Record<StageTask["status"], string> = {
  pending: "Pendente",
  done: "Concluída",
  skipped: "Dispensada",
  na: "N/A",
};

export function StageTasksChecklist({ dealId, stageKey, compact }: Props) {
  const { data: tasks, isLoading } = useStageTasks(dealId, stageKey);
  const toggle = useToggleStageTask(dealId);

  if (isLoading) return <div className="text-xs text-muted-foreground">Carregando tarefas…</div>;
  if (!tasks || tasks.length === 0) {
    return <div className="text-xs text-muted-foreground">Nenhuma tarefa configurada para esta etapa.</div>;
  }

  return (
    <ul className={cn("space-y-1.5", compact && "space-y-1")}>
      {tasks.map((t) => {
        const isDone = t.status === "done";
        const Icon = isDone ? Check : t.status === "skipped" || t.status === "na" ? MinusCircle : Circle;
        return (
          <li
            key={t.id}
            className={cn(
              "flex items-start gap-2 rounded-md px-2 py-1.5 transition-colors",
              "hover:bg-white/5",
              isDone && "opacity-60",
            )}
          >
            <button
              type="button"
              onClick={() =>
                toggle.mutate({ task: t, status: isDone ? "pending" : "done" })
              }
              disabled={toggle.isPending}
              className={cn(
                "mt-0.5 size-4 rounded-full border flex items-center justify-center shrink-0",
                isDone
                  ? "bg-[#D9F564] border-[#D9F564] text-black"
                  : "border-white/30 text-transparent hover:border-[#D9F564]/70",
              )}
              aria-label={isDone ? "Desmarcar tarefa" : "Marcar tarefa como concluída"}
            >
              <Icon className="size-3" strokeWidth={3} />
            </button>
            <div className="flex-1 min-w-0">
              <div className={cn("text-sm break-words", isDone && "line-through")}>
                {t.label}
                {t.is_blocking && !isDone && (
                  <span title="Tarefa bloqueante — impede avançar de etapa" className="ml-1 inline-flex">
                    <Lock className="inline size-3 text-amber-400/80" />
                  </span>
                )}
              </div>
              {!compact && (
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {STATUS_LABEL[t.status]}
                  {!isDone && t.status === "pending" && (
                    <>
                      {" · "}
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-[10px] text-muted-foreground hover:text-foreground"
                        onClick={() => toggle.mutate({ task: t, status: "na" })}
                      >
                        marcar N/A
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
