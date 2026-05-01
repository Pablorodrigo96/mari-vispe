import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Newspaper, ExternalLink, ArrowRight } from "lucide-react";
import { InfoHint } from "@/components/equity-brain/InfoHint";

interface NewsRow {
  id: string;
  title: string;
  source_domain: string | null;
  published_at: string | null;
  ingested_at: string;
  event_type: string;
  event_data: any;
  cnpj: string | null;
  source_url: string;
}

const TYPE_LABEL: Record<string, string> = {
  ma_closed: "M&A fechado",
  ma_announced: "M&A anunciado",
  funding_round: "Captação",
  ipo: "IPO",
  leadership_change: "Liderança",
};

export function MarketPulseWidget() {
  const [items, setItems] = useState<NewsRow[]>([]);
  const [counts, setCounts] = useState<{ type: string; n: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data: rows } = await (supabase as any).schema("equity_brain")
        .from("company_news")
        .select("id,title,source_domain,published_at,ingested_at,event_type,event_data,cnpj,source_url")
        .in("event_type", ["ma_closed", "ma_announced", "funding_round", "ipo", "leadership_change"])
        .gte("ingested_at", since)
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("ingested_at", { ascending: false })
        .limit(10);
      setItems((rows ?? []) as NewsRow[]);

      const cmap: Record<string, number> = {};
      for (const r of rows ?? []) {
        cmap[r.event_type] = (cmap[r.event_type] ?? 0) + 1;
      }
      setCounts(Object.entries(cmap).map(([type, n]) => ({ type, n })));
      setLoading(false);
    })();
  }, []);

  return (
    <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Newspaper className="h-4 w-4 text-[#D9F564]" />
          <h3 className="text-sm font-bold text-zinc-100">Pulso de Mercado</h3>
          <InfoHint text="Notícias de M&A, captação, IPO e mudança de liderança detectadas pela varredura automática nos últimos 30 dias." />
        </div>
        <Link to="/equity-brain/news" className="text-[10px] text-emerald-300 hover:text-emerald-200 inline-flex items-center gap-1">
          Ver todas <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {counts.length > 0 && (
        <div className="flex flex-wrap gap-2 text-[10px]">
          {counts.map((c) => (
            <span key={c.type} className="px-2 py-0.5 bg-zinc-800/60 border border-zinc-700 rounded text-zinc-300">
              {TYPE_LABEL[c.type] ?? c.type}: <b className="text-emerald-300">{c.n}</b>
            </span>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-[11px] text-zinc-500">Carregando…</div>
      ) : items.length === 0 ? (
        <div className="text-[11px] text-zinc-500">Sem notícias recentes.</div>
      ) : (
        <ul className="space-y-2 max-h-72 overflow-y-auto">
          {items.map((n) => (
            <li key={n.id} className="text-[11px] border-l-2 border-emerald-700/40 pl-2 py-1">
              <a href={n.source_url} target="_blank" rel="noopener noreferrer"
                 className="text-zinc-200 hover:text-emerald-300 break-words line-clamp-2 inline-flex items-start gap-1">
                {n.title}
                <ExternalLink className="h-2.5 w-2.5 mt-0.5 shrink-0" />
              </a>
              <div className="text-[9px] text-zinc-500 mt-0.5">
                {TYPE_LABEL[n.event_type] ?? n.event_type} · {n.source_domain ?? ""}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
