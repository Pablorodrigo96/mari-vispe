import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Target, Loader2, ArrowRight, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDeal, useUpdateDealStage } from "@/hooks/useDeal";
import { useMatchById } from "@/hooks/useMatchById";
import { MatchWhyCard } from "@/components/equity-brain/match/MatchWhyCard";
import { usePipelineStages, STAGE_COLOR_CLASSES } from "@/hooks/usePipelineStages";
import { brl } from "@/lib/dealFormatters";
import { cn } from "@/lib/utils";
import { PageHeaderHint } from "@/components/ui/PageHeaderHint";
import { StageTasksChecklist } from "@/components/equity-brain/crm/StageTasksChecklist";
import { useDealStageProgress } from "@/hooks/useStageTasks";
import { CheckSquare } from "lucide-react";

/**
 * Página unificada do Deal: mandato + buyer movimentados juntos no pipeline.
 * Layout 3 colunas: Vendedor (clicável → empresa) · Painel central (match why, ações, estágios) · Comprador (clicável → buyer 360).
 */
export default function UnifiedDealPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dealQ = useDeal(id);
  const matchQ = useMatchById(dealQ.data?.match_id);
  const updateStage = useUpdateDealStage();
  const { data: stages = [] } = usePipelineStages();

  if (dealQ.isLoading) {
    return (
      <div className="p-12 flex items-center justify-center text-zinc-400 text-sm">
        <Loader2 className="h-5 w-5 animate-spin mr-2 text-[#D9F564]" /> Carregando deal…
      </div>
    );
  }

  const deal = dealQ.data;
  if (!deal) {
    return (
      <div className="p-12 text-center text-zinc-400 text-sm">
        Deal não encontrado.{" "}
        <Link to="/equity-brain/crm/pipeline" className="text-[#D9F564] hover:underline">Voltar ao pipeline</Link>
      </div>
    );
  }

  const company = (deal as any).company;
  const buyer = (deal as any).buyer;
  const match = matchQ.data;

  return (
    <div className="bg-zinc-950 min-h-full">
      {/* Header */}
      <div className="border-b border-zinc-800 px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Button size="sm" variant="ghost" onClick={() => navigate(-1)}
            className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800">
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 inline-flex items-center">Deal · par mandato ⇄ buyer<PageHeaderHint pageKey="eb.deal" /></div>
            <div className="text-base font-bold text-zinc-100 truncate break-words inline-flex items-center gap-2">
              <span className="text-[#D9F564]">{company?.codename ?? company?.razao_social ?? deal.cnpj}</span>
              <ArrowRight className="h-3.5 w-3.5 text-zinc-500" />
              <span className="text-blue-300">{buyer?.nome ?? "Buyer"}</span>
              {match?.match_score != null && (
                <span className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded border border-[#D9F564]/40 bg-[#D9F564]/10 text-[#D9F564]">
                  score {Math.round(Number(match.match_score))}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stage selector (mover deal inteiro) */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">Estágio:</span>
          {stages.map((s) => (
            <button
              key={s.id}
              onClick={() => updateStage.mutate({ id: deal.id, stage: s.key })}
              disabled={updateStage.isPending}
              className={cn(
                "text-[11px] px-2 py-1 rounded border transition-colors disabled:opacity-50",
                deal.stage === s.key
                  ? STAGE_COLOR_CLASSES[s.color] ?? STAGE_COLOR_CLASSES.zinc
                  : "border-zinc-800 bg-transparent text-zinc-400 hover:text-zinc-100",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body 3 colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-6">
        {/* COL 1 — Vendedor */}
        <Link
          to={`/equity-brain/empresa/${deal.cnpj}`}
          className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 hover:border-[#D9F564]/40 transition-colors block"
        >
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 inline-flex items-center gap-1 mb-2">
            <Building2 className="h-3 w-3 text-[#D9F564]" /> Vendedor (mandato)
          </div>
          <div className="text-sm font-bold text-zinc-100 break-words">
            {company?.razao_social ?? deal.cnpj}
          </div>
          {company?.codename && (
            <div className="text-[11px] font-mono text-amber-300 mt-0.5">{company.codename}</div>
          )}
          <div className="mt-3 space-y-1.5 text-[11px] text-zinc-400">
            <div className="flex justify-between"><span>Setor</span><span className="text-zinc-200">{company?.setor_ma ?? "—"}</span></div>
            <div className="flex justify-between"><span>UF</span><span className="text-zinc-200">{company?.uf ?? "—"}</span></div>
            <div className="flex justify-between">
              <span>Faturamento est.</span>
              <span className="text-zinc-200 tabular-nums">{brl(company?.faturamento_estimado ?? null, { compact: true })}</span>
            </div>
            <div className="flex justify-between"><span>CNPJ</span><span className="text-zinc-300 font-mono text-[10px]">{deal.cnpj}</span></div>
          </div>
          <div className="mt-3 text-[10px] text-[#D9F564] inline-flex items-center gap-1">
            Abrir 360 da empresa <ArrowRight className="h-3 w-3" />
          </div>
        </Link>

        {/* COL 2 — Painel central */}
        <div className="space-y-4">
          {match ? (
            <MatchWhyCard match={match as any} compact />
          ) : matchQ.isLoading ? (
            <div className="rounded border border-zinc-800 bg-zinc-900/40 p-6 text-center text-xs text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Carregando explicação do match…
            </div>
          ) : (
            <div className="rounded border border-zinc-800 bg-zinc-900/40 p-4 text-xs text-zinc-500">
              Match original não disponível.
            </div>
          )}

          {/* Tarefas desta etapa */}
          {deal.mandate_id && (
            <StageTasksSection mandateId={deal.mandate_id} stageKey={deal.stage} />
          )}


          {/* Notas / status */}
          <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Status do deal</div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div><span className="text-zinc-500">Estágio:</span> <span className="text-zinc-100">{deal.stage}</span></div>
              <div><span className="text-zinc-500">Resultado:</span> <span className="text-zinc-100">{deal.outcome}</span></div>
              <div><span className="text-zinc-500">Criado:</span> <span className="text-zinc-300">{new Date(deal.created_at).toLocaleDateString("pt-BR")}</span></div>
              <div><span className="text-zinc-500">Movido:</span> <span className="text-zinc-300">{new Date(deal.last_moved_at).toLocaleDateString("pt-BR")}</span></div>
            </div>
            {deal.notes && (
              <div className="mt-2 text-[11px] text-zinc-400 break-words italic">"{deal.notes}"</div>
            )}
          </div>

          {/* Atalhos para tela do match completa */}
          {deal.match_id && (
            <Link
              to={`/equity-brain/match/${deal.match_id}`}
              className="block w-full text-center text-[11px] py-2 rounded border border-zinc-800 bg-transparent text-zinc-300 hover:text-[#D9F564] hover:border-[#D9F564]/40 inline-flex items-center justify-center gap-1.5"
            >
              <Rocket className="h-3 w-3" /> Abrir tela completa do match (contatos, WhatsApp, disclosure)
            </Link>
          )}
        </div>

        {/* COL 3 — Comprador */}
        <Link
          to={`/equity-brain/crm/buyer/${deal.buyer_id}`}
          className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 hover:border-blue-400/40 transition-colors block"
        >
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 inline-flex items-center gap-1 mb-2">
            <Target className="h-3 w-3 text-blue-300" /> Comprador (buyer)
          </div>
          <div className="text-sm font-bold text-zinc-100 break-words">{buyer?.nome ?? "—"}</div>
          {buyer?.tipo && (
            <div className="text-[11px] text-zinc-500 mt-0.5">{buyer.tipo}</div>
          )}
          <div className="mt-3 space-y-1.5 text-[11px] text-zinc-400">
            <div className="flex justify-between gap-2">
              <span>Setores</span>
              <span className="text-zinc-200 text-right break-words">
                {(buyer?.setores_interesse ?? []).slice(0, 3).join(", ") || "—"}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span>UFs alvo</span>
              <span className="text-zinc-200 text-right break-words">
                {(buyer?.ufs_interesse ?? []).slice(0, 5).join(", ") || "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Ticket</span>
              <span className="text-zinc-200 tabular-nums">
                {brl(buyer?.ticket_min ?? null, { compact: true })} – {brl(buyer?.ticket_max ?? null, { compact: true })}
              </span>
            </div>
          </div>
          <div className="mt-3 text-[10px] text-blue-300 inline-flex items-center gap-1">
            Abrir 360 do buyer <ArrowRight className="h-3 w-3" />
          </div>
        </Link>
      </div>
    </div>
  );
}
