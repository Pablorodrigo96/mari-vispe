import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Building2, Target, Phone, Mail,
  Eye, Rocket, ShieldCheck, Copy, Loader2, Hash,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { brl } from "@/lib/dealFormatters";
import { useMatchById } from "@/hooks/useMatchById";
import { tierForScore, useMatchPercentiles } from "@/hooks/useMatchInbox";
import { useMatchContacts, type MatchContact } from "@/hooks/useMatchContacts";
import { useIdentityVisibility } from "@/hooks/useIdentityVisibility";
import { normalizeBrPhone } from "@/lib/whatsapp";
import { WhatsAppActionButton } from "@/components/whatsapp/WhatsAppActionButton";
import { QuickStartMandateDialog } from "@/components/equity-brain/match/QuickStartMandateDialog";
import { AddContactDialog } from "@/components/equity-brain/match/AddContactDialog";
import { RequestDisclosureDialog } from "@/components/equity-brain/RequestDisclosureDialog";
import { MatchWhyCard } from "@/components/equity-brain/match/MatchWhyCard";
import { GeneratePitchCard } from "@/components/equity-brain/match/GeneratePitchCard";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { OUTCOMES, relativeTime } from "@/lib/equityBrain";
import { EntityNotes } from "@/components/equity-brain/notes/EntityNotes";
import { cn } from "@/lib/utils";

function ContactRow({
  c, side, matchId, buyerId,
}: { c: MatchContact; side: "buyer" | "seller"; matchId?: string | null; buyerId?: string | null; }) {
  const phone = normalizeBrPhone(c.telefone_e164);
  return (
    <div className="border border-zinc-800 rounded p-2.5 flex items-center gap-2 bg-zinc-900/40">
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium text-zinc-100 truncate break-words">
          {c.nome ?? "Sem nome"}
          {c.cargo && <span className="text-zinc-500 font-normal"> · {c.cargo}</span>}
          {c.is_primary && <span className="ml-1 text-[9px] text-[#D9F564]">PRIMÁRIO</span>}
        </div>
        <div className="text-[10px] text-zinc-500 truncate">
          {c.telefone_e164 ?? "sem telefone"} · {c.email ?? "sem email"}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <WhatsAppActionButton
          phone={c.telefone_e164}
          contactId={c.id ?? null}
          matchId={matchId ?? null}
          buyerId={side === "buyer" ? (buyerId ?? null) : null}
          contactName={c.nome ?? null}
          draftType={side === "buyer" ? "match_announcement" : "first_contact"}
          source="match_detail"
          variant="outline"
          size="sm"
          label="WA"
          className="h-7 px-2 text-[10px] bg-transparent border-zinc-800 text-emerald-300 hover:border-emerald-700"
        />
        {phone ? (
          <a href={`tel:+${phone}`} title="Ligar" className="h-7 w-7 inline-flex items-center justify-center rounded border border-zinc-800 bg-transparent text-zinc-300 hover:text-[#D9F564]">
            <Phone className="h-3 w-3" />
          </a>
        ) : (
          <span className="h-7 w-7 inline-flex items-center justify-center rounded border border-zinc-800 text-zinc-700" title="Sem telefone"><Phone className="h-3 w-3" /></span>
        )}
        {c.email ? (
          <a href={`mailto:${c.email}`} title="Email" className="h-7 w-7 inline-flex items-center justify-center rounded border border-zinc-800 bg-transparent text-zinc-300 hover:text-[#D9F564]">
            <Mail className="h-3 w-3" />
          </a>
        ) : (
          <span className="h-7 w-7 inline-flex items-center justify-center rounded border border-zinc-800 text-zinc-700" title="Sem e-mail"><Mail className="h-3 w-3" /></span>
        )}
      </div>
    </div>
  );
}

function useCompanyCallHistory(cnpj?: string | null) {
  return useQuery({
    queryKey: ["eb-call-history", cnpj ?? null],
    enabled: !!cnpj,
    queryFn: async () => {
      const { data } = await supabase
        .from("eb_call_feedback" as any)
        .select("id, call_at, outcome, interest_level, raw_notes, dor_principal, timing_estimado")
        .eq("cnpj", cnpj as string)
        .order("call_at", { ascending: false })
        .limit(10);
      return (data ?? []) as any[];
    },
    staleTime: 60_000,
  });
}

