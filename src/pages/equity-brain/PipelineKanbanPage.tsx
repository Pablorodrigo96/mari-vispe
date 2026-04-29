import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, GripVertical, Calendar, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { brl, PIPELINE_STAGES, PIPELINE_STAGE_LABEL, DEAL_TYPE_LABEL } from "@/lib/dealFormatters";
import { TemperatureBadge } from "@/components/equity-brain/crm/TemperatureBadge";
import { cn } from "@/lib/utils";

type Mandate = {
  id: string;
  company_cnpj: string;
  deal_type: string;
  pipeline_stage: string;
  outcome: string;
  valor_operacao: number | null;
  faturamento_vispe: number | null;
  uf: string | null;
  setor: string | null;
  contato_nome: string | null;
  responsavel_id: string | null;
  temperature: string | null;
  stage_changed_at: string | null;
  data_inicio: string | null;
};

const STAGE_COLORS: Record<string, string> = {
  match: "border-blue-500/40 bg-blue-500/5",
  nbo: "border-cyan-500/40 bg-cyan-500/5",
  due_diligence: "border-amber-500/40 bg-amber-500/5",
  spa: "border-purple-500/40 bg-purple-500/5",
  closing: "border-orange-500/40 bg-orange-500/5",
  closed: "border-emerald-500/40 bg-emerald-500/5",
};

export default function PipelineKanbanPage() {
  const qc = useQueryClient();
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const { data: mandates, isLoading } = useQuery({
    queryKey: ["pipeline-kanban"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eb_mandates" as any)
        .select("id,company_cnpj,deal_type,pipeline_stage,outcome,valor_operacao,faturamento_vispe,uf,setor,contato_nome,responsavel_id,temperature,stage_changed_at,data_inicio")
        .neq("outcome", "cancelado")
        .order("stage_changed_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as Mandate[];
    },
  });

  const move = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const { error } = await supabase
        .from("eb_mandates" as any)
        .update({ pipeline_stage: stage })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pipeline-kanban"] });
      toast.success("Estágio atualizado");
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao mover"),
  });

  const byStage: Record<string, Mandate[]> = {};
  PIPELINE_STAGES.forEach((s) => (byStage[s] = []));
  (mandates ?? []).forEach((m) => {
    const s = m.pipeline_stage || "match";
    (byStage[s] ?? (byStage[s] = [])).push(m);
  });

  return (
    <div className="p-6 space-y-4 bg-zinc-950 min-h-full">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <Link to="/equity-brain/crm" className="text-[11px] text-zinc-500 hover:text-zinc-300 inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> CRM
          </Link>
          <h1 className="text-2xl font-bold text-zinc-100 mt-1 tracking-tight">Pipeline M&amp;A</h1>
          <p className="text-xs text-zinc-400 mt-1 break-words">
            Arraste cards entre colunas para movimentar deals. Cada mudança vira atividade automática.
          </p>
        </div>
      </header>

      {isLoading ? (
        <div className="text-xs text-zinc-500 p-6">Carregando…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {PIPELINE_STAGES.map((stage) => {
            const items = byStage[stage] ?? [];
            const totalValue = items.reduce((s, m) => s + Number(m.valor_operacao ?? 0), 0);
            return (
              <div
                key={stage}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (draggedId) move.mutate({ id: draggedId, stage });
                  setDraggedId(null);
                }}
                className={cn(
                  "rounded-lg border p-2 min-h-[400px] flex flex-col",
                  STAGE_COLORS[stage],
                )}
              >
                <div className="flex items-center justify-between px-1 mb-2">
                  <div className="text-[11px] font-semibold uppercase text-zinc-200 tracking-wider">
                    {PIPELINE_STAGE_LABEL[stage]}
                  </div>
                  <span className="text-[10px] text-zinc-400 tabular-nums">{items.length}</span>
                </div>
                {totalValue > 0 && (
                  <div className="text-[10px] text-zinc-500 px-1 mb-2 tabular-nums break-words">
                    Σ {brl(totalValue, { compact: true })}
                  </div>
                )}
                <div className="flex-1 space-y-2 overflow-y-auto">
                  {items.map((m) => (
                    <DealCard key={m.id} m={m} onDragStart={() => setDraggedId(m.id)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DealCard({ m, onDragStart }: { m: Mandate; onDragStart: () => void }) {
  return (
    <Link
      to={`/equity-brain/crm/mandate/${m.id}`}
      draggable
      onDragStart={onDragStart}
      className="block rounded border border-zinc-800 bg-zinc-900/80 hover:border-zinc-700 p-2.5 cursor-move group"
    >
      <div className="flex items-start justify-between gap-1">
        <div className="text-[11px] text-zinc-100 font-medium leading-tight break-words flex-1 truncate">
          {m.company_cnpj}
        </div>
        <GripVertical className="h-3 w-3 text-zinc-700 group-hover:text-zinc-500 shrink-0 mt-0.5" />
      </div>
      <div className="flex items-center gap-1.5 mt-1.5">
        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
          {DEAL_TYPE_LABEL[m.deal_type] ?? m.deal_type}
        </span>
        {m.uf && <span className="text-[9px] text-zinc-500">{m.uf}</span>}
      </div>
      {m.contato_nome && (
        <div className="text-[10px] text-zinc-400 mt-1 truncate break-words">{m.contato_nome}</div>
      )}
      <div className="flex items-center justify-between mt-2">
        {m.valor_operacao ? (
          <div className="flex items-center gap-1 text-[10px] text-emerald-300 font-medium tabular-nums">
            <DollarSign className="h-2.5 w-2.5" />
            {brl(m.valor_operacao, { compact: true })}
          </div>
        ) : (
          <span className="text-[10px] text-zinc-600">sem valor</span>
        )}
        <TemperatureBadge entityType="mandate" entityId={m.id} initial={m.temperature as any} compact />
      </div>
    </Link>
  );
}
