import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { InvestirShell } from "@/components/investir/InvestirShell";
import { supabase } from "@/integrations/supabase/client";
import { Search, X, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { sectorPhoto } from "@/lib/investirPhotos";

type Token = {
  id: string;
  symbol: string;
  name: string;
  instrument_type: string;
  initial_price: number;
  min_ticket: number;
  total_offering_amount: number | null;
  amount_raised: number;
  status: string;
  risk_level: string | null;
  expected_liquidity: string | null;
  legal_instrument: string | null;
  offering_closes_at: string | null;
  listing_id: string | null;
  sector?: string | null;
};

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n || 0);

const STATUS_LABELS: Record<string, string> = {
  primary_open: "Aberta",
  primary_closed: "Encerrada",
  secondary_open: "Mercado 2º",
  approved: "Em breve",
  issued: "Emitida",
  suspended: "Suspensa",
  structuring: "Estruturando",
};

const FILTERS = [
  ["all", "Todas"],
  ["primary_open", "Abertas"],
  ["approved", "Em breve"],
  ["equity", "Equity"],
  ["debt", "Dívida"],
  ["revenue_share", "Revenue share"],
] as const;

export default function InvestirListagem() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"recent" | "raised" | "ticket">("recent");
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data }, { data: ures }] = await Promise.all([
        supabase.from("tokens").select("*").order("created_at", { ascending: false }),
        supabase.auth.getUser(),
      ]);
      setTokens((data as Token[]) || []);
      setAuthed(!!ures?.user);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    let arr = [...tokens];
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      arr = arr.filter((t) => t.name.toLowerCase().includes(s) || t.symbol.toLowerCase().includes(s));
    }
    if (filter !== "all") {
      arr = arr.filter((t) => t.status === filter || t.instrument_type === filter);
    }
    if (sortBy === "raised") arr.sort((a, b) => (b.amount_raised || 0) - (a.amount_raised || 0));
    if (sortBy === "ticket") arr.sort((a, b) => (a.min_ticket || 0) - (b.min_ticket || 0));
    return arr;
  }, [tokens, q, filter, sortBy]);

  return (
    <InvestirShell authed={authed}>
      {/* HEADER compacto */}
      <div className="border-b border-bone/10 bg-gradient-to-br from-carbon to-graphite/30">
        <div className="max-w-[1400px] mx-auto px-5 md:px-6 py-6 md:py-10">
          <h1 className="text-2xl md:text-4xl font-semibold tracking-tight text-bone">
            Investir em empresas
          </h1>
          <p className="mt-1.5 text-bone/60 text-sm md:text-base">
            Escolha um negócio brasileiro e vire sócio.
          </p>

          {/* Search */}
          <div className="relative mt-5">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-bone/40" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar empresa..."
              className="w-full bg-graphite/40 border border-bone/10 rounded-full pl-11 pr-10 py-3 text-sm text-bone placeholder:text-bone/40 focus:border-volt/40 focus:outline-none"
            />
            {q && (
              <button
                onClick={() => setQ("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-bone/40 hover:text-bone p-1"
                aria-label="Limpar"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Chips de filtro - scroll horizontal mobile */}
        <div className="max-w-[1400px] mx-auto px-5 md:px-6 pb-4">
          <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1 scrollbar-none">
            {FILTERS.map(([v, l]) => (
              <button
                key={v}
                onClick={() => setFilter(v)}
                className={`shrink-0 px-4 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                  filter === v
                    ? "bg-volt text-carbon border-volt"
                    : "bg-graphite/40 text-bone/70 border-bone/10 hover:border-bone/30"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-5 md:px-6 py-5 md:py-8">
        <div className="flex items-center justify-between mb-4 text-sm">
          <div className="text-bone/60 tabular-nums text-xs md:text-sm">
            {loading ? "Carregando..." : `${filtered.length} ${filtered.length === 1 ? "empresa" : "empresas"}`}
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-graphite/40 border border-bone/10 rounded-full px-3 py-1.5 text-xs text-bone"
          >
            <option value="recent">Mais recentes</option>
            <option value="raised">Mais captados</option>
            <option value="ticket">Menor ticket</option>
          </select>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-44 bg-graphite/30 rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="border border-dashed border-bone/15 rounded-2xl p-12 text-center text-bone/60">
            Nenhuma empresa encontrada.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((t) => (
              <ListingCard key={t.id} t={t} />
            ))}
          </div>
        )}
      </div>
    </InvestirShell>
  );
}

function ListingCard({ t }: { t: Token }) {
  const pct = t.total_offering_amount ? Math.min(100, (t.amount_raised / t.total_offering_amount) * 100) : 0;
  const isOpen = t.status === "primary_open";
  const img = sectorPhoto(t.sector || t.name);

  return (
    <Link
      to={`/investir/ativo/${t.symbol}`}
      className="group bg-graphite/30 border border-bone/10 hover:border-volt/40 rounded-2xl overflow-hidden transition-all active:scale-[0.99]"
    >
      <div className="flex md:block">
        {/* Imagem - lateral mobile, topo desktop */}
        <div className="w-28 md:w-full aspect-square md:aspect-[16/9] shrink-0 overflow-hidden bg-carbon relative">
          <img src={img} alt={t.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          <span
            className={`hidden md:inline absolute top-2.5 right-2.5 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold ${
              isOpen ? "bg-volt text-carbon" : "bg-bone/15 text-bone/80 backdrop-blur"
            }`}
          >
            {STATUS_LABELS[t.status] || t.status}
          </span>
        </div>

        <div className="flex-1 min-w-0 p-3 md:p-4">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="min-w-0">
              <div className="text-sm md:text-base font-semibold text-bone leading-tight truncate">{t.name}</div>
              <div className="text-[10px] font-mono text-bone/40 mt-0.5">{t.symbol}</div>
            </div>
            <span
              className={`md:hidden text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold shrink-0 ${
                isOpen ? "bg-volt text-carbon" : "bg-bone/15 text-bone/70"
              }`}
            >
              {isOpen ? "Aberta" : "Em breve"}
            </span>
          </div>

          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-[11px] text-bone/50">A partir de</span>
            <span className="text-base font-semibold text-bone tabular-nums">{fmtBRL(t.min_ticket)}</span>
          </div>

          <div className="mt-2">
            <div className="h-1 bg-carbon rounded-full overflow-hidden">
              <div className="h-full bg-volt" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-bone/45 mt-1">
              <span>{pct.toFixed(0)}% captado</span>
              {t.total_offering_amount && <span className="hidden md:inline">de {fmtBRL(t.total_offering_amount)}</span>}
            </div>
          </div>

          <div className="hidden md:flex items-center justify-end mt-3 text-xs text-volt font-medium">
            Ver oferta <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </Link>
  );
}
