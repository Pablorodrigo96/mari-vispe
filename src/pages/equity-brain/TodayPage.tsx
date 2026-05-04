import { useState } from "react";
import { Link } from "react-router-dom";
import { Flame, Snowflake, Sparkles, MessageCircle, Eye, Clock, ChevronRight, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTodayCards, useDismissCard, useMandateSummary, type TodayCard } from "@/hooks/useTodayCards";
import { openWhatsAppForContact } from "@/lib/whatsappBridge";
import { toast } from "sonner";
import { useDealDrawer } from "@/contexts/DealDrawerContext";
import { MariInsightsSection } from "@/components/equity-brain/MariInsightsSection";

function fmtBRL(v: number | null) {
  if (v == null) return "—";
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return `R$ ${v.toFixed(0)}`;
}

function CardActions({ card, onDismiss }: { card: TodayCard; onDismiss: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [sending, setSending] = useState(false);
  const summary = useMandateSummary(card.mandate_id, { enabled: expanded });
  const { openDeal } = useDealDrawer();

  const handleWhatsApp = async (msg?: string) => {
    if (!card.contact_phone) {
      toast.error("Contato sem telefone cadastrado");
      return;
    }
    setSending(true);
    const ok = await openWhatsAppForContact({
      phone: card.contact_phone,
      message: msg ?? summary.data?.suggested_message_draft ?? "",
      entityType: "mandate",
      entityId: card.mandate_id,
      contactId: card.contact_id,
      aiDrafted: !!msg || !!summary.data?.suggested_message_draft,
      source: "today_card",
    });
    setSending(false);
    if (ok) toast.success("WhatsApp aberto e atividade registrada");
    else toast.warning("Link copiado (popup bloqueado). Atividade registrada.");
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Linha de botões principais */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          onClick={() => handleWhatsApp()}
          disabled={sending || !card.contact_phone}
          className="bg-[#D9F564] text-zinc-900 hover:bg-[#c5e054] font-semibold"
        >
          {sending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <MessageCircle className="h-3.5 w-3.5 mr-1.5" />}
          {card.contact_phone ? `Falar com ${card.contact_name?.split(" ")[0] ?? "contato"}` : "Sem telefone"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setExpanded((e) => !e)}
          className="bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800"
        >
          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
          {expanded ? "Esconder Mari" : "Pedir resumo p/ Mari"}
        </Button>
        <Button
          size="sm" variant="outline"
          onClick={() => openDeal(card.mandate_id)}
          className="bg-transparent border-zinc-700 text-zinc-400 hover:bg-zinc-800"
        >
          <Eye className="h-3.5 w-3.5 mr-1.5" />
          Abrir deal
        </Button>
        <button
          onClick={onDismiss}
          className="ml-auto text-[11px] text-zinc-500 hover:text-zinc-300 px-2 py-1"
          title="Dispensar por 24h"
        >
          Dispensar 24h
        </button>
      </div>

      {/* Painel Mari expandido */}
      {expanded && (
        <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-3 text-xs">
          {summary.isLoading && (
            <div className="flex items-center gap-2 text-zinc-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Mari analisando o deal…
            </div>
          )}
          {summary.error && <div className="text-rose-300">Falha ao gerar resumo.</div>}
          {summary.data && (
            <div className="space-y-2">
              <div className="text-zinc-200 whitespace-pre-line leading-relaxed">{summary.data.summary_text}</div>
              {summary.data.suggested_action_text && (
                <div className="pt-2 border-t border-emerald-900/30">
                  <div className="text-[10px] uppercase tracking-wider text-emerald-400 mb-1">Próxima ação</div>
                  <div className="text-zinc-300">{summary.data.suggested_action_text}</div>
                </div>
              )}
              {summary.data.suggested_message_draft && (
                <div className="pt-2 border-t border-emerald-900/30">
                  <div className="text-[10px] uppercase tracking-wider text-emerald-400 mb-1">Rascunho WhatsApp</div>
                  <div className="text-zinc-300 italic break-words">"{summary.data.suggested_message_draft}"</div>
                  <Button
                    size="sm"
                    onClick={() => handleWhatsApp(summary.data!.suggested_message_draft!)}
                    disabled={sending || !card.contact_phone}
                    className="mt-2 bg-[#D9F564] text-zinc-900 hover:bg-[#c5e054] h-7 text-[11px]"
                  >
                    Enviar este rascunho
                  </Button>
                </div>
              )}
              <div className="text-[10px] text-zinc-500 pt-1">
                {summary.data.cached ? "Cache " : "Gerado "} {summary.data.generated_at ? new Date(summary.data.generated_at).toLocaleString("pt-BR") : ""}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TodayCardItem({ card, onDismiss }: { card: TodayCard; onDismiss: () => void }) {
  const isHot = card.card_kind === "hot_match";
  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-all",
        isHot
          ? "border-[#D9F564]/40 bg-gradient-to-br from-zinc-950 to-zinc-900 shadow-[0_0_20px_-10px_rgba(217,245,100,0.4)]"
          : "border-amber-900/40 bg-gradient-to-br from-zinc-950 to-zinc-900",
      )}
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className={cn(
            "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
            isHot ? "bg-[#D9F564] text-zinc-900" : "bg-amber-900/40 text-amber-300",
          )}
        >
          {isHot ? <Flame className="h-4.5 w-4.5" /> : <Snowflake className="h-4.5 w-4.5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] uppercase tracking-wider font-bold",
                isHot ? "border-[#D9F564] text-[#D9F564] bg-transparent" : "border-amber-700 text-amber-400 bg-transparent",
              )}
            >
              {isHot ? "Match Quente" : "Deal Esfriando"}
            </Badge>
            {card.match_score != null && (
              <span className="text-[11px] text-zinc-400">Score {Math.round(card.match_score * 100)}</span>
            )}
            {card.days_inactive != null && (
              <span className="text-[11px] text-amber-300 inline-flex items-center gap-1">
                <Clock className="h-3 w-3" /> {card.days_inactive}d sem contato
              </span>
            )}
            {card.mandate_value != null && (
              <span className="text-[11px] text-zinc-500">{fmtBRL(card.mandate_value)}</span>
            )}
          </div>
          <div className="text-zinc-100 font-semibold text-sm break-words">{card.headline}</div>
          <div className="text-zinc-400 text-xs mt-0.5 break-words">{card.subline}</div>
          {card.contact_name && (
            <div className="text-zinc-500 text-[11px] mt-1.5">
              Contato: <span className="text-zinc-300">{card.contact_name}</span>
              {card.contact_phone && <span className="text-zinc-600"> · {card.contact_phone}</span>}
            </div>
          )}
        </div>
      </div>
      <CardActions card={card} onDismiss={onDismiss} />
    </div>
  );
}

export default function TodayPage() {
  const { data: cards = [], isLoading, error } = useTodayCards(7);
  const dismiss = useDismissCard();

  const handleDismiss = (card: TodayCard) => {
    dismiss.mutate(
      { refId: card.ref_id, cardKind: card.card_kind, snoozeHours: 24 },
      {
        onSuccess: () => toast.success("Card dispensado por 24h"),
        onError: () => toast.error("Não foi possível dispensar"),
      },
    );
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-6 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 text-[#D9F564]" />
            <h1 className="text-2xl md:text-3xl font-bold text-zinc-100">Hoje</h1>
          </div>
          <p className="text-sm text-zinc-400 break-words">
            As <span className="text-[#D9F564] font-semibold">{cards.length || "—"} ações</span> que mais importam agora.
            A Mari priorizou pra você. Foque, dispense ou deixe para depois.
          </p>
        </div>

        {/* Insights proativos da Mari */}
        <MariInsightsSection />

        {/* Leads da Calculadora pública */}
        <div className="mt-4">
          <MariLeadCard />
        </div>

        {/* Conteúdo */}
        {isLoading && (
          <div className="flex items-center gap-3 text-zinc-400 py-12 justify-center">
            <Loader2 className="h-5 w-5 animate-spin" /> Carregando seu dia…
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-rose-900/40 bg-rose-950/20 p-4 text-rose-300 text-sm">
            Falha ao carregar: {(error as Error).message}
          </div>
        )}
        {!isLoading && !error && cards.length === 0 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-10 text-center">
            <div className="text-5xl mb-3">🎯</div>
            <div className="text-zinc-200 font-semibold mb-1">Tudo em dia</div>
            <p className="text-sm text-zinc-400 max-w-md mx-auto">
              Nenhum match quente ou deal esfriando agora. Aproveite para revisar o pipeline ou tomar um café.
            </p>
            <Link to="/equity-brain/crm">
              <Button variant="outline" className="mt-4 bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                Ir pro CRM <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        )}
        {cards.length > 0 && (
          <div className="space-y-4">
            {cards.map((card) => (
              <TodayCardItem key={`${card.card_kind}-${card.ref_id}`} card={card} onDismiss={() => handleDismiss(card)} />
            ))}
          </div>
        )}

        {/* Footer */}
        {cards.length > 0 && (
          <div className="mt-8 pt-6 border-t border-zinc-800 text-center text-[11px] text-zinc-500">
            Cards atualizados a cada minuto • Para o cockpit completo, use o{" "}
            <Link to="/equity-brain" className="text-emerald-400 hover:text-emerald-300">Equity Brain</Link>
          </div>
        )}
      </div>
    </div>
  );
}
