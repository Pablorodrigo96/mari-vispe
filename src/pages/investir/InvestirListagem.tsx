import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { InvestirShell, SectionEyebrow } from "@/components/investir/InvestirShell";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search, SlidersHorizontal, ArrowUpDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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

const RISK_LABELS: Record<string, string> = { low: "Baixo", medium: "Médio", high: "Alto" };
const INSTRUMENT_LABELS: Record<string, string> = {
  equity: "Equity",
  debt: "Dívida",
  cic: "CIC",
  receivable: "Recebível",
  revenue_share: "Revenue share",
};

export default function InvestirListagem() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [instrument, setInstrument] = useState<string>("all");
  const [risk, setRisk] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"recent" | "raised" | "ticket">("recent");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("tokens")
        .select("*")
        .order("created_at", { ascending: false });
      setTokens((data as Token[]) || []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    let arr = [...tokens];
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      arr = arr.filter(t => t.name.toLowerCase().includes(s) || t.symbol.toLowerCase().includes(s));
    }
    if (instrument !== "all") arr = arr.filter(t => t.instrument_type === instrument);
    if (risk !== "all") arr = arr.filter(t => (t.risk_level || "") === risk);
    if (status !== "all") arr = arr.filter(t => t.status === status);
    if (sortBy === "raised") arr.sort((a,b)=>(b.amount_raised||0)-(a.amount_raised||0));
    if (sortBy === "ticket") arr.sort((a,b)=>(a.min_ticket||0)-(b.min_ticket||0));
    return arr;
  }, [tokens, q, instrument, risk, status, sortBy]);

  return (
    <InvestirShell>
      <div className="border-b border-bone/10 bg-graphite/30">
        <div className="max-w-[1400px] mx-auto px-6 py-12">
          <SectionEyebrow>Catálogo</SectionEyebrow>
          <h1 className="mt-3 text-4xl md:text-5xl font-semibold tracking-tight">
            Empresas tokenizadas
          </h1>
          <p className="mt-3 text-bone/60 max-w-2xl">
            Explore as empresas privadas disponíveis para reserva ou negociação. Filtre por
            instrumento, risco, liquidez esperada e ticket mínimo.
          </p>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-8 grid lg:grid-cols-[260px_1fr] gap-8">
        {/* Sidebar filtros */}
        <aside className="space-y-6">
          <div>
            <Label icon={<Search className="w-3.5 h-3.5" />}>Busca</Label>
            <Input
              placeholder="Nome ou símbolo..."
              value={q}
              onChange={e => setQ(e.target.value)}
              className="bg-graphite/40 border-bone/10 text-bone placeholder:text-bone/30"
            />
          </div>

          <FilterGroup
            label="Instrumento"
            value={instrument}
            onChange={setInstrument}
            options={[
              ["all", "Todos"],
              ["equity", "Equity"],
              ["debt", "Dívida"],
              ["cic", "CIC"],
              ["receivable", "Recebível"],
              ["revenue_share", "Revenue share"],
            ]}
          />
          <FilterGroup
            label="Risco"
            value={risk}
            onChange={setRisk}
            options={[["all","Todos"],["low","Baixo"],["medium","Médio"],["high","Alto"]]}
          />
          <FilterGroup
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              ["all","Todos"],
              ["primary_open","Oferta aberta"],
              ["approved","Em breve"],
              ["issued","Emitida"],
              ["secondary_open","Mercado 2º"],
              ["primary_closed","Encerrada"],
            ]}
          />
        </aside>

        {/* Lista */}
        <section>
          <div className="flex items-center justify-between mb-4 text-sm">
            <div className="text-bone/60 tabular-nums">
              {loading ? "Carregando..." : `${filtered.length} ${filtered.length === 1 ? "empresa" : "empresas"}`}
            </div>
            <div className="flex items-center gap-2 text-bone/60">
              <ArrowUpDown className="w-3.5 h-3.5" />
              <select
                value={sortBy}
                onChange={e=>setSortBy(e.target.value as any)}
                className="bg-graphite/40 border border-bone/10 rounded px-2 py-1 text-xs text-bone"
              >
                <option value="recent">Mais recentes</option>
                <option value="raised">Mais captados</option>
                <option value="ticket">Menor ticket</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({length:8}).map((_,i)=>(<Skeleton key={i} className="h-16 bg-graphite/30" />))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="border border-dashed border-bone/15 rounded-xl p-12 text-center text-bone/60">
              Nenhum ativo encontrado com esses filtros.
            </div>
          ) : (
            <div className="border border-bone/10 rounded-xl overflow-hidden bg-graphite/20">
              <div className="grid grid-cols-[1.5fr_0.8fr_0.7fr_0.9fr_1fr_0.8fr_0.6fr] gap-4 px-5 py-3 text-[10px] uppercase tracking-wider text-bone/40 bg-carbon/40 border-b border-bone/10">
                <div>Empresa</div>
                <div>Instrumento</div>
                <div>Risco</div>
                <div className="text-right">Preço/token</div>
                <div className="text-right">Ticket mínimo</div>
                <div className="text-right">% Captado</div>
                <div className="text-right">Status</div>
              </div>
              {filtered.map(t => <Row key={t.id} t={t} />)}
            </div>
          )}
        </section>
      </div>
    </InvestirShell>
  );
}

