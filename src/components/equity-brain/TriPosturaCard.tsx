import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Briefcase, ShoppingCart, Handshake, Loader2 } from "lucide-react";
import { useTriPostura, type TriPosturaItem } from "@/hooks/useTriPostura";
import { cn } from "@/lib/utils";

type Posture = "sell" | "buy" | "partner";

const TABS: { key: Posture; label: string; icon: any; tone: string; emptyMsg: string }[] = [
  { key: "sell", label: "Como vendedor", icon: Briefcase, tone: "text-[#D9F564] border-[#D9F564]/40", emptyMsg: "Sem compradores compatíveis ainda." },
  { key: "buy", label: "Como comprador", icon: ShoppingCart, tone: "text-blue-300 border-blue-400/40", emptyMsg: "Esta empresa ainda não está cadastrada como buyer." },
  { key: "partner", label: "Como parceiro", icon: Handshake, tone: "text-amber-300 border-amber-400/40", emptyMsg: "Sem sinergias setoriais identificadas." },
];

interface Props {
  cnpj: string;
}

/**
 * Tri-Postura: mostra a mesma empresa em 3 papéis simultâneos.
 * Mostra top 5 contrapartes compatíveis em cada direção (vendedor / comprador / parceiro).
 */
export function TriPosturaCard({ cnpj }: Props) {
  const [tab, setTab] = useState<Posture>("sell");
  const { data, isLoading } = useTriPostura(cnpj);

  const items: TriPosturaItem[] = data ? data[tab] : [];
  const meta = TABS.find(t => t.key === tab)!;

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40">
      <div className="flex items-center gap-1 border-b border-zinc-800 px-2 overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-[11px] border-b-2 -mb-px transition-colors whitespace-nowrap",
                active
                  ? `${t.tone} border-current`
                  : "border-transparent text-zinc-500 hover:text-zinc-200",
              )}
            >
              <Icon className="h-3.5 w-3.5" /> {t.label}
              {data && (
                <span className="ml-1 text-[10px] text-zinc-600 tabular-nums">
                  ({data[t.key].length})
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="p-3">
        {isLoading ? (
          <div className="py-6 text-center text-xs text-zinc-500 inline-flex items-center justify-center w-full gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Calculando posturas…
          </div>
        ) : items.length === 0 ? (
          <div className="py-6 text-center text-xs text-zinc-500 italic">
            {meta.emptyMsg}
          </div>
        ) : (
          <ul className="space-y-1.5">
            {items.map(item => (
              <li key={item.id}>
                <Link
                  to={item.link ?? "#"}
                  className="flex items-center gap-2 px-2 py-1.5 rounded border border-zinc-800/60 bg-zinc-950/40 hover:border-zinc-700 hover:bg-zinc-900/60 text-xs group"
                >
                  <span className="flex-1 min-w-0 truncate text-zinc-100 break-words">
                    {item.counterparty_name}
                  </span>
                  {item.reason && (
                    <span className="text-[10px] text-zinc-500 truncate max-w-[40%]">
                      {item.reason}
                    </span>
                  )}
                  {item.score != null && (
                    <span className={cn(
                      "text-[10px] font-mono px-1.5 py-0.5 rounded border tabular-nums",
                      meta.tone,
                    )}>
                      {Math.round(item.score)}
                    </span>
                  )}
                  <ArrowUpRight className="h-3 w-3 text-zinc-600 group-hover:text-zinc-300" />
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-2 pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-600 break-words">
          Toda empresa do Equity Brain pode atuar nos 3 papéis ao mesmo tempo —
          vendendo ativo, adquirindo concorrente ou formando parceria estratégica.
        </div>
      </div>
    </div>
  );
}
