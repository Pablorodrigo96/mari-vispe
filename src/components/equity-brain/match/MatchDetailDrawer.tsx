import { Link } from "react-router-dom";
import { ArrowRight, Building2, Target, MessageCircle, Phone, Mail, Eye, Rocket, ShieldCheck } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { brl } from "@/lib/dealFormatters";
import { tierForScore, type MatchInboxRow } from "@/hooks/useMatchInbox";
import { useMatchContacts, type MatchContact } from "@/hooks/useMatchContacts";
import { useIdentityVisibility } from "@/hooks/useIdentityVisibility";
import { getWhatsAppLink, normalizeBrPhone } from "@/lib/whatsapp";
import { QuickStartMandateDialog } from "./QuickStartMandateDialog";
import { AddContactDialog } from "./AddContactDialog";
import { MatchWhyCard } from "./MatchWhyCard";
import { useMatchById } from "@/hooks/useMatchById";
import { RequestDisclosureDialog } from "@/components/equity-brain/RequestDisclosureDialog";
import { cn } from "@/lib/utils";

interface Props {
  row: MatchInboxRow | null;
  onClose: () => void;
  percentiles?: { hot: number; warm: number };
}

function ContactRow({ c, side }: { c: MatchContact; side: "buyer" | "seller" }) {
  const phone = normalizeBrPhone(c.telefone_e164);
  const wa = phone
    ? getWhatsAppLink(
        side === "buyer"
          ? `Olá ${c.nome ?? ""}! Falo da mari sobre uma oportunidade compatível com seu perfil de investimento.`
          : `Olá ${c.nome ?? ""}! Falo da mari, identifiquei investidores qualificados interessados na sua empresa.`,
        phone,
      )
    : null;
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
        {wa ? (
          <a href={wa} target="_blank" rel="noopener noreferrer" title="WhatsApp"
            className="h-7 w-7 inline-flex items-center justify-center rounded border border-zinc-800 bg-transparent text-emerald-300 hover:border-emerald-700">
            <MessageCircle className="h-3 w-3" />
          </a>
        ) : (
          <span className="h-7 w-7 inline-flex items-center justify-center rounded border border-zinc-800 text-zinc-700" title="Sem WhatsApp">
            <MessageCircle className="h-3 w-3" />
          </span>
        )}
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

export function MatchDetailDrawer({ row, onClose, percentiles }: Props) {
  const open = !!row;
  const { data: canSee } = useIdentityVisibility({ cnpj: row?.cnpj });
  const { data: contacts, isLoading: loadingContacts } = useMatchContacts(row?.cnpj, row?.buyer_id);
  // Enrich the row with explainability fields if missing (inbox row may not include them).
  const needsEnrich = !!row && row.feature_contributions == null && row.ai_thesis_summary == null;
  const { data: enriched } = useMatchById(needsEnrich ? row?.id : undefined);
  if (!row) return null;
  const fullRow = enriched ?? row;
  const tier = tierForScore(row.match_score, percentiles);

  const sellerName = canSee
    ? row.razao_social ?? row.codename ?? row.cnpj
    : row.codename ?? row.cnpj;

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="right" className="bg-zinc-950 border-zinc-800 w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="text-zinc-100 flex items-center gap-2">
            <span className={cn("flex flex-col items-center justify-center w-12 h-12 rounded border", tier.cls)}>
              <span className="text-lg leading-none">{tier.emoji}</span>
              <span className="text-xs font-bold leading-none mt-0.5">{Math.round(row.match_score)}</span>
            </span>
            <span className="text-base">Detalhe do match</span>
          </SheetTitle>
          <SheetDescription className="text-zinc-400 text-xs">
            Tier: <span className="text-zinc-200">{tier.label}</span>
            {percentiles && <> · 🔥 ≥{percentiles.hot} · ⚡ ≥{percentiles.warm}</>}
          </SheetDescription>
        </SheetHeader>

        {/* Sides */}
        <div className="mt-4 grid grid-cols-1 gap-3">
          <div className="rounded border border-zinc-800 bg-zinc-900/60 p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
              <Building2 className="h-3 w-3" /> Vendedor
              {canSee ? (
                <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-[#D9F564]">
                  <ShieldCheck className="h-3 w-3" /> identidade revelada
                </span>
              ) : (
                <span className="ml-auto text-[10px] text-zinc-500">cego</span>
              )}
            </div>
            <div className="text-sm font-semibold text-zinc-100 break-words">{sellerName}</div>
            <div className="text-[11px] text-zinc-400 break-words">
              {[row.setor_ma, row.uf].filter(Boolean).join(" · ") || "—"}
              {row.faturamento_estimado ? <> · Fat. {brl(row.faturamento_estimado, { compact: true })}</> : null}
            </div>
            {canSee && row.cnpj && (
              <div className="text-[10px] text-zinc-500 mt-1">CNPJ: {row.cnpj}</div>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {row.mandate_id ? (
                <Link to={`/equity-brain/crm/mandate/${row.mandate_id}`} onClick={onClose}
                  className="text-[11px] px-2 h-7 inline-flex items-center gap-1 rounded bg-[#D9F564] text-zinc-900 font-semibold hover:opacity-90">
                  Abrir mandato
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
              <Link to={`/equity-brain/empresa/${row.cnpj}`} onClick={onClose}
                className="text-[11px] px-2 h-7 inline-flex items-center gap-1 rounded border border-zinc-700 bg-transparent text-zinc-200 hover:text-[#D9F564]">
                <Eye className="h-3 w-3" /> 360 da empresa
              </Link>
              {!canSee && (
                <RequestDisclosureDialog
                  targetKind="company"
                  targetCnpj={row.cnpj}
                  codename={row.codename ?? undefined}
                  trigger={
                    <button className="text-[11px] px-2 h-7 inline-flex items-center gap-1 rounded border border-amber-700/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20">
                      Solicitar abertura
                    </button>
                  }
                />
              )}
            </div>
          </div>

          <div className="text-center text-zinc-600"><ArrowRight className="h-4 w-4 mx-auto rotate-90" /></div>

          <div className="rounded border border-zinc-800 bg-zinc-900/60 p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
              <Target className="h-3 w-3" /> Comprador
            </div>
            <div className="text-sm font-semibold text-zinc-100 break-words">{row.buyer_nome ?? "—"}</div>
            <div className="text-[11px] text-zinc-400 break-words">
              {row.buyer_tipo ?? "—"}
              {(row.ticket_min || row.ticket_max) && (
                <> · Ticket {brl(row.ticket_min ?? 0, { compact: true })}–{brl(row.ticket_max ?? 0, { compact: true })}</>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Link to={`/equity-brain/crm/buyer/${row.buyer_id}`} onClick={onClose}
                className="text-[11px] px-2 h-7 inline-flex items-center gap-1 rounded border border-[#D9F564]/40 text-[#D9F564] hover:bg-[#D9F564]/10">
                <Eye className="h-3 w-3" /> 360 do comprador
              </Link>
            </div>
          </div>
        </div>

        {/* Por que esse match — versão compacta com SHAP + cenários */}
        <div className="mt-5">
          <MatchWhyCard match={fullRow} compact />
        </div>

        {/* Contatos */}
        <div className="mt-5 space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[10px] uppercase tracking-wider text-zinc-500">Contatos do comprador</div>
              <AddContactDialog entityType="buyer" entityId={row.buyer_id} entityLabel={row.buyer_nome ?? undefined} />
            </div>
            {loadingContacts ? (
              <div className="text-[11px] text-zinc-500">carregando…</div>
            ) : contacts?.buyerAll && contacts.buyerAll.length > 0 ? (
              <div className="space-y-1.5">
                {contacts.buyerAll.map((c, i) => <ContactRow key={c.id ?? i} c={c} side="buyer" />)}
              </div>
            ) : (
              <div className="text-[11px] text-zinc-500 italic">Sem contato cadastrado para este comprador.</div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[10px] uppercase tracking-wider text-zinc-500">Contatos do vendedor</div>
              <AddContactDialog entityType="company" entityId={row.cnpj} entityLabel={sellerName} />
            </div>
            {loadingContacts ? (
              <div className="text-[11px] text-zinc-500">carregando…</div>
            ) : contacts?.sellerAll && contacts.sellerAll.length > 0 ? (
              <div className="space-y-1.5">
                {contacts.sellerAll.map((c, i) => <ContactRow key={c.id ?? i} c={c} side="seller" />)}
              </div>
            ) : (
              <div className="text-[11px] text-zinc-500 italic">Sem contato cadastrado para este vendedor.</div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-between items-center">
          <Link
            to={`/equity-brain/match/${row.id}`}
            onClick={onClose}
            className="text-[11px] inline-flex items-center gap-1 text-[#D9F564] hover:underline"
          >
            <Eye className="h-3 w-3" /> Ver página completa do match
          </Link>
          <Button variant="ghost" onClick={onClose} className="text-zinc-400 hover:text-zinc-100">Fechar</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
