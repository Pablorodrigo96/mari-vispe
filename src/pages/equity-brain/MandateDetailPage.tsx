import { useParams, Link, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { ArrowLeft, MessageCircle, FileText, Activity, DollarSign, Target, Pencil, Newspaper } from "lucide-react";
import { NewsPanel } from "@/components/equity-brain/news/NewsPanel";
import { cn } from "@/lib/utils";
import { useMandate } from "@/hooks/useCrm";
import { useAccessLog } from "@/hooks/useAccessLog";
import { ActivityTimeline } from "@/components/equity-brain/crm/ActivityTimeline";
import { WhatsAppWebFrame } from "@/components/equity-brain/crm/WhatsAppWebFrame";
import { MatchesPanel } from "@/components/equity-brain/crm/MatchesPanel";
import { DocumentsPanel } from "@/components/equity-brain/crm/DocumentsPanel";
import { FinancialPipelinePanel } from "@/components/equity-brain/crm/FinancialPipelinePanel";
import { StatusBadge } from "@/components/equity-brain/crm/StatusBadge";
import { RegionBadge } from "@/components/equity-brain/crm/RegionBadge";
import { TemperatureBadge } from "@/components/equity-brain/crm/TemperatureBadge";
import { TasksWidget } from "@/components/equity-brain/crm/TasksWidget";
import { ConversationSummary } from "@/components/equity-brain/crm/ConversationSummary";
import { AskMariDrawer } from "@/components/equity-brain/crm/AskMariDrawer";
import { IdentityRevealCard } from "@/components/equity-brain/IdentityRevealCard";
import { BlindTeaserButton } from "@/components/equity-brain/BlindTeaserButton";
import { DiagnosticoVispe } from "@/components/equity-brain/DiagnosticoVispe";
import { formatBRL } from "@/lib/equityBrain";
import { TopMatchesHeader } from "@/components/equity-brain/match/TopMatchesHeader";
import { WhatsAppActionButton } from "@/components/whatsapp/WhatsAppActionButton";

type Tab = "overview" | "matches" | "news" | "whatsapp" | "documents";

export default function MandateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as Tab) || "overview";
  const { data: mandate, isLoading } = useMandate(id);
  const [tab, setTab] = useState<Tab>(initialTab);
  useEffect(() => {
    const t = searchParams.get("tab") as Tab | null;
    if (t && t !== tab) setTab(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  function changeTab(next: Tab) {
    setTab(next);
    const sp = new URLSearchParams(searchParams);
    if (next === "overview") sp.delete("tab"); else sp.set("tab", next);
    setSearchParams(sp, { replace: true });
  }
  useAccessLog("mandate", mandate?.id);

  if (isLoading) return <div className="p-8 text-zinc-400 text-sm">Carregando…</div>;
  if (!mandate) return <div className="p-8 text-zinc-400 text-sm">Mandato não encontrado.</div>;

  const name = mandate.razao_social ?? mandate.nome_fantasia ?? mandate.company_cnpj;

  const tabs: { key: Tab; label: string; Icon: any }[] = [
    { key: "overview", label: "Visão geral", Icon: Activity },
    { key: "matches", label: "Matches", Icon: Target },
    { key: "news", label: "Notícias", Icon: Newspaper },
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
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-zinc-100 break-words">{name}</h1>
            <TemperatureBadge temp={(mandate as any).temperature} reason={(mandate as any).temperature_reason} />
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <StatusBadge status={mandate.status} />
            <RegionBadge uf={mandate.uf} />
            <span className="text-[11px] text-zinc-400">{mandate.setor_ma ?? "—"}</span>
            <span className="text-[11px] text-zinc-400">· Ticket {formatBRL(mandate.valor_pretendido ?? mandate.ticket_alvo ?? 0)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <WhatsAppActionButton
            phone={(mandate as any).contato_telefone ?? null}
            mandateId={mandate.id}
            contactName={(mandate as any).contato_nome ?? null}
            draftType={(mandate as any).last_outreach_at ? "followup" : "first_contact"}
            source="mandate_detail"
            label={(mandate as any).contato_nome ? `Falar com ${String((mandate as any).contato_nome).split(" ")[0]}` : "WhatsApp"}
            className="bg-transparent border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/20"
          />
          <BlindTeaserButton
            cnpj={mandate.company_cnpj}
            entityType="mandate"
            entityId={mandate.id}
          />
          <Link
            to={`/equity-brain/crm/mandate/${mandate.id}/edit`}
            className="text-[11px] inline-flex items-center gap-1 px-3 py-1.5 rounded border border-[#D9F564]/40 text-[#D9F564] hover:bg-[#D9F564]/10 bg-transparent font-medium"
          >
            <Pencil className="h-3 w-3" /> Editar mandato
          </Link>
        </div>
      </header>

      <IdentityRevealCard
        entityType="mandate"
        entityId={mandate.id}
        cnpj={mandate.company_cnpj}
        razaoSocial={mandate.razao_social}
        nomeFantasia={mandate.nome_fantasia}
        city={(mandate as any).cidade ?? null}
        uf={mandate.uf}
        extras={{
          Setor: mandate.setor_ma ?? null,
        }}
      />

      {mandate.company_cnpj && <TopMatchesHeader cnpj={mandate.company_cnpj} />}

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
            <ConversationSummary entity_type="mandate" entity_id={mandate.id} />
            <h3 className="text-sm font-bold text-zinc-100">Timeline</h3>
            <ActivityTimeline entityType="mandate" entityId={mandate.id} />
          </div>
          <div className="space-y-3">
            <DiagnosticoVispe cnpj={mandate.company_cnpj} />
            <div className="bg-zinc-900/40 border border-zinc-800 rounded p-4 space-y-2">
              <div className="text-[10px] uppercase text-zinc-400">Resumo</div>
              <div className="text-xs text-zinc-300">CNPJ: {mandate.company_cnpj ?? "—"}</div>
              <div className="text-xs text-zinc-300">UF: {mandate.uf ?? "—"}</div>
              <div className="text-xs text-zinc-300">Setor: {mandate.setor_ma ?? "—"}</div>
              <div className="text-xs text-zinc-300">Receita: {formatBRL(mandate.faturamento_anual ?? 0)}</div>
            </div>
            <TasksWidget entity_type="mandate" entity_id={mandate.id} compact />
          </div>
        </div>
      )}

      {tab === "matches" && mandate.company_cnpj && (
        <MatchesPanel mode={{ type: "mandate", cnpj: mandate.company_cnpj, mandateId: mandate.id }} entityName={name} />
      )}
      {tab === "matches" && !mandate.company_cnpj && (
        <div className="text-xs text-zinc-400 p-4">Mandato sem CNPJ vinculado — não é possível buscar matches.</div>
      )}

      {tab === "news" && (
        <NewsPanel cnpj={mandate.company_cnpj} emptyMessage="Nenhuma notícia coletada ainda para esta empresa. A varredura roda a cada hora." />
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
            <DocumentsPanel
              entityType="mandate"
              entityId={mandate.id}
              companyContext={{ cnpj: mandate.company_cnpj }}
            />
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Pipeline financeiro
            </h3>
            <FinancialPipelinePanel mandate={mandate} />
          </div>
        </div>
      )}

      <AskMariDrawer entity_type="mandate" entity_id={mandate.id} />
    </div>
  );
}
