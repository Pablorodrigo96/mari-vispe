import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, MessageCircle, FileText, Activity, Target, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBuyerCrm } from "@/hooks/useCrm";
import { useAccessLog } from "@/hooks/useAccessLog";
import { ActivityTimeline } from "@/components/equity-brain/crm/ActivityTimeline";
import { WhatsAppWebFrame } from "@/components/equity-brain/crm/WhatsAppWebFrame";
import { MatchesPanel } from "@/components/equity-brain/crm/MatchesPanel";
import { DocumentsPanel } from "@/components/equity-brain/crm/DocumentsPanel";
import { PreferencesEditor } from "@/components/equity-brain/crm/PreferencesEditor";
import { LearningInsightsCard } from "@/components/equity-brain/crm/LearningInsightsCard";
import { RegionBadge } from "@/components/equity-brain/crm/RegionBadge";
import { TemperatureBadge } from "@/components/equity-brain/crm/TemperatureBadge";
import { TasksWidget } from "@/components/equity-brain/crm/TasksWidget";
import { ConversationSummary } from "@/components/equity-brain/crm/ConversationSummary";
import { AskMariDrawer } from "@/components/equity-brain/crm/AskMariDrawer";
import { IdentityRevealCard } from "@/components/equity-brain/IdentityRevealCard";
import { BlindTeaserButton } from "@/components/equity-brain/BlindTeaserButton";
import { formatBRL } from "@/lib/equityBrain";
import { TopMatchesHeader } from "@/components/equity-brain/match/TopMatchesHeader";

type Tab = "overview" | "matches" | "whatsapp" | "documents";

export default function BuyerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: buyer, isLoading } = useBuyerCrm(id);
  const [tab, setTab] = useState<Tab>("overview");
  useAccessLog("buyer", buyer?.id);

  if (isLoading) return <div className="p-8 text-zinc-400 text-sm">Carregando…</div>;
  if (!buyer) return <div className="p-8 text-zinc-400 text-sm">Buyer não encontrado.</div>;

  const name = buyer.nome ?? buyer.cnpj ?? "Buyer";

  const tabs: { key: Tab; label: string; Icon: any }[] = [
    { key: "overview", label: "Visão geral", Icon: Activity },
    { key: "matches", label: "Matches", Icon: Target },
    { key: "whatsapp", label: "WhatsApp", Icon: MessageCircle },
    { key: "documents", label: "Documentos", Icon: FileText },
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
            <TemperatureBadge temp={(buyer as any).temperature} reason={(buyer as any).temperature_reason} />
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <RegionBadge uf={(buyer.ufs_interesse ?? [])[0]} />
            <span className="text-[11px] text-zinc-400">
              Ticket {formatBRL(buyer.ticket_min ?? 0)} – {formatBRL(buyer.ticket_max ?? 0)}
            </span>
            <span className="text-[11px] text-zinc-400">
              · Setores: {(buyer.setores_interesse ?? []).slice(0, 3).join(", ") || "—"}
            </span>
          </div>
        </div>
        <BlindTeaserButton
          cnpj={(buyer as any).cnpj}
          entityType="buyer"
          entityId={buyer.id}
        />
      </header>

      <IdentityRevealCard
        entityType="buyer"
        entityId={buyer.id}
        cnpj={(buyer as any).cnpj}
        razaoSocial={(buyer as any).razao_social ?? null}
        nomeFantasia={(buyer as any).nome ?? null}
        email={(buyer as any).email ?? null}
        phone={(buyer as any).whatsapp ?? (buyer as any).telefone ?? null}
        uf={(buyer.ufs_interesse ?? [])[0] ?? null}
      />

      <TopMatchesHeader buyerId={buyer.id} />

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
            <ConversationSummary entity_type="buyer" entity_id={buyer.id} />
            <h3 className="text-sm font-bold text-zinc-100">Timeline</h3>
            <ActivityTimeline entityType="buyer" entityId={buyer.id} />
          </div>
          <div className="space-y-3">
            <TasksWidget entity_type="buyer" entity_id={buyer.id} compact />
            <LearningInsightsCard buyerId={buyer.id} />
            <div className="bg-zinc-900/40 border border-zinc-800 rounded p-4">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-zinc-100">Preferências</h3>
              </div>
              <PreferencesEditor buyer={buyer} />
            </div>
          </div>
        </div>
      )}

      {tab === "matches" && (
        <MatchesPanel
          mode={{
            type: "buyer",
            buyerId: buyer.id,
            buyerSetores: buyer.setores_interesse ?? [],
            buyerUfs: buyer.ufs_interesse ?? [],
          }}
          entityName={name}
        />
      )}

      {tab === "whatsapp" && (
        <WhatsAppWebFrame entityType="buyer" entityId={buyer.id} entityName={name} />
      )}

      {tab === "documents" && (
        <DocumentsPanel
          entityType="buyer"
          entityId={buyer.id}
          companyContext={{ cnpj: (buyer as any).cnpj ?? null }}
        />
      )}

      <AskMariDrawer entity_type="buyer" entity_id={buyer.id} />
    </div>
  );
}
