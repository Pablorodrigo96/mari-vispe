import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useDealDrawer } from "@/contexts/DealDrawerContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, GripVertical, DollarSign, Pencil, FolderOpen, FileSignature, Settings2, Snowflake, History, RotateCcw, FileText } from "lucide-react";
import { toast } from "sonner";
import { brl, DEAL_TYPE_LABEL } from "@/lib/dealFormatters";
import { TemperatureBadge } from "@/components/equity-brain/crm/TemperatureBadge";
import { QuickEditPopover } from "@/components/equity-brain/crm/QuickEditPopover";
import { PipelineStagesEditor } from "@/components/equity-brain/crm/PipelineStagesEditor";
import { StageTimeBadge, getStageTimeState } from "@/components/equity-brain/crm/StageTimeBadge";
import { usePipelineStages, STAGE_COLOR_CLASSES } from "@/hooks/usePipelineStages";
import { InfoHint } from "@/components/equity-brain/InfoHint";
import { PageHeaderHint } from "@/components/ui/PageHeaderHint";
import { cn } from "@/lib/utils";
import { logAuditEvent } from "@/services/audit/auditService";
import { canAdvanceStage, useDealStageProgress } from "@/hooks/useStageTasks";
import { useDealDocProgress } from "@/hooks/useDealDocuments";
import { useUserRoles } from "@/hooks/useUserRoles";
import { CheckSquare } from "lucide-react";

type Mandate = {
  id: string;
  company_cnpj: string;
  display_name: string | null;
  codename: string | null;
  razao_social: string | null;
  deal_type: string;
  deal_kind: string | null;
  deal_origin: string | null;
  deal_confidence: string | null;
  needs_enrichment: boolean | null;
  pipeline_stage: string;
  outcome: string;
  valor_operacao: number | null;
  faturamento_vispe: number | null;
  commission_pct: number | null;
  uf: string | null;
  regiao: string | null;
  contato_nome: string | null;
  contato_telefone: string | null;
  responsavel_id: string | null;
  temperature: string | null;
  stage_changed_at: string | null;
  data_inicio: string | null;
  data_fechamento: string | null;
  data_assinatura: string | null;
  comprador_cnpj: string | null;
  comprador_nome: string | null;
  drive_url: string | null;
  contract_url: string | null;
};

const DEAL_KIND_LABEL: Record<string, string> = {
  mandato_assinado: "Mandato",
  vendedor_sem_mandato: "Sem mandato",
  marketplace_listing: "Marketplace",
  buyer_mandate: "Buyer",
  prospeccao: "Prospecção",
};

const DEAL_KIND_COLOR: Record<string, string> = {
  mandato_assinado: "bg-emerald-500/15 text-emerald-300 border-emerald-700/40",
  vendedor_sem_mandato: "bg-amber-500/15 text-amber-300 border-amber-700/40",
  marketplace_listing: "bg-blue-500/15 text-blue-300 border-blue-700/40",
  buyer_mandate: "bg-purple-500/15 text-purple-300 border-purple-700/40",
  prospeccao: "bg-zinc-500/15 text-zinc-300 border-zinc-700/40",
};

