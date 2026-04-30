import { Link } from "react-router-dom";
import { Phone, Mail, MessageCircle, ArrowRight, Building2, Target, Eye, Rocket, ShieldCheck, Lock, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { brl } from "@/lib/dealFormatters";
import { tierForScore, type MatchInboxRow as Row } from "@/hooks/useMatchInbox";
import { useMatchContacts } from "@/hooks/useMatchContacts";
import { useIdentityVisibility } from "@/hooks/useIdentityVisibility";
import { getWhatsAppLink, normalizeBrPhone } from "@/lib/whatsapp";
import { QuickStartMandateDialog } from "./QuickStartMandateDialog";

interface Props {
  row: Row;
  percentiles?: { hot: number; warm: number };
  onOpenDetail?: (row: Row) => void;
}

export function MatchInboxRow({ row, percentiles, onOpenDetail }: Props) {
  const tier = tierForScore(row.match_score, percentiles);
  const { data: canSee } = useIdentityVisibility({ cnpj: row.cnpj });
  const { data: contacts } = useMatchContacts(row.cnpj, row.buyer_id);

  const buyerPhone = normalizeBrPhone(contacts?.buyer?.telefone_e164);
  const buyerEmail = contacts?.buyer?.email ?? null;
  const sellerPhone = normalizeBrPhone(contacts?.seller?.telefone_e164);
  const sellerEmail = contacts?.seller?.email ?? null;

  const sellerName = canSee
    ? row.razao_social ?? row.codename ?? row.cnpj
    : row.codename ?? row.cnpj ?? "Vendedor cego";

  const sellerLink = row.mandate_id
    ? `/equity-brain/crm/mandate/${row.mandate_id}`
    : `/equity-brain/empresa/${row.cnpj}`;
  const buyerLink = `/equity-brain/crm/buyer/${row.buyer_id}`;

  const waBuyer = getWhatsAppLink(
    `Olá ${contacts?.buyer?.nome ?? ""}! Falo da mari sobre uma oportunidade compatível com seu perfil de investimento (${row.setor_ma ?? "—"} / ${row.uf ?? "BR"}).`,
    buyerPhone ?? undefined,
  );

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div
      className="border border-zinc-800 rounded-lg bg-zinc-900/60 hover:border-[#D9F564]/40 hover:bg-zinc-900 p-3 transition-colors cursor-pointer"
      onClick={() => onOpenDetail?.(row)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") onOpenDetail?.(row); }}
    >
      <div className="flex items-center gap-3 flex-wrap">
        {/* Score badge */}
        <div className={cn("flex flex-col items-center justify-center w-14 h-14 rounded border tabular-nums shrink-0", tier.cls)}>
          <div className="text-lg leading-none">{tier.emoji}</div>
          <div className="text-sm font-bold leading-none mt-0.5">{Math.round(row.match_score)}</div>
        </div>

        {/* Mandate side */}
        <Link to={sellerLink} onClick={stop} className="min-w-0 flex-1 group">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-zinc-500">
            <Building2 className="h-3 w-3" /> Vendedor
            {canSee ? (
              <span className="inline-flex items-center gap-1 text-[#D9F564] normal-case">
                <ShieldCheck className="h-3 w-3" /> identificado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-zinc-500 normal-case">
                <Lock className="h-3 w-3" /> cego
              </span>
            )}
          </div>
          <div className="text-sm font-semibold text-zinc-100 truncate break-words group-hover:text-[#D9F564] transition-colors">
            {sellerName}
          </div>
          <div className="text-[10px] text-zinc-500 truncate">
            {[row.setor_ma, row.uf].filter(Boolean).join(" · ") || "—"}
            {row.faturamento_estimado ? <> · {brl(row.faturamento_estimado, { compact: true })}</> : null}
          </div>
        </Link>

        <ArrowRight className="h-4 w-4 text-zinc-600 shrink-0" />

        {/* Buyer side */}
        <Link to={buyerLink} onClick={stop} className="min-w-0 flex-1 group">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-zinc-500">
            <Target className="h-3 w-3" /> Comprador
          </div>
          <div className="text-sm font-semibold text-zinc-100 truncate break-words group-hover:text-[#D9F564] transition-colors">
            {row.buyer_nome ?? "Comprador"}
          </div>
          <div className="text-[10px] text-zinc-500 truncate">
            {row.buyer_tipo ?? "—"}
            {row.ticket_min || row.ticket_max ? (
              <> · {brl(row.ticket_min ?? 0, { compact: true })}–{brl(row.ticket_max ?? 0, { compact: true })}</>
            ) : null}
          </div>
        </Link>

        {/* Quick actions */}
        <div className="flex items-center gap-1 shrink-0" onClick={stop}>
          <a
            href={waBuyer} target="_blank" rel="noopener noreferrer"
            title={buyerPhone ? `WhatsApp ${contacts?.buyer?.nome ?? "comprador"}` : "Sem WhatsApp do comprador (clique para abrir mensagem)"}
            className={cn(
              "h-8 w-8 inline-flex items-center justify-center rounded border bg-transparent hover:border-emerald-700 hover:text-emerald-300",
              buyerPhone ? "border-emerald-800/60 text-emerald-300" : "border-zinc-800 text-zinc-500"
            )}
          >
            <MessageCircle className="h-3.5 w-3.5" />
          </a>
          {buyerPhone ? (
            <a href={`tel:+${buyerPhone}`} title={`Ligar para ${contacts?.buyer?.nome ?? "comprador"}`}
              className="h-8 w-8 inline-flex items-center justify-center rounded border border-zinc-800 bg-transparent text-zinc-300 hover:text-[#D9F564] hover:border-zinc-600">
              <Phone className="h-3.5 w-3.5" />
            </a>
          ) : (
            <span className="h-8 w-8 inline-flex items-center justify-center rounded border border-zinc-900 text-zinc-700" title="Sem telefone do comprador">
              <Phone className="h-3.5 w-3.5" />
            </span>
          )}
          {buyerEmail ? (
            <a href={`mailto:${buyerEmail}`} title={`Email para ${buyerEmail}`}
              className="h-8 w-8 inline-flex items-center justify-center rounded border border-zinc-800 bg-transparent text-zinc-300 hover:text-[#D9F564] hover:border-zinc-600">
              <Mail className="h-3.5 w-3.5" />
            </a>
          ) : (
            <span className="h-8 w-8 inline-flex items-center justify-center rounded border border-zinc-900 text-zinc-700" title="Sem e-mail do comprador">
              <Mail className="h-3.5 w-3.5" />
            </span>
          )}

          {row.mandate_id ? (
            <Link
              to={`/equity-brain/crm/mandate/${row.mandate_id}`}
              onClick={stop}
              className="text-[11px] px-2.5 h-8 inline-flex items-center gap-1 rounded bg-[#D9F564] text-zinc-900 font-semibold hover:opacity-90"
              title="Abrir mandato"
            >
              Mandato
            </Link>
          ) : (
            <QuickStartMandateDialog
              cnpj={row.cnpj}
              buyerId={row.buyer_id}
              buyerNome={row.buyer_nome}
              setor={row.setor_ma}
              uf={row.uf}
              faturamento={row.faturamento_estimado}
              trigger={
                <button onClick={stop} className="text-[11px] px-2.5 h-8 inline-flex items-center gap-1 rounded bg-[#D9F564] text-zinc-900 font-semibold hover:opacity-90" title="Iniciar mandato a partir deste match">
                  <Rocket className="h-3 w-3" /> Iniciar
                </button>
              }
            />
          )}

          <Link
            to={`/equity-brain/match/${row.id}`}
            onClick={stop}
            title="Página completa do match"
            className="h-8 w-8 inline-flex items-center justify-center rounded border border-zinc-800 bg-transparent text-zinc-400 hover:text-[#D9F564] hover:border-zinc-600"
          >
            <Eye className="h-3.5 w-3.5" />
          </Link>
          <button
            onClick={(e) => { e.stopPropagation(); onOpenDetail?.(row); }}
            title="Preview do match"
            className="h-8 w-8 inline-flex items-center justify-center rounded border border-zinc-800 bg-transparent text-zinc-400 hover:text-[#D9F564] hover:border-zinc-600"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Sub-row: signals + top razões do motor (quando v2) */}
      <div className="mt-2 flex items-center gap-3 flex-wrap text-[10px] text-zinc-500">
        {row.thesis_key && (
          <span className="px-1.5 py-0.5 rounded bg-blue-950/40 text-blue-300 border border-blue-900/60">
            tese: {row.thesis_key}
          </span>
        )}
        {(() => {
          const fc = Array.isArray(row.feature_contributions) ? row.feature_contributions : [];
          if (fc.length > 0) {
            const top = [...fc]
              .sort((a, b) => Math.abs(Number(b?.contribution ?? 0)) - Math.abs(Number(a?.contribution ?? 0)))
              .slice(0, 3);
            return (
              <span className="inline-flex items-center gap-1.5 flex-wrap">
                <span className="text-zinc-600">por que:</span>
                {top.map((c) => {
                  const neg = Number(c?.contribution ?? 0) < 0;
                  return (
                    <span key={c.feature} className={cn(
                      "px-1.5 py-0.5 rounded border tabular-nums",
                      neg
                        ? "bg-rose-950/30 text-rose-300 border-rose-900/60"
                        : "bg-emerald-950/30 text-emerald-300 border-emerald-900/60"
                    )}>
                      {c.feature} {neg ? "" : "+"}{Number(c.contribution ?? 0).toFixed(2)}
                    </span>
                  );
                })}
              </span>
            );
          }
          return (
            <>
              {row.setor_fit !== null && <span>setor {(Number(row.setor_fit) * 100).toFixed(0)}%</span>}
              {row.geografia_fit !== null && <span>geo {(Number(row.geografia_fit) * 100).toFixed(0)}%</span>}
              {row.porte_fit !== null && <span>porte {(Number(row.porte_fit) * 100).toFixed(0)}%</span>}
            </>
          );
        })()}
        {row.p_close_12m != null && (
          <span className="px-1.5 py-0.5 rounded bg-emerald-950/30 text-emerald-300 border border-emerald-900/60 tabular-nums">
            p(close) {(Number(row.p_close_12m) * 100).toFixed(0)}%
          </span>
        )}
        {!buyerPhone && !buyerEmail && (
          <span className="text-amber-400">⚠ comprador sem contato cadastrado</span>
        )}
        {row.mandate_outcome && (
          <span className="ml-auto px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
            mandato: {row.mandate_outcome}
          </span>
        )}
      </div>
    </div>
  );
}
