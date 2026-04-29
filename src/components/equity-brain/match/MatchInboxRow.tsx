import { Link } from "react-router-dom";
import { Phone, Mail, MessageCircle, ArrowRight, Building2, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { brl } from "@/lib/dealFormatters";
import { tierForScore, type MatchInboxRow as Row } from "@/hooks/useMatchInbox";
import { getWhatsAppLink } from "@/lib/whatsapp";

interface Props {
  row: Row;
  percentiles?: { hot: number; warm: number };
  onOpen?: (row: Row) => void;
}

export function MatchInboxRow({ row, percentiles, onOpen }: Props) {
  const tier = tierForScore(row.match_score, percentiles);
  const wa = getWhatsAppLink(`Olá! Falo da mari sobre uma oportunidade compatível com seu perfil de investimento (${row.setor_ma ?? "—"} / ${row.uf ?? "BR"}).`);

  return (
    <div className="border border-zinc-800 rounded-lg bg-zinc-900/60 hover:border-zinc-700 p-3 transition-colors">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Score badge */}
        <div className={cn("flex flex-col items-center justify-center w-14 h-14 rounded border tabular-nums shrink-0", tier.cls)}>
          <div className="text-lg leading-none">{tier.emoji}</div>
          <div className="text-sm font-bold leading-none mt-0.5">{Math.round(row.match_score)}</div>
        </div>

        {/* Mandate side */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-zinc-500">
            <Building2 className="h-3 w-3" /> Vendedor
          </div>
          <div className="text-sm font-semibold text-zinc-100 truncate break-words">
            {row.codename ?? row.razao_social ?? row.cnpj}
          </div>
          <div className="text-[10px] text-zinc-500 truncate">
            {[row.setor_ma, row.uf].filter(Boolean).join(" · ") || "—"}
            {row.faturamento_estimado ? <> · {brl(row.faturamento_estimado, { compact: true })}</> : null}
          </div>
        </div>

        <ArrowRight className="h-4 w-4 text-zinc-600 shrink-0" />

        {/* Buyer side */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-zinc-500">
            <Target className="h-3 w-3" /> Comprador
          </div>
          <div className="text-sm font-semibold text-zinc-100 truncate break-words">
            {row.buyer_nome ?? "Comprador"}
          </div>
          <div className="text-[10px] text-zinc-500 truncate">
            {row.buyer_tipo ?? "—"}
            {row.ticket_min || row.ticket_max ? (
              <> · {brl(row.ticket_min ?? 0, { compact: true })}–{brl(row.ticket_max ?? 0, { compact: true })}</>
            ) : null}
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-1 shrink-0">
          <a href={wa} target="_blank" rel="noopener noreferrer"
            title="WhatsApp"
            className="h-8 w-8 inline-flex items-center justify-center rounded border border-zinc-800 bg-transparent text-zinc-300 hover:text-emerald-300 hover:border-emerald-700">
            <MessageCircle className="h-3.5 w-3.5" />
          </a>
          <a href={`tel:`} title="Ligar"
            className="h-8 w-8 inline-flex items-center justify-center rounded border border-zinc-800 bg-transparent text-zinc-300 hover:text-[#D9F564] hover:border-zinc-600">
            <Phone className="h-3.5 w-3.5" />
          </a>
          <a href={`mailto:`} title="Email"
            className="h-8 w-8 inline-flex items-center justify-center rounded border border-zinc-800 bg-transparent text-zinc-300 hover:text-[#D9F564] hover:border-zinc-600">
            <Mail className="h-3.5 w-3.5" />
          </a>
          {row.mandate_id ? (
            <Link to={`/equity-brain/crm/mandate/${row.mandate_id}`}
              className="text-[11px] px-2.5 h-8 inline-flex items-center gap-1 rounded bg-[#D9F564] text-zinc-900 font-semibold hover:opacity-90">
              Abrir
            </Link>
          ) : (
            <Link to={`/equity-brain/empresa/${row.cnpj}`}
              className="text-[11px] px-2.5 h-8 inline-flex items-center gap-1 rounded border border-[#D9F564]/40 text-[#D9F564] hover:bg-[#D9F564]/10">
              Empresa
            </Link>
          )}
        </div>
      </div>

      {/* Sub-row: signals */}
      <div className="mt-2 flex items-center gap-3 flex-wrap text-[10px] text-zinc-500">
        {row.thesis_key && (
          <span className="px-1.5 py-0.5 rounded bg-blue-950/40 text-blue-300 border border-blue-900/60">
            tese: {row.thesis_key}
          </span>
        )}
        {row.setor_fit !== null && <span>setor {(Number(row.setor_fit) * 100).toFixed(0)}%</span>}
        {row.geografia_fit !== null && <span>geo {(Number(row.geografia_fit) * 100).toFixed(0)}%</span>}
        {row.porte_fit !== null && <span>porte {(Number(row.porte_fit) * 100).toFixed(0)}%</span>}
        {row.mandate_outcome && (
          <span className="ml-auto px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
            mandato: {row.mandate_outcome}
          </span>
        )}
      </div>
    </div>
  );
}
