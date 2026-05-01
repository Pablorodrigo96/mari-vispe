import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, Send, X, Star, Rocket, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBuyerMatches, useMandateMatches, useLogActivity } from "@/hooks/useCrm";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { QualificationBadge } from "./QualificationBadge";
import { QualifyLeadButton } from "./QualifyLeadButton";
import { ExpandRFBDialog } from "./ExpandRFBDialog";
import { usePromoteMatchToDeal } from "@/hooks/useDeal";
import { InfoHint } from "@/components/equity-brain/InfoHint";

type Mode =
  | { type: "buyer"; buyerId: string; buyerSetores?: string[]; buyerUfs?: string[] }
  | { type: "mandate"; cnpj: string; mandateId: string };

type Filter = "qualified" | "all" | "rfb";

/**
 * Lista ranqueada de matches. Lê qualification_status e source da CONTRAPARTE
 * (preenchidos por useBuyerMatches/useMandateMatches via join leve).
 */
export function MatchesPanel({ mode, entityName }: { mode: Mode; entityName: string }) {
  const buyerQ = useBuyerMatches(mode.type === "buyer" ? mode.buyerId : undefined);
  const mandateQ = useMandateMatches(mode.type === "mandate" ? mode.cnpj : undefined);
  const allItems = (mode.type === "buyer" ? buyerQ.data : mandateQ.data) ?? [];
  const isLoading = mode.type === "buyer" ? buyerQ.isLoading : mandateQ.isLoading;
  const refetch = mode.type === "buyer" ? buyerQ.refetch : mandateQ.refetch;
  const log = useLogActivity();
  const promote = usePromoteMatchToDeal();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<any | null>(null);
  const [filter, setFilter] = useState<Filter>("qualified");

  // Quando modo=buyer, contraparte é company; quando modo=mandate, contraparte é buyer
  const counterpartType: "company" | "buyer" = mode.type === "buyer" ? "company" : "buyer";
  const getQual = (m: any) =>
    (m.counterpart_qualification_status ?? m.qualification_status) as string | undefined;
  const getCounterpartId = (m: any): string =>
    counterpartType === "company" ? (m.cnpj ?? "") : (m.buyer_id ?? "");
  const isFromRfb = (m: any) =>
    (m.counterpart_source ?? m.source ?? "") === "rfb_expand";

  const counts = useMemo(() => ({
    qualified: allItems.filter((m: any) => getQual(m) === "qualified").length,
    all: allItems.length,
    rfb: allItems.filter(isFromRfb).length,
  }), [allItems]);

  const items = useMemo(() => {
    if (filter === "qualified") return allItems.filter((m: any) => getQual(m) === "qualified");
    if (filter === "rfb") return allItems.filter(isFromRfb);
    return allItems;
  }, [allItems, filter]);

  function actDismiss(m: any) {
    log.mutate({
      entity_type: mode.type === "buyer" ? "buyer" : "mandate",
      entity_id: mode.type === "buyer" ? mode.buyerId : mode.mandateId,
      kind: "match_dismissed",
      direction: "system",
      body: `Match descartado: ${m.razao_social ?? m.cnpj ?? m.buyer_name ?? "—"}`,
      metadata: { match_id: m.id, score: m.match_score },
    });
  }
  function actMarkInterest(m: any) {
    log.mutate({
      entity_type: mode.type === "buyer" ? "buyer" : "mandate",
      entity_id: mode.type === "buyer" ? mode.buyerId : mode.mandateId,
      kind: "interest_marked",
      direction: "out",
      body: `Interesse marcado: ${m.razao_social ?? m.cnpj ?? m.buyer_name ?? "—"}`,
      metadata: { match_id: m.id, score: m.match_score },
    });
  }
  function actSendTeaser(m: any) {
    log.mutate({
      entity_type: mode.type === "buyer" ? "buyer" : "mandate",
      entity_id: mode.type === "buyer" ? mode.buyerId : mode.mandateId,
      kind: "teaser_sent",
      direction: "out",
      body: `Teaser enviado para ${m.razao_social ?? m.buyer_name ?? "—"}`,
      metadata: { match_id: m.id },
    });
  }

  const Toolbar = (
    <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
      <div className="flex items-center gap-1 bg-zinc-900/60 border border-zinc-800 rounded p-0.5">
        {([
          { k: "qualified", label: `Qualificados (${counts.qualified})` },
          { k: "all", label: `Todos (${counts.all})` },
          { k: "rfb", label: `Vindos da Receita Federal (${counts.rfb})` },
        ] as { k: Filter; label: string }[]).map((t) => (
          <button key={t.k} onClick={() => setFilter(t.k)}
            className={`text-[11px] px-2.5 py-1 rounded transition-colors ${
              filter === t.k ? "bg-emerald-600 text-zinc-950 font-medium" : "text-zinc-400 hover:text-zinc-100"
            }`}>{t.label}</button>
        ))}
        <InfoHint
          title="O que é cada filtro?"
          what="Qualificados: contraparte aprovada pela curadoria. Todos: tudo que o motor encontrou. Vindos da Receita Federal: matches gerados a partir da expansão na Base RFB (botão 'Expandir busca')."
          action="Se 'Vindos da Receita Federal' está zerado, é porque ninguém rodou expansão para esse buyer ainda."
          className="!ml-1"
        />
      </div>
      {mode.type === "buyer" && (
        <ExpandRFBDialog
          buyerId={mode.buyerId}
          defaultSetores={mode.buyerSetores}
          defaultUfs={mode.buyerUfs}
          onCompleted={() => refetch?.()}
        />
      )}
    </div>
  );

  if (isLoading) return <>{Toolbar}<div className="p-4 text-xs text-zinc-400">Carregando matches…</div></>;

  return (
    <>
      {Toolbar}
      {items.length === 0 ? (
        <div className="p-4 text-xs text-zinc-400 border border-dashed border-zinc-800 rounded">
          Nenhum match {filter === "qualified" ? "qualificado" : filter === "rfb" ? "vindo da Receita Federal" : ""} disponível ainda.
          {mode.type === "buyer" && filter !== "rfb" && (
            <span className="block mt-1 text-zinc-500">Use o botão "Expandir busca na Base RFB" para importar prospects.</span>
          )}
          {filter === "qualified" && counts.all > 0 && (
            <span className="block mt-1 text-zinc-500">
              Existem {counts.all} matches no total — mude o filtro para "Todos" se quiser ver os ainda não qualificados.
            </span>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {items.slice(0, 25).map((m: any) => {
            const score = Number(m.match_score ?? 0);
            const scorePct = Math.round(score * 100);
            const accent =
              score >= 0.8 ? "text-emerald-300 border-emerald-700/60 bg-emerald-950/30"
                : score >= 0.6 ? "text-amber-300 border-amber-700/60 bg-amber-950/20"
                : "text-zinc-300 border-zinc-700/60 bg-zinc-900/40";
            const qual = getQual(m);
            const counterpartId = getCounterpartId(m);
            return (
              <div key={m.id} className="flex items-center gap-3 p-3 border border-zinc-800 bg-zinc-900/40 rounded">
                <div className={`text-xs font-bold px-2 py-1 rounded border ${accent}`}>{scorePct}%</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="text-sm text-zinc-100 break-words font-medium">
                      {m.razao_social ?? m.buyer_name ?? m.cnpj ?? "—"}
                    </div>
                    <QualificationBadge status={qual} size="xs" />
                    {isFromRfb(m) && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded border border-zinc-700 bg-zinc-900 text-zinc-400">RFB</span>
                    )}
                  </div>
                  <div className="text-[11px] text-zinc-400 break-words">
                    {[m.uf, m.setor_ma, m.ticket_band].filter(Boolean).join(" · ") || "—"}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  {qual === "unqualified" && counterpartId && (
                    <QualifyLeadButton
                      entityType={counterpartType}
                      entityId={counterpartId}
                      onQualified={() => refetch?.()}
                    />
                  )}
                  <Button size="sm" variant="outline"
                    className="h-7 bg-transparent border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                    onClick={() => navigate(`/equity-brain/match/${m.id}`)}>
                    <ArrowUpRight className="h-3 w-3 mr-1" /> Abrir match
                  </Button>
                  <Button size="sm" variant="outline"
                    disabled={promote.isPending}
                    className="h-7 bg-[#D9F564]/10 border-[#D9F564]/40 text-[#D9F564] hover:bg-[#D9F564]/20"
                    onClick={async () => {
                      const dealId = await promote.mutateAsync(m.id);
                      if (dealId) navigate(`/equity-brain/crm/pipeline?deal=${dealId}`);
                    }}>
                    <Rocket className="h-3 w-3 mr-1" /> Pipeline
                  </Button>
                  <Button size="sm" variant="outline"
                    className="h-7 bg-transparent border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                    onClick={() => actMarkInterest(m)}>
                    <Star className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline"
                    className="h-7 bg-transparent border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                    onClick={() => actSendTeaser(m)}>
                    <Send className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline"
                    className="h-7 bg-transparent border-zinc-700 text-zinc-400 hover:text-rose-300 hover:bg-zinc-800"
                    onClick={() => actDismiss(m)}>
                    <X className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline"
                    className="h-7 bg-transparent border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                    onClick={() => setSelected(m)}>
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="bg-zinc-950 border-zinc-800 text-zinc-100 w-[420px]">
          <SheetHeader>
            <SheetTitle className="text-zinc-100">Por que esse match?</SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="mt-4 space-y-3 text-xs">
              <div className="text-zinc-300">
                <span className="text-zinc-500">Contraparte:</span> <span className="font-medium">{selected.razao_social ?? selected.buyer_name ?? selected.cnpj}</span>
              </div>
              <div className="text-zinc-300">
                <span className="text-zinc-500">Score:</span> <span className="font-bold text-emerald-300">{Math.round(Number(selected.match_score ?? 0) * 100)}%</span>
              </div>
              <div className="space-y-1">
                {[
                  ["Setor", selected.score_setor],
                  ["Região / UF", selected.score_regiao],
                  ["Ticket", selected.score_ticket],
                  ["Maturidade", selected.score_maturidade],
                  ["Sinal revelado (v2)", selected.score_revealed],
                ].filter(([,v]) => v != null).map(([k,v]: any) => (
                  <div key={k} className="flex items-center gap-2">
                    <div className="w-28 text-[10px] uppercase text-zinc-500">{k}</div>
                    <div className="flex-1 h-1.5 bg-zinc-900 rounded">
                      <div className="h-1.5 rounded bg-emerald-500" style={{ width: `${Math.max(0, Math.min(100, Math.round(Number(v) * 100)))}%` }} />
                    </div>
                    <div className="w-10 text-right text-[10px] text-zinc-300">{Math.round(Number(v) * 100)}%</div>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-zinc-800 text-[11px] text-zinc-400 break-words">
                {selected.explain ?? `Compatibilidade calculada pelo Equity Brain v2 entre ${entityName} e contraparte.`}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
