import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, MessageCircle, FileText, Activity, DollarSign, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMandate } from "@/hooks/useCrm";
import { ActivityTimeline } from "@/components/equity-brain/crm/ActivityTimeline";
import { WhatsAppWebFrame } from "@/components/equity-brain/crm/WhatsAppWebFrame";
import { MatchesPanel } from "@/components/equity-brain/crm/MatchesPanel";
import { DocumentsPanel } from "@/components/equity-brain/crm/DocumentsPanel";
import { FinancialPipelinePanel } from "@/components/equity-brain/crm/FinancialPipelinePanel";
import { StatusBadge } from "@/components/equity-brain/crm/StatusBadge";
import { RegionBadge } from "@/components/equity-brain/crm/RegionBadge";
import { formatBRL } from "@/lib/equityBrain";

type Tab = "overview" | "matches" | "whatsapp" | "documents";

export default function MandateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: mandate, isLoading } = useMandate(id);
  const [tab, setTab] = useState<Tab>("overview");

  if (isLoading) return <div className="p-8 text-zinc-400 text-sm">Carregando…</div>;
  if (!mandate) return <div className="p-8 text-zinc-400 text-sm">Mandato não encontrado.</div>;

  const name = mandate.razao_social ?? mandate.nome_fantasia ?? mandate.company_cnpj;

  const tabs: { key: Tab; label: string; Icon: any }[] = [
    { key: "overview", label: "Visão geral", Icon: Activity },
    { key: "matches", label: "Matches", Icon: Target },
    { key: "whatsapp", label: "WhatsApp", Icon: MessageCircle },
    { key: "documents", label: "Documentos & Pipeline", Icon: FileText },
  ];

  return (
    <div className="p-6 space-y-4 bg-zinc-950 min-h-full">
      <Link to="/equity-brain/crm" className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-100">
        <ArrowLeft className="h-3 w-3" /> Voltar ao CRM
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-800 pb-4">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-zinc-100 break-words">{name}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <StatusBadge status={mandate.status} />
            <RegionBadge uf={mandate.uf} />
            <span className="text-[11px] text-zinc-400">{mandate.setor_ma ?? "—"}</span>
            <span className="text-[11px] text-zinc-400">· Ticket {formatBRL(mandate.valor_pretendido ?? mandate.ticket_alvo ?? 0)}</span>
          </div>
        </div>
      </header>

      <div className="flex items-center gap-1 border-b border-zinc-800">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-xs border-b-2 -mb-px transition-colors",
              tab === t.key
                ? "border-emerald-500 text-emerald-300"
                : "border-transparent text-zinc-400 hover:text-zinc-100",
            )}
          >
            <t.Icon className="h-3.5 w-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-sm font-bold text-zinc-100">Timeline</h3>
            <ActivityTimeline entityType="mandate" entityId={mandate.id} />
          </div>
          <div className="space-y-3">
            <div className="bg-zinc-900/40 border border-zinc-800 rounded p-4 space-y-2">
              <div className="text-[10px] uppercase text-zinc-400">Resumo</div>
              <div className="text-xs text-zinc-300">CNPJ: {mandate.company_cnpj ?? "—"}</div>
              <div className="text-xs text-zinc-300">UF: {mandate.uf ?? "—"}</div>
              <div className="text-xs text-zinc-300">Setor: {mandate.setor_ma ?? "—"}</div>
              <div className="text-xs text-zinc-300">Receita: {formatBRL(mandate.faturamento_anual ?? 0)}</div>
            </div>
          </div>
        </div>
      )}

      {tab === "matches" && mandate.company_cnpj && (
        <MatchesPanel mode={{ type: "mandate", cnpj: mandate.company_cnpj, mandateId: mandate.id }} entityName={name} />
      )}
      {tab === "matches" && !mandate.company_cnpj && (
        <div className="text-xs text-zinc-400 p-4">Mandato sem CNPJ vinculado — não é possível buscar matches.</div>
      )}

      {tab === "whatsapp" && (
        <WhatsAppWebFrame entityType="mandate" entityId={mandate.id} entityName={name} />
      )}

      {tab === "documents" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <FileText className="h-4 w-4" /> Documentos
            </h3>
            <DocumentsPanel entityType="mandate" entityId={mandate.id} />
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Pipeline financeiro
            </h3>
            <FinancialPipelinePanel mandate={mandate} />
          </div>
        </div>
      )}
    </div>
  );
}
