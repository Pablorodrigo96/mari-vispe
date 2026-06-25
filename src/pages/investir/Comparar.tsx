import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { InvestirShell } from "@/components/investir/InvestirShell";
import { supabase } from "@/integrations/supabase/client";
import { GitCompareArrows, X, Plus, ArrowRight } from "lucide-react";
import { sectorToCover } from "@/data/socialSeed";

type TokenRow = {
  id: string;
  symbol: string;
  name: string;
  amount_raised: number | null;
  total_offering_amount: number | null;
  min_ticket: number | null;
  status: string | null;
  listing_id: string | null;
  sector?: string | null;
};

type ListingRow = {
  id: string;
  category: string | null;
  city: string | null;
  state: string | null;
  description: string | null;
};

const fmtBRL = (n: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n || 0);

export default function Comparar() {
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [listings, setListings] = useState<Record<string, ListingRow>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      setAuthed(!!u.user);

      const { data: tks } = await supabase
        .from("tokens")
        .select("id,symbol,name,amount_raised,total_offering_amount,min_ticket,status,listing_id")
        .limit(50);

      const list = (tks || []) as TokenRow[];
      setTokens(list);

      const ids = list.map((t) => t.listing_id).filter(Boolean) as string[];
      if (ids.length) {
        const { data: ls } = await supabase
          .from("listings")
          .select("id,category,city,state,description")
          .in("id", ids);
        const map: Record<string, ListingRow> = {};
        (ls || []).forEach((l) => (map[(l as any).id] = l as ListingRow));
        setListings(map);
      }
    })();
  }, []);

  function toggle(id: string) {
    setSelected((s) => {
      if (s.includes(id)) return s.filter((x) => x !== id);
      if (s.length >= 3) return s;
      return [...s, id];
    });
  }

  const picked = useMemo(
    () => selected.map((id) => tokens.find((t) => t.id === id)).filter(Boolean) as TokenRow[],
    [selected, tokens]
  );

  return (
    <InvestirShell authed={authed} hideFooter>
      <div className="max-w-[1100px] mx-auto px-5 md:px-6 py-8 md:py-12">
        <div className="flex items-center gap-2 mb-2">
          <GitCompareArrows className="w-4 h-4 text-volt" />
          <span className="text-[10px] uppercase tracking-wider text-volt font-semibold">Comparador</span>
        </div>
        <h1 className="text-bone text-2xl md:text-3xl font-semibold mb-1">Compare empresas lado a lado</h1>
        <p className="text-bone/55 text-sm mb-6">
          Escolha até 3 empresas. Veja setor, cidade, rodada e ticket mínimo — sem promessa de retorno, só fato.
        </p>

        {/* Seletor */}
        <div className="bg-graphite/30 border border-bone/10 rounded-2xl p-4 mb-6">
          <div className="text-bone/65 text-xs mb-3">
            Selecionadas: <strong className="text-volt">{picked.length}/3</strong>
          </div>
          <div className="flex flex-wrap gap-2">
            {tokens.map((t) => {
              const on = selected.includes(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => toggle(t.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    on
                      ? "bg-volt text-carbon border-volt"
                      : "bg-carbon/40 text-bone/80 border-bone/15 hover:border-volt/40"
                  }`}
                >
                  {on ? <X className="inline w-3 h-3 mr-1" /> : <Plus className="inline w-3 h-3 mr-1" />}
                  {t.symbol} · {t.name}
                </button>
              );
            })}
            {tokens.length === 0 && (
              <span className="text-bone/45 text-xs">Nenhuma empresa publicada ainda.</span>
            )}
          </div>
        </div>

        {/* Tabela comparativa */}
        {picked.length === 0 ? (
          <div className="bg-graphite/20 border border-dashed border-bone/15 rounded-2xl p-10 text-center text-bone/55">
            Escolha 2 ou 3 empresas acima para ver a comparação.
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${picked.length}, minmax(0,1fr))` }}>
            {picked.map((t) => {
              const l = t.listing_id ? listings[t.listing_id] : undefined;
              const pct = t.total_offering_amount
                ? Math.min(100, ((t.amount_raised || 0) / t.total_offering_amount) * 100)
                : 0;
              const cover = sectorToCover(l?.category || t.sector || "");
              return (
                <div key={t.id} className="bg-graphite/30 border border-bone/10 rounded-2xl overflow-hidden">
                  <div className="aspect-[16/9] bg-carbon">
                    <img src={cover} alt={t.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <div className="text-bone font-semibold text-base break-words">{t.name}</div>
                      <div className="text-bone/50 text-xs">{t.symbol}</div>
                    </div>
                    <Row label="Setor" value={l?.category || t.sector || "—"} />
                    <Row label="Cidade" value={[l?.city, l?.state].filter(Boolean).join("/") || "Brasil"} />
                    <Row label="Status" value={t.status === "primary_open" ? "Rodada aberta" : "Em breve"} highlight={t.status === "primary_open"} />
                    <Row label="Ticket mínimo" value={t.min_ticket ? fmtBRL(t.min_ticket) : "—"} />
                    <Row label="Meta" value={t.total_offering_amount ? fmtBRL(t.total_offering_amount) : "—"} />
                    <div>
                      <div className="text-bone/45 text-[10px] uppercase tracking-wider mb-1">Progresso</div>
                      <div className="h-2 bg-bone/10 rounded-full overflow-hidden">
                        <div className="h-full bg-volt" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="text-bone/60 text-[11px] mt-1 tabular-nums">{pct.toFixed(0)}%</div>
                    </div>
                    <Link
                      to={`/investir/empresa/${t.symbol}`}
                      className="inline-flex items-center gap-1 text-volt text-xs hover:underline pt-1"
                    >
                      Ver perfil <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-bone/35 text-[10px] mt-8 text-center max-w-md mx-auto">
          Comparação informativa. Investimento em valores mobiliários da CVM 88 envolve risco e não há garantia de retorno.
        </p>
      </div>
    </InvestirShell>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-bone/45 text-[10px] uppercase tracking-wider shrink-0">{label}</span>
      <span className={`text-sm text-right break-words ${highlight ? "text-volt font-semibold" : "text-bone/85"}`}>
        {value}
      </span>
    </div>
  );
}
