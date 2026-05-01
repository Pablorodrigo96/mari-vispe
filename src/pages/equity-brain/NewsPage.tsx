import { useEffect, useState } from "react";
import { Newspaper, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { NewsPanel } from "@/components/equity-brain/news/NewsPanel";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const TYPES = ["all", "ma_closed", "ma_announced", "funding_round", "ipo", "leadership_change", "expansion", "regulatory", "generic"];
const TYPE_LABEL: Record<string, string> = {
  all: "Todos",
  ma_closed: "M&A fechado",
  ma_announced: "M&A anunciado",
  funding_round: "Captação",
  ipo: "IPO",
  leadership_change: "Liderança",
  expansion: "Expansão",
  regulatory: "Regulatório",
  generic: "Outras",
};

export default function NewsPage() {
  const [filter, setFilter] = useState("all");
  const [stats, setStats] = useState<{ total: number; last7d: number; last30d: number }>({ total: 0, last7d: 0, last30d: 0 });
  const [running, setRunning] = useState(false);

  async function loadStats() {
    const now = Date.now();
    const d7 = new Date(now - 7 * 86400000).toISOString();
    const d30 = new Date(now - 30 * 86400000).toISOString();
    const [{ count: total }, { count: c7 }, { count: c30 }] = await Promise.all([
      (supabase as any).schema("equity_brain").from("company_news").select("*", { count: "exact", head: true }),
      (supabase as any).schema("equity_brain").from("company_news").select("*", { count: "exact", head: true }).gte("ingested_at", d7),
      (supabase as any).schema("equity_brain").from("company_news").select("*", { count: "exact", head: true }).gte("ingested_at", d30),
    ]);
    setStats({ total: total ?? 0, last7d: c7 ?? 0, last30d: c30 ?? 0 });
  }

  useEffect(() => { loadStats(); }, []);

  async function triggerRun(scope: string) {
    setRunning(true);
    toast.info(`Disparando varredura (${scope})…`);
    const { data, error } = await supabase.functions.invoke("ingest-company-news", {
      body: { scope, limit: 30 },
    });
    setRunning(false);
    if (error) toast.error("Erro: " + error.message);
    else toast.success(`Coleta concluída: ${data?.inserted ?? 0} novas notícias.`);
    loadStats();
  }

  return (
    <div className="p-6 space-y-4 bg-zinc-950 min-h-full">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <Newspaper className="h-6 w-6 text-[#D9F564]" />
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Inteligência de Notícias</h1>
            <p className="text-xs text-zinc-400">Varredura automática de portais brasileiros (Valor, NeoFeed, InfoMoney, Exame, etc.)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => triggerRun("mandates")} disabled={running}
                  className="bg-transparent border-zinc-700 text-zinc-200 hover:bg-zinc-800 text-[11px]">
            <RefreshCw className={`h-3 w-3 mr-1 ${running ? "animate-spin" : ""}`} /> Coletar mandatos
          </Button>
          <Button variant="outline" size="sm" onClick={() => triggerRun("all")} disabled={running}
                  className="bg-transparent border-[#D9F564]/40 text-[#D9F564] hover:bg-[#D9F564]/10 text-[11px]">
            <RefreshCw className={`h-3 w-3 mr-1 ${running ? "animate-spin" : ""}`} /> Coletar tudo
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-3">
        {[{ k: "total", v: stats.total, label: "Total no banco" },
          { k: "last30d", v: stats.last30d, label: "Últimos 30 dias" },
          { k: "last7d", v: stats.last7d, label: "Últimos 7 dias" }].map((s) => (
          <div key={s.k} className="bg-zinc-900/60 border border-zinc-800 rounded p-3">
            <div className="text-[10px] uppercase text-zinc-400">{s.label}</div>
            <div className="text-2xl font-bold text-[#D9F564]">{s.v.toLocaleString("pt-BR")}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1 border-b border-zinc-800 pb-2">
        {TYPES.map((t) => (
          <button key={t} onClick={() => setFilter(t)}
            className={`px-3 py-1 text-[11px] rounded ${filter === t ? "bg-[#D9F564] text-black font-bold" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}`}>
            {TYPE_LABEL[t]}
          </button>
        ))}
      </div>

      {filter === "all" ? (
        <NewsPanel limit={50} />
      ) : (
        <FilteredNewsPanel eventType={filter} />
      )}
    </div>
  );
}

function FilteredNewsPanel({ eventType }: { eventType: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any).schema("equity_brain").from("company_news")
        .select("*").eq("event_type", eventType)
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("ingested_at", { ascending: false })
        .limit(50);
      setItems(data ?? []);
      setLoading(false);
    })();
  }, [eventType]);

  if (loading) return <div className="text-xs text-zinc-400 p-4">Carregando…</div>;
  if (items.length === 0) return <div className="text-xs text-zinc-500 p-6 text-center">Nenhuma notícia deste tipo ainda.</div>;
  // Reaproveita renderização individual via NewsPanel — passamos cnpj=null e filtramos client-side
  return (
    <div className="space-y-3">
      {items.map((n) => (
        <a key={n.id} href={n.source_url} target="_blank" rel="noopener noreferrer"
           className="block bg-zinc-900/40 border border-zinc-800 rounded-lg p-4 hover:border-emerald-700 transition-colors">
          <div className="text-[10px] text-zinc-500">{n.source_domain} · {n.published_at ? new Date(n.published_at).toLocaleDateString("pt-BR") : "data ?"}</div>
          <h4 className="text-sm font-semibold text-zinc-100 break-words mt-1">{n.title}</h4>
          {n.summary && <p className="text-xs text-zinc-400 mt-2 break-words line-clamp-3">{n.summary}</p>}
        </a>
      ))}
    </div>
  );
}