function Row({ t }: { t: Token }) {
  const pct = t.total_offering_amount ? Math.min(100, (t.amount_raised / t.total_offering_amount) * 100) : 0;
  return (
    <Link
      to={`/investir/ativo/${t.symbol}`}
      className="grid grid-cols-[1.5fr_0.8fr_0.7fr_0.9fr_1fr_0.8fr_0.6fr] gap-4 px-5 py-4 items-center text-sm border-b border-bone/5 last:border-b-0 hover:bg-volt/5 transition-colors group"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded bg-volt/10 border border-volt/20 grid place-items-center text-[10px] font-mono text-volt shrink-0">
          {t.symbol.slice(0,3)}
        </div>
        <div className="min-w-0">
          <div className="text-bone group-hover:text-volt truncate font-medium">{t.name}</div>
          <div className="text-[11px] font-mono text-bone/40">{t.symbol}</div>
        </div>
      </div>
      <div className="text-bone/70 text-xs">{INSTRUMENT_LABELS[t.instrument_type] || t.instrument_type}</div>
      <div className="text-bone/70 text-xs">{RISK_LABELS[t.risk_level || ""] || "—"}</div>
      <div className="text-right font-mono tabular-nums text-bone">{fmtBRL(t.initial_price)}</div>
      <div className="text-right font-mono tabular-nums text-bone/80">{fmtBRL(t.min_ticket)}</div>
      <div className="text-right">
        <div className="font-mono tabular-nums text-bone/80 text-xs mb-1">{pct.toFixed(0)}%</div>
        <div className="h-1 bg-carbon/80 rounded-full overflow-hidden">
          <div className="h-full bg-volt" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="text-right">
        <span className="text-[10px] uppercase tracking-wider bg-volt/10 text-volt px-2 py-0.5 rounded">
          {STATUS_LABELS[t.status] || t.status}
        </span>
      </div>
    </Link>
  );
}

function Label({ children, icon }: any) {
  return <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-bone/40 mb-2">{icon}{children}</div>;
}

function FilterGroup({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string)=>void; options: [string,string][] }) {
  return (
    <div>
      <Label icon={<SlidersHorizontal className="w-3.5 h-3.5" />}>{label}</Label>
      <div className="space-y-1">
        {options.map(([v, l]) => (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={`block w-full text-left text-xs px-3 py-1.5 rounded transition-colors ${
              value === v ? "bg-volt/15 text-volt" : "text-bone/60 hover:text-bone hover:bg-bone/5"
            }`}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}