export default function PipelineKanbanPage() {
  const qc = useQueryClient();
  const { isAdmin, canEditEB, isReadOnly } = useUserRoles();
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Mandate | null>(null);
  const [stagesOpen, setStagesOpen] = useState(false);
  const [onlyFrozen, setOnlyFrozen] = useState(false);

  const [kindFilter, setKindFilter] = useState<string>("real");

  const { data: stages = [] } = usePipelineStages();

  const { data: mandates, isLoading } = useQuery({
    queryKey: ["pipeline-kanban-v2"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eb_mandates_enriched" as any)
        .select("id,company_cnpj,display_name,codename,razao_social,deal_type,deal_kind,deal_origin,deal_confidence,needs_enrichment,pipeline_stage,outcome,valor_operacao,faturamento_vispe,commission_pct,uf,regiao,contato_nome,contato_telefone,responsavel_id,temperature,stage_changed_at,data_inicio,data_fechamento,data_assinatura,comprador_cnpj,comprador_nome,drive_url,contract_url")
        .neq("outcome", "cancelado")
        .order("stage_changed_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as unknown as Mandate[];
    },
  });

  const move = useMutation({
    mutationFn: async ({ id, stage, from }: { id: string; stage: string; from?: string | null }) => {
      const { error } = await supabase
        .from("eb_mandates" as any)
        .update({ pipeline_stage: stage })
        .eq("id", id);
      if (error) throw error;
      // Audit trail (best-effort)
      logAuditEvent({
        dealId: id,
        entityType: "pipeline",
        entityId: id,
        eventType: "stage_changed",
        payload: { from_stage: from ?? null, to_stage: stage },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pipeline-kanban-v2"] });
      toast.success("Estágio atualizado");
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao mover"),
  });

  const reanimate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("eb_mandates" as any)
        .update({ stage_changed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pipeline-kanban-v2"] });
      toast.success("SLA reiniciado");
    },
  });

  const stageMap = useMemo(() => {
    const m: Record<string, typeof stages[number]> = {};
    stages.forEach((s) => (m[s.key] = s));
    return m;
  }, [stages]);

  const kindCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0, real: 0, marketplace: 0, sem_mandato: 0, buyer: 0 };
    (mandates ?? []).forEach((m) => {
      counts.all++;
      if (m.deal_kind === "mandato_assinado") counts.real++;
      else if (m.deal_kind === "marketplace_listing") counts.marketplace++;
      else if (m.deal_kind === "vendedor_sem_mandato") counts.sem_mandato++;
      else if (m.deal_kind === "buyer_mandate") counts.buyer++;
    });
    return counts;
  }, [mandates]);

  const matchesKindFilter = (m: Mandate) => {
    if (kindFilter === "all") return true;
    if (kindFilter === "real") return m.deal_kind === "mandato_assinado";
    if (kindFilter === "marketplace") return m.deal_kind === "marketplace_listing";
    if (kindFilter === "sem_mandato") return m.deal_kind === "vendedor_sem_mandato";
    if (kindFilter === "buyer") return m.deal_kind === "buyer_mandate";
    return true;
  };

  const filteredMandates = (mandates ?? []).filter(matchesKindFilter);

  const byStage: Record<string, Mandate[]> = {};
  stages.forEach((s) => (byStage[s.key] = []));
  const orphans: Mandate[] = [];
  filteredMandates.forEach((m) => {
    const key = m.pipeline_stage || "match";
    if (byStage[key]) byStage[key].push(m);
    else orphans.push(m);
  });

  const frozenCount = filteredMandates.filter((m) => {
    const s = stageMap[m.pipeline_stage];
    if (!s || s.is_terminal) return false;
    return getStageTimeState(m.stage_changed_at, s.sla_days).status === "frozen";
  }).length;

  const filterFn = (m: Mandate) => {
    if (!onlyFrozen) return true;
    const s = stageMap[m.pipeline_stage];
    if (!s || s.is_terminal) return false;
    return getStageTimeState(m.stage_changed_at, s.sla_days).status === "frozen";
  };

  const KIND_FILTERS: { key: string; label: string }[] = [
    { key: "real", label: "Mandatos reais" },
    { key: "sem_mandato", label: "Sem mandato" },
    { key: "marketplace", label: "Marketplace" },
    { key: "buyer", label: "Buyers" },
    { key: "all", label: "Todos" },
  ];

  return (
    <div className="p-6 space-y-4 bg-zinc-950 min-h-full">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <Link to="/equity-brain/crm" className="text-[11px] text-zinc-500 hover:text-zinc-300 inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> CRM
          </Link>
          <h1 className="text-2xl font-bold text-zinc-100 mt-1 tracking-tight inline-flex items-center gap-2">
            Pipeline M&amp;A<PageHeaderHint pageKey="eb.pipeline" />
            <InfoHint
              title="Pipeline M&A"
              what="Kanban dos mandatos por etapa do processo. Cada cartão mostra tempo na etapa, tipo de operação e valor."
              action="Arraste cartões para mover. Cards em vermelho com floquinho de neve estão congelados (SLA estourado)."
            />
          </h1>
          <p className="text-xs text-zinc-400 mt-1 break-words">
            Arraste cards entre colunas para movimentar deals. Cada mudança vira atividade automática e entra no histórico.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setOnlyFrozen((v) => !v)}
            className={cn(
              "text-[11px] px-2.5 py-1.5 rounded border inline-flex items-center gap-1.5",
              onlyFrozen
                ? "border-rose-700/60 bg-rose-500/10 text-rose-200"
                : "border-zinc-800 bg-transparent text-zinc-300 hover:text-rose-200",
            )}
            title="Mostrar apenas oportunidades congeladas"
          >
            <Snowflake className="h-3 w-3" />
            {onlyFrozen ? "Mostrando congeladas" : "Congeladas"}
            <span className="text-[10px] text-rose-300/80 tabular-nums">{frozenCount}</span>
          </button>
          <Link
            to="/equity-brain/crm/pipeline/historico"
            className="text-[11px] px-2.5 py-1.5 rounded border border-zinc-800 bg-transparent text-zinc-300 hover:text-[#D9F564] inline-flex items-center gap-1.5"
          >
            <History className="h-3 w-3" /> Histórico
          </Link>
          <button
            onClick={() => setStagesOpen(true)}
            className="text-[11px] px-2.5 py-1.5 rounded border border-zinc-800 bg-transparent text-zinc-300 hover:text-[#D9F564] inline-flex items-center gap-1.5"
          >
            <Settings2 className="h-3 w-3" /> Configurar etapas
          </button>
        </div>
      </header>

      <div className="flex items-center gap-1.5 flex-wrap border-b border-zinc-800 pb-2">
        <span className="text-[10px] uppercase text-zinc-500 tracking-wider mr-1">Filtrar:</span>
        {KIND_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setKindFilter(f.key)}
            className={cn(
              "text-[11px] px-2 py-1 rounded border transition-colors",
              kindFilter === f.key
                ? "border-[#D9F564] bg-[#D9F564]/10 text-[#D9F564]"
                : "border-zinc-800 bg-transparent text-zinc-400 hover:text-zinc-100",
            )}
          >
            {f.label} <span className="tabular-nums opacity-60">({kindCounts[f.key] ?? 0})</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-xs text-zinc-500 p-6">Carregando…</div>
      ) : (
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: `repeat(${Math.max(stages.length, 1)}, minmax(180px, 1fr))`,
          }}
        >
          {stages.map((stage) => {
            const items = (byStage[stage.key] ?? []).filter(filterFn);
            const totalValue = items.reduce((s, m) => s + Number(m.valor_operacao ?? 0), 0);
            return (
              <div
                key={stage.id}
                onDragOver={(e) => { if (canEditEB) e.preventDefault(); }}
                onDrop={async () => {
                  if (!canEditEB) return;
                  const id = draggedId;
                  setDraggedId(null);
                  if (!id) return;
                  const fromStage = (mandates ?? []).find((mm) => mm.id === id)?.pipeline_stage ?? null;
                  if (fromStage === stage.key) return;
                  if (fromStage) {
                    const ok = await canAdvanceStage(id, fromStage);
                    if (!ok) {
                      if (!isAdmin) {
                        toast.error("Conclua as tarefas bloqueantes desta etapa antes de avançar.");
                        return;
                      }
                      const force = window.confirm(
                        "Há tarefas bloqueantes pendentes nesta etapa. Forçar avanço mesmo assim? (será registrado na auditoria)",
                      );
                      if (!force) return;
                      logAuditEvent({
                        dealId: id,
                        entityType: "pipeline",
                        entityId: id,
                        eventType: "stage_force_advanced",
                        payload: { from_stage: fromStage, to_stage: stage.key },
                      });
                    }
                  }
                  move.mutate({ id, stage: stage.key, from: fromStage });
                }}
                className={cn(
                  "rounded-lg border p-2 min-h-[400px] flex flex-col",
                  STAGE_COLOR_CLASSES[stage.color] ?? STAGE_COLOR_CLASSES.zinc,
                )}
              >
                <div className="flex items-center justify-between px-1 mb-1">
                  <div className="text-[11px] font-semibold uppercase text-zinc-200 tracking-wider break-words">
                    {stage.label}
                  </div>
                  <span className="text-[10px] text-zinc-400 tabular-nums">{items.length}</span>
                </div>
                <div className="text-[9px] text-zinc-500 px-1 mb-2 flex items-center justify-between">
                  <span>SLA {stage.sla_days}d</span>
                  {totalValue > 0 && <span className="tabular-nums">Σ {brl(totalValue, { compact: true })}</span>}
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto">
                  {items.map((m) => (
                    <DealCard
                      key={m.id}
                      m={m}
                      slaDays={stage.sla_days}
                      isTerminal={stage.is_terminal}
                      canDrag={canEditEB}
                      onDragStart={() => setDraggedId(m.id)}
                      onEdit={() => setEditing(m)}
                      onReanimate={() => reanimate.mutate(m.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
          {orphans.filter(filterFn).length > 0 && (
            <div className="rounded-lg border border-zinc-700/60 bg-zinc-800/20 p-2 min-h-[400px] flex flex-col">
              <div className="text-[11px] font-semibold uppercase text-zinc-300 tracking-wider mb-2 px-1">
                Sem etapa
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto">
                {orphans.filter(filterFn).map((m) => (
                  <DealCard
                    key={m.id}
                    m={m}
                    slaDays={0}
                    isTerminal
                    canDrag={canEditEB}
                    onDragStart={() => setDraggedId(m.id)}
                    onEdit={() => setEditing(m)}
                    onReanimate={() => reanimate.mutate(m.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {editing && (
        <QuickEditPopover
          mandateId={editing.id}
          values={{
            valor_operacao: editing.valor_operacao,
            faturamento_vispe: editing.faturamento_vispe,
            commission_pct: editing.commission_pct,
            contato_nome: editing.contato_nome,
            contato_telefone: editing.contato_telefone,
            outcome: editing.outcome,
            pipeline_stage: editing.pipeline_stage,
            deal_type: editing.deal_type,
            uf: editing.uf,
            regiao: editing.regiao,
            responsavel_id: editing.responsavel_id,
            comprador_cnpj: editing.comprador_cnpj,
            comprador_nome: editing.comprador_nome,
            drive_url: editing.drive_url,
            contract_url: editing.contract_url,
            data_inicio: editing.data_inicio,
            data_fechamento: editing.data_fechamento,
            data_assinatura: editing.data_assinatura,
          }}
          onClose={() => setEditing(null)}
        />
      )}

      {stagesOpen && <PipelineStagesEditor onClose={() => setStagesOpen(false)} />}
    </div>
  );
}

function DealCard({
  m,
  slaDays,
  isTerminal,
  onDragStart,
  onEdit,
  onReanimate,
  canDrag = true,
}: {
  m: Mandate;
  slaDays: number;
  isTerminal?: boolean;
  onDragStart: () => void;
  onEdit: () => void;
  onReanimate: () => void;
  canDrag?: boolean;
}) {
  const { status } = getStageTimeState(m.stage_changed_at, slaDays);
  const { openDeal } = useDealDrawer();
  const onOpen = () => openDeal(m.id);
  return (
    <div
      draggable={canDrag}
      onDragStart={canDrag ? onDragStart : undefined}
      className={cn(
        "rounded border bg-zinc-900/80 hover:border-zinc-700 p-2.5 group",
        canDrag ? "cursor-move" : "cursor-pointer",
        status === "frozen" && !isTerminal ? "border-rose-700/60" : "border-zinc-800",
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpen(); }}
          className="text-[11px] text-zinc-100 font-medium leading-tight break-words flex-1 truncate hover:text-[#D9F564] text-left"
          title={m.razao_social ?? m.company_cnpj}
        >
          {m.display_name ?? m.codename ?? m.razao_social ?? m.company_cnpj}
        </button>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(); }}
          className="text-zinc-700 hover:text-[#D9F564] shrink-0"
          title="Edição rápida"
        >
          <Pencil className="h-3 w-3" />
        </button>
        <GripVertical className="h-3 w-3 text-zinc-700 group-hover:text-zinc-500 shrink-0 mt-0.5" />
      </div>
      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
        {m.deal_kind && (
          <span className={cn(
            "text-[9px] uppercase px-1.5 py-0.5 rounded border font-semibold",
            DEAL_KIND_COLOR[m.deal_kind] ?? "bg-zinc-800 text-zinc-400 border-zinc-700",
          )}>
            {DEAL_KIND_LABEL[m.deal_kind] ?? m.deal_kind}
          </span>
        )}
        {m.needs_enrichment && (
          <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-700/40" title="Precisa enriquecer (CNPJ placeholder)">
            ⚠ enrich
          </span>
        )}
        {m.uf && <span className="text-[9px] text-zinc-500">{m.uf}</span>}
        <StageTimeBadge stageChangedAt={m.stage_changed_at} slaDays={slaDays} isTerminal={isTerminal} compact />
        <TaskProgressBadge mandateId={m.id} stageKey={m.pipeline_stage} />
        <DocProgressBadge mandateId={m.id} stageKey={m.pipeline_stage} />
        {status === "frozen" && !isTerminal && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onReanimate(); }}
            title="Reiniciar SLA (registrar contato/atividade)"
            className="text-[9px] inline-flex items-center gap-0.5 text-amber-300 hover:text-amber-200"
          >
            <RotateCcw className="h-2.5 w-2.5" /> reanimar
          </button>
        )}
      </div>
      {m.contato_nome && (
        <div className="text-[10px] text-zinc-400 mt-1 truncate break-words">{m.contato_nome}</div>
      )}
      {m.comprador_nome && (
        <div className="text-[10px] text-blue-300 mt-0.5 truncate break-words" title="Comprador (MATCH)">
          ↔ {m.comprador_nome}
        </div>
      )}
      <div className="flex items-center justify-between mt-2 gap-1">
        {m.valor_operacao ? (
          <div className="flex items-center gap-1 text-[10px] text-emerald-300 font-medium tabular-nums">
            <DollarSign className="h-2.5 w-2.5" />
            {brl(m.valor_operacao, { compact: true })}
          </div>
        ) : (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(); }}
            className="text-[10px] text-zinc-500 hover:text-[#D9F564] underline-offset-2 hover:underline"
          >
            + valor
          </button>
        )}
        <div className="flex items-center gap-1">
          {m.drive_url && (
            <a href={m.drive_url} target="_blank" rel="noopener noreferrer"
               onClick={(e) => e.stopPropagation()} title="Drive do projeto"
               className="text-zinc-500 hover:text-[#D9F564]">
              <FolderOpen className="h-3 w-3" />
            </a>
          )}
          {m.contract_url && (
            <a href={m.contract_url} target="_blank" rel="noopener noreferrer"
               onClick={(e) => e.stopPropagation()} title="Contrato"
               className="text-zinc-500 hover:text-[#D9F564]">
              <FileSignature className="h-3 w-3" />
            </a>
          )}
          <TemperatureBadge temp={m.temperature} compact />
        </div>
      </div>
    </div>
  );
}

function TaskProgressBadge({ mandateId, stageKey }: { mandateId: string; stageKey: string }) {
  const { data } = useDealStageProgress(mandateId);
  const cur = (data ?? []).find((p) => p.stage_key === stageKey);
  if (!cur || cur.total === 0) return null;
  const blocking = cur.pending_blocking ?? 0;
  const complete = cur.done >= cur.total;
  const cls = blocking > 0
    ? "bg-rose-500/15 text-rose-300 border-rose-700/40"
    : complete
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-700/40"
      : "bg-zinc-800/60 text-zinc-300 border-zinc-700";
  return (
    <span
      title={blocking > 0 ? `${blocking} tarefa(s) bloqueante(s) pendente(s)` : `${cur.done}/${cur.total} tarefas`}
      className={cn("text-[9px] uppercase px-1.5 py-0.5 rounded border font-mono tabular-nums inline-flex items-center gap-0.5", cls)}
    >
      <CheckSquare className="h-2.5 w-2.5" />
      {cur.done}/{cur.total}
    </span>
  );
}

function DocProgressBadge({ mandateId, stageKey }: { mandateId: string; stageKey: string }) {
  const { data } = useDealDocProgress(mandateId);
  const cur = (data ?? []).find((p) => p.stage_key === stageKey);
  if (!cur || cur.required_count === 0) return null;
  const blocking = cur.pending_blocking ?? 0;
  const complete = cur.present_count >= cur.required_count;
  const cls = blocking > 0
    ? "bg-rose-500/15 text-rose-300 border-rose-700/40"
    : complete
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-700/40"
      : "bg-zinc-800/60 text-zinc-300 border-zinc-700";
  return (
    <span
      title={blocking > 0 ? `${blocking} documento(s) obrigatório(s) faltando` : `${cur.present_count}/${cur.required_count} documentos`}
      className={cn("text-[9px] uppercase px-1.5 py-0.5 rounded border font-mono tabular-nums inline-flex items-center gap-0.5", cls)}
    >
      <FileText className="h-2.5 w-2.5" />
      {cur.present_count}/{cur.required_count}
    </span>
  );
}
