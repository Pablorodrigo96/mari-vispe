import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeftRight, ArrowRight, Flame } from "lucide-react";
import { useMatchInbox, useMatchPercentiles, tierForScore } from "@/hooks/useMatchInbox";
import { cn } from "@/lib/utils";
import { brl } from "@/lib/dealFormatters";
import { InfoHint } from "@/components/equity-brain/InfoHint";

export function MatchHotHero() {
  const { data: pcts } = useMatchPercentiles();
  const { data: rows = [], isLoading } = useMatchInbox({ minScore: pcts?.warm ?? 40, limit: 50 });

  const hot = rows.filter((r) => r.match_score >= (pcts?.hot ?? 70));
  const warm = rows.filter((r) => r.match_score >= (pcts?.warm ?? 50) && r.match_score < (pcts?.hot ?? 70));
  const top5 = rows.slice(0, 5);

  return (
    <div className="relative overflow-hidden rounded-xl border border-[#D9F564]/30 bg-gradient-to-br from-[#D9F564]/10 via-zinc-900 to-zinc-950 p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-[#D9F564]">
            <Flame className="h-3.5 w-3.5" /> Matches do dia
            <InfoHint
              title="Matches IA"
              what="Pares vendedor↔comprador calculados automaticamente pelo motor com base em setor, geografia, porte e tese."
              action="Os mais quentes são prioridade — clique em 'Abrir' e contate hoje."
            />
          </div>
          <h2 className="text-2xl font-bold text-zinc-100 mt-1">
            {isLoading ? "Calculando…" : (
              <>
                Hoje você tem <span className="text-[#D9F564]">{hot.length}</span> matches quentes
                {warm.length > 0 && <span className="text-zinc-400 text-base font-normal"> · {warm.length} mornos</span>}
              </>
            )}
          </h2>
          <p className="text-xs text-zinc-400 mt-1 break-words">
            Top {top5.length} pares ordenados por score do motor IA. Clique para abrir o mandato ou empresa.
          </p>
        </div>
        <Link to="/equity-brain/match-inbox"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-[#D9F564] text-zinc-900 text-sm font-bold hover:opacity-90">
          <ArrowLeftRight className="h-4 w-4" /> Ver Match Inbox completa
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {!isLoading && top5.length === 0 ? (
        <div className="text-xs text-zinc-500 py-6 text-center">
          Nenhum match calculado ainda. Rode <code className="text-zinc-400">match-batch</code> no painel de Auditoria.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {top5.map((r) => {
            const tier = tierForScore(r.match_score, pcts);
            return (
              <Link key={r.id}
                to={r.mandate_id ? `/equity-brain/crm/mandate/${r.mandate_id}` : `/equity-brain/empresa/${r.cnpj}`}
                className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-3 hover:border-[#D9F564]/40 transition-colors group">
                <div className="flex items-center justify-between mb-2">
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded border tabular-nums font-bold", tier.cls)}>
                    {tier.emoji} {Math.round(r.match_score)}
                  </span>
                  <span className="text-[9px] text-zinc-500">{r.uf ?? "—"}</span>
                </div>
                <div className="text-[11px] font-semibold text-zinc-100 truncate break-words">
                  {r.codename ?? r.razao_social ?? r.cnpj}
                </div>
                <div className="text-[10px] text-zinc-500 truncate">↔ {r.buyer_nome ?? "Comprador"}</div>
                <div className="text-[10px] text-zinc-600 mt-1 truncate">
                  {r.setor_ma ?? "—"}
                  {r.faturamento_estimado ? <> · {brl(r.faturamento_estimado, { compact: true })}</> : null}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