export default function MatchDetailPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { data: row, isLoading } = useMatchById(matchId);
  const { data: pcts } = useMatchPercentiles();
  const { data: canSee } = useIdentityVisibility({ cnpj: row?.cnpj });
  const { data: contacts, isLoading: loadingContacts } = useMatchContacts(row?.cnpj, row?.buyer_id);
  const { data: calls = [] } = useCompanyCallHistory(row?.cnpj);

  if (isLoading) {
    return (
      <div className="p-12 flex items-center justify-center text-zinc-400 text-sm">
        <Loader2 className="h-5 w-5 animate-spin mr-2 text-[#D9F564]" /> Carregando match…
      </div>
    );
  }
  if (!row) {
    return (
      <div className="p-12 text-center text-zinc-400">
        <div className="text-sm mb-2">Match não encontrado.</div>
        <Button variant="ghost" onClick={() => navigate(-1)} className="text-zinc-300 hover:text-zinc-100">
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
      </div>
    );
  }

  const tier = tierForScore(row.match_score, pcts);
  const sellerName = canSee ? (row.razao_social ?? row.codename ?? row.cnpj) : (row.codename ?? "Vendedor cego");
  const sellerLink = `/equity-brain/empresa/${row.cnpj}`;
  const buyerLink = `/equity-brain/crm/buyer/${row.buyer_id}`;
  const matchShortId = `MATCH-${(matchId ?? "").slice(0, 6).toUpperCase()}`;

  function copyMatchUrl() {
    const url = `${window.location.origin}/equity-brain/match/${matchId}`;
    navigator.clipboard.writeText(url);
    toast.success("Link do match copiado");
  }

  return (
    <div className="p-6 space-y-5 bg-zinc-950 min-h-full max-w-6xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <Link to="/equity-brain/match-inbox" className="text-[11px] text-zinc-500 hover:text-zinc-300 inline-flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Match Inbox
        </Link>
        <div className="flex items-start gap-3 flex-wrap">
          <div className={cn("flex flex-col items-center justify-center w-16 h-16 rounded border tabular-nums shrink-0", tier.cls)}>
            <div className="text-2xl leading-none">{tier.emoji}</div>
            <div className="text-base font-bold leading-none mt-0.5">{Math.round(row.match_score)}</div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap text-[11px] text-zinc-400">
              <span className="font-mono inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[#D9F564]">
                <Hash className="h-3 w-3" /> {matchShortId}
              </span>
              <button onClick={copyMatchUrl} title="Copiar link" className="text-zinc-400 hover:text-[#D9F564]">
                <Copy className="h-3 w-3" />
              </button>
              <span>· Tier {tier.label}</span>
              {row.computed_at && <span>· Calculado {relativeTime(row.computed_at)}</span>}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 mt-1 break-words">
              {sellerName} <ArrowRight className="inline h-5 w-5 text-zinc-600 mx-1" /> {row.buyer_nome ?? "Comprador"}
            </h1>
          </div>
        </div>
      </div>

      {/* Main two-column */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Vendedor */}
        <div className="rounded border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-500 mb-2">
            <Building2 className="h-3 w-3" /> Vendedor
            {canSee ? (
              <span className="ml-auto inline-flex items-center gap-1 text-[#D9F564]">
                <ShieldCheck className="h-3 w-3" /> identidade revelada
              </span>
            ) : (
              <span className="ml-auto text-zinc-500">cego</span>
            )}
          </div>
          <div className="text-sm font-semibold text-zinc-100 break-words">{sellerName}</div>
          <div className="text-[11px] text-zinc-400 break-words mt-0.5">
            {[row.setor_ma, row.uf].filter(Boolean).join(" · ") || "—"}
            {row.faturamento_estimado ? <> · Fat. {brl(row.faturamento_estimado, { compact: true })}</> : null}
          </div>
          {canSee && row.cnpj && <div className="text-[10px] text-zinc-500 mt-1 font-mono">CNPJ: {row.cnpj}</div>}
          {row.codename && <div className="text-[10px] text-amber-300 mt-0.5 font-mono">{row.codename}</div>}

          <div className="mt-3 flex flex-wrap gap-1.5">
            <Link to={sellerLink}
              className="text-[11px] px-2.5 h-8 inline-flex items-center gap-1 rounded border border-[#D9F564]/40 text-[#D9F564] hover:bg-[#D9F564]/10">
              <Eye className="h-3 w-3" /> Abrir 360 da empresa
            </Link>
            {row.mandate_id ? (
              <Link to={`/equity-brain/crm/mandate/${row.mandate_id}`}
                className="text-[11px] px-2.5 h-8 inline-flex items-center gap-1 rounded bg-[#D9F564] text-zinc-900 font-semibold hover:opacity-90">
                <Rocket className="h-3 w-3" /> Abrir mandato
              </Link>
            ) : (
              <QuickStartMandateDialog
                cnpj={row.cnpj}
                buyerId={row.buyer_id}
                buyerNome={row.buyer_nome}
                setor={row.setor_ma}
                uf={row.uf}
                faturamento={row.faturamento_estimado}
              />
            )}
            {!canSee && (
              <RequestDisclosureDialog
                targetKind="company"
                targetCnpj={row.cnpj}
                codename={row.codename ?? undefined}
                trigger={
                  <button className="text-[11px] px-2.5 h-8 inline-flex items-center gap-1 rounded border border-amber-700/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20">
                    Solicitar abertura
                  </button>
                }
              />
            )}
          </div>
        </div>

        {/* Comprador */}
        <div className="rounded border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-500 mb-2">
            <Target className="h-3 w-3" /> Comprador
          </div>
          <div className="text-sm font-semibold text-zinc-100 break-words">{row.buyer_nome ?? "—"}</div>
          <div className="text-[11px] text-zinc-400 break-words mt-0.5">
            {row.buyer_tipo ?? "—"}
            {(row.ticket_min || row.ticket_max) && (
              <> · Ticket {brl(row.ticket_min ?? 0, { compact: true })}–{brl(row.ticket_max ?? 0, { compact: true })}</>
            )}
          </div>
          {row.buyer_setores?.length ? (
            <div className="text-[10px] text-zinc-500 mt-1 break-words">Setores: {row.buyer_setores.join(", ")}</div>
          ) : null}
          {row.buyer_ufs?.length ? (
            <div className="text-[10px] text-zinc-500 break-words">UFs: {row.buyer_ufs.join(", ")}</div>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Link to={buyerLink}
              className="text-[11px] px-2.5 h-8 inline-flex items-center gap-1 rounded border border-[#D9F564]/40 text-[#D9F564] hover:bg-[#D9F564]/10">
              <Eye className="h-3 w-3" /> Abrir 360 do comprador
            </Link>
          </div>
        </div>
      </div>

      {/* Por que esse match — agora com SHAP completo, p_close, EV, razões e contrafactual */}
      <MatchWhyCard match={row} />

      {/* Mari sugere o pitch (IA) */}
      <GeneratePitchCard cnpj={row.cnpj} buyerId={row.buyer_id} />

      {/* Contatos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Contatos do comprador</div>
            <AddContactDialog entityType="buyer" entityId={row.buyer_id} entityLabel={row.buyer_nome ?? undefined} />
          </div>
          {loadingContacts ? (
            <div className="text-[11px] text-zinc-500">carregando…</div>
          ) : contacts?.buyerAll?.length ? (
            <div className="space-y-1.5">
              {contacts.buyerAll.map((c, i) => <ContactRow key={c.id ?? i} c={c} side="buyer" matchId={matchId} buyerId={row.buyer_id} />)}
            </div>
          ) : (
            <div className="text-[11px] text-zinc-500 italic">Sem contato cadastrado para este comprador.</div>
          )}
        </div>

        <div className="rounded border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Contatos do vendedor</div>
            <AddContactDialog entityType="company" entityId={row.cnpj} entityLabel={sellerName ?? undefined} />
          </div>
          {loadingContacts ? (
            <div className="text-[11px] text-zinc-500">carregando…</div>
          ) : contacts?.sellerAll?.length ? (
            <div className="space-y-1.5">
              {contacts.sellerAll.map((c, i) => <ContactRow key={c.id ?? i} c={c} side="seller" matchId={matchId} buyerId={row.buyer_id} />)}
            </div>
          ) : (
            <div className="text-[11px] text-zinc-500 italic">Sem contato cadastrado para este vendedor.</div>
          )}
        </div>
      </div>

      {/* Histórico de contato */}
      <div className="rounded border border-zinc-800 bg-zinc-900/60 p-4">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">
          Histórico de contato com o vendedor ({calls.length})
        </div>
        {calls.length === 0 ? (
          <div className="text-[11px] text-zinc-500 italic">Sem histórico ainda. Faça o primeiro contato e registre na ficha.</div>
        ) : (
          <div className="space-y-2">
            {calls.map((c: any) => {
              const out = OUTCOMES.find((o) => o.value === c.outcome);
              return (
                <div key={c.id} className="text-xs flex items-start gap-2 border-l-2 border-zinc-800 pl-3 py-1">
                  <div className="text-zinc-500 font-mono shrink-0 w-24">
                    {new Date(c.call_at).toLocaleDateString("pt-BR")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {out && <span className={cn("px-1.5 py-0.5 rounded text-[10px]", out.cls)}>{out.label}</span>}
                      {c.interest_level && (
                        <span className="text-amber-400 text-[10px]">{"★".repeat(c.interest_level)}</span>
                      )}
                      {c.timing_estimado && <span className="text-[10px] text-zinc-500">timing: {c.timing_estimado}</span>}
                    </div>
                    {c.dor_principal && <div className="text-zinc-300 mt-1 break-words">{c.dor_principal}</div>}
                    {c.raw_notes && <div className="text-zinc-400 mt-1 break-words line-clamp-3">{c.raw_notes}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Notas internas (advisor) */}
      {matchId && (
        <div className="rounded border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-3">
            Notas internas deste match
          </div>
          <EntityNotes entityType="match" entityId={matchId} allowedVisibilities={["internal"]} />
        </div>
      )}
    </div>
  );
}
