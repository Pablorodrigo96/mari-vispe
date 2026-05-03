import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Newspaper, ExternalLink, TrendingUp, Building2, Crown, Megaphone, Scale, Users, Sparkles, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type EventType =
  | "ma_closed" | "ma_announced" | "funding_round" | "ipo"
  | "leadership_change" | "expansion" | "regulatory" | "generic";

interface NewsItem {
  id: string;
  title: string;
  summary: string | null;
  source_url: string;
  source_domain: string | null;
  published_at: string | null;
  ingested_at: string;
  event_type: EventType;
  event_data: any;
  status: string;
}

const EVENT_META: Record<EventType, { label: string; color: string; Icon: any }> = {
  ma_closed:         { label: "M&A fechado",       color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40", Icon: TrendingUp },
  ma_announced:      { label: "M&A anunciado",     color: "bg-blue-500/20 text-blue-300 border-blue-500/40",         Icon: Megaphone },
  funding_round:     { label: "Captação",          color: "bg-violet-500/20 text-violet-300 border-violet-500/40",   Icon: Sparkles },
  ipo:               { label: "IPO",               color: "bg-amber-500/20 text-amber-300 border-amber-500/40",      Icon: Crown },
  leadership_change: { label: "Liderança",         color: "bg-pink-500/20 text-pink-300 border-pink-500/40",         Icon: Users },
  expansion:         { label: "Expansão",          color: "bg-teal-500/20 text-teal-300 border-teal-500/40",         Icon: Building2 },
  regulatory:        { label: "Regulatório",       color: "bg-orange-500/20 text-orange-300 border-orange-500/40",   Icon: Scale },
  generic:           { label: "Notícia",           color: "bg-zinc-500/20 text-zinc-300 border-zinc-500/40",         Icon: Newspaper },
};

function formatBRL(n: number | null | undefined) {
  if (!n && n !== 0) return null;
  if (n >= 1_000_000_000) return `R$ ${(n / 1_000_000_000).toFixed(1)}bi`;
  if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)}mi`;
  return `R$ ${n.toLocaleString("pt-BR")}`;
}

function formatRelative(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "hoje";
  if (days === 1) return "ontem";
  if (days < 7) return `há ${days}d`;
  if (days < 30) return `há ${Math.floor(days / 7)}sem`;
  return d.toLocaleDateString("pt-BR");
}

interface Props {
  cnpj?: string | null;
  buyerId?: string | null;
  listingId?: string | null;
  limit?: number;
  emptyMessage?: string;
}

export function NewsPanel({ cnpj, buyerId, listingId, limit = 30, emptyMessage }: Props) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let q = (supabase as any).schema("equity_brain").from("company_news")
        .select("*")
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("ingested_at", { ascending: false })
        .limit(limit);
      if (cnpj) q = q.eq("cnpj", cnpj);
      else if (buyerId) q = q.eq("buyer_id", buyerId);
      else if (listingId) q = q.eq("listing_id", listingId);
      const { data, error } = await q;
      if (cancelled) return;
      if (error) console.error("NewsPanel", error);
      setItems((data ?? []) as NewsItem[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [cnpj, buyerId, listingId, limit]);

  if (loading) {
    return <div className="text-xs text-zinc-400 p-4">Carregando notícias…</div>;
  }
  if (items.length === 0) {
    return (
      <div className="text-xs text-zinc-500 p-6 text-center bg-zinc-900/30 border border-zinc-800 rounded">
        {emptyMessage ?? "Nenhuma notícia coletada ainda. O sistema varre fontes brasileiras a cada hora."}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((n) => {
        const meta = EVENT_META[n.event_type] ?? EVENT_META.generic;
        const ev = n.event_data ?? {};
        const isMa = ["ma_closed", "ma_announced", "funding_round", "ipo"].includes(n.event_type);
        return (
          <article
            key={n.id}
            className={cn(
              "border rounded-lg p-4 space-y-2 transition-colors",
              isMa ? "bg-gradient-to-br from-zinc-900/80 to-emerald-950/20 border-emerald-900/40"
                   : "bg-zinc-900/40 border-zinc-800 hover:border-zinc-700",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border", meta.color)}>
                  <meta.Icon className="h-3 w-3" /> {meta.label}
                </span>
                <span className="text-[10px] text-zinc-500 truncate">{n.source_domain ?? ""}</span>
                <span className="text-[10px] text-zinc-500">· {formatRelative(n.published_at ?? n.ingested_at)}</span>
              </div>
              <a
                href={n.source_url} target="_blank" rel="noopener noreferrer"
                className="text-zinc-400 hover:text-emerald-300 shrink-0"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
            <h4 className="text-sm font-semibold text-zinc-100 break-words leading-snug">{n.title}</h4>
            {n.summary && (
              <p className="text-xs text-zinc-400 break-words leading-relaxed line-clamp-3">{n.summary}</p>
            )}
            {isMa && (ev.ev_brl || ev.ebitda_multiple || ev.comprador) && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-800/50">
                {ev.comprador && (
                  <span className="text-[11px] text-zinc-300"><b className="text-zinc-500">Comprador:</b> {ev.comprador}</span>
                )}
                {ev.vendedor && (
                  <span className="text-[11px] text-zinc-300"><b className="text-zinc-500">Target:</b> {ev.vendedor}</span>
                )}
                {ev.ev_brl && (
                  <span className="text-[11px] text-emerald-300"><b className="text-zinc-500">EV:</b> {formatBRL(ev.ev_brl)}</span>
                )}
                {ev.ebitda_multiple && (
                  <span className="text-[11px] text-emerald-300"><b className="text-zinc-500">Múltiplo:</b> {ev.ebitda_multiple}x EBITDA</span>
                )}
                {ev.advisors_financeiros?.length > 0 && (
                  <span className="text-[11px] text-zinc-400"><b className="text-zinc-500">Advisors:</b> {ev.advisors_financeiros.join(", ")}</span>
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
