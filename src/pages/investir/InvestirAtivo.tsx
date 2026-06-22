import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { InvestirShell } from "@/components/investir/InvestirShell";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, FileText, Shield, TrendingUp, Building2, AlertTriangle, Wallet } from "lucide-react";
import { ReservationModal } from "@/components/investir/ReservationModal";
import { Skeleton } from "@/components/ui/skeleton";

type Token = any;
type Listing = any;

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n || 0);

const TABS = ["Visão geral", "Oferta", "Empresa", "Documentos", "Riscos"] as const;

export default function InvestirAtivo() {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const [token, setToken] = useState<Token | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [tab, setTab] = useState<typeof TABS[number]>("Visão geral");
  const [loading, setLoading] = useState(true);
  const [reserveOpen, setReserveOpen] = useState(false);

  useEffect(() => {
    if (!symbol) return;
    (async () => {
      const { data: tk } = await supabase.from("tokens").select("*").eq("symbol", symbol).maybeSingle();
      setToken(tk);
      if (tk?.listing_id) {
        const { data: l } = await supabase.from("listings").select("*").eq("id", tk.listing_id).maybeSingle();
        setListing(l);
      }
      setLoading(false);
    })();
  }, [symbol]);

  if (loading) {
    return (
      <InvestirShell>
        <div className="max-w-[1400px] mx-auto px-6 py-12">
          <Skeleton className="h-12 w-2/3 bg-graphite/40" />
          <Skeleton className="h-64 mt-6 bg-graphite/40" />
        </div>
      </InvestirShell>
    );
  }

  if (!token) {
    return (
      <InvestirShell>
        <div className="max-w-[1400px] mx-auto px-6 py-20 text-center">
          <h1 className="text-2xl text-bone mb-4">Ativo não encontrado</h1>
          <Link to="/investir/empresas" className="text-volt hover:underline">← Ver todas as empresas</Link>
        </div>
      </InvestirShell>
    );
  }

  const pct = token.total_offering_amount ? Math.min(100, (token.amount_raised / token.total_offering_amount) * 100) : 0;
  const isOpen = token.status === "primary_open";

  return (
    <InvestirShell>
      <div className="border-b border-bone/10 bg-graphite/20">
        <div className="max-w-[1400px] mx-auto px-6 py-3">
          <button onClick={() => navigate(-1)} className="text-xs text-bone/50 hover:text-bone flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> Voltar
          </button>
        </div>
      </div>

      {/* HERO */}
      <section className="border-b border-bone/10 bg-graphite/30">
        <div className="max-w-[1400px] mx-auto px-6 py-10 grid lg:grid-cols-[1fr_360px] gap-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-lg bg-volt/15 border border-volt/30 grid place-items-center text-sm font-mono text-volt">
                {token.symbol.slice(0,3)}
              </div>
              <div>
                <div className="text-xs font-mono text-volt/80">{token.symbol} · {token.instrument_type}</div>
                <h1 className="text-3xl md:text-4xl font-semibold text-bone tracking-tight">{token.name}</h1>
              </div>
              <span className="ml-auto text-[10px] uppercase tracking-wider bg-volt/15 text-volt px-2 py-1 rounded">
                {token.status === "primary_open" ? "Oferta aberta" : token.status}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              <Big label="Preço/token" value={fmtBRL(token.initial_price)} />
              <Big label="Ticket mínimo" value={fmtBRL(token.min_ticket)} />
              <Big label="Captado" value={`${pct.toFixed(0)}%`} sub={token.total_offering_amount ? `de ${fmtBRL(token.total_offering_amount)}` : "—"} />
              <Big label="Risco" value={(token.risk_level || "médio").toString()} />
            </div>

            {/* TABS */}
            <div className="mt-10 border-b border-bone/10 flex gap-2 overflow-x-auto">
              {TABS.map(t => (
                <button
                  key={t}
                  onClick={()=>setTab(t)}
                  className={`px-4 py-3 text-sm border-b-2 transition-colors whitespace-nowrap ${
                    tab===t ? "border-volt text-volt" : "border-transparent text-bone/60 hover:text-bone"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="py-8">
              {tab==="Visão geral" && <Overview token={token} listing={listing} />}
              {tab==="Oferta" && <Offering token={token} />}
              {tab==="Empresa" && <Company listing={listing} />}
              {tab==="Documentos" && <Documents token={token} />}
              {tab==="Riscos" && <Risks token={token} />}
            </div>
          </div>

          {/* SIDE CARD */}
          <aside>
            <div className="sticky top-20 bg-carbon/80 border border-bone/10 rounded-xl p-6 backdrop-blur-xl">
              <div className="text-[11px] uppercase tracking-wider text-bone/40 mb-2">Status</div>
              <div className="text-lg text-bone font-medium mb-5">
                {isOpen ? "Oferta aberta" : "Reserva indisponível"}
              </div>

              <div className="mb-5">
                <div className="flex justify-between text-xs text-bone/60 mb-1.5">
                  <span>{pct.toFixed(0)}% captado</span>
                  <span className="font-mono">{fmtBRL(token.amount_raised)}</span>
                </div>
                <div className="h-2 bg-graphite rounded-full overflow-hidden">
                  <div className="h-full bg-volt" style={{ width: `${pct}%` }} />
                </div>
              </div>

              <dl className="space-y-2.5 text-sm mb-6">
                <Side k="Preço/token" v={fmtBRL(token.initial_price)} />
                <Side k="Ticket mínimo" v={fmtBRL(token.min_ticket)} />
                <Side k="Volume total" v={token.total_offering_amount ? fmtBRL(token.total_offering_amount) : "—"} />
                <Side k="Instrumento" v={token.legal_instrument || token.instrument_type} />
                <Side k="Liquidez esperada" v={token.expected_liquidity || "—"} />
              </dl>

              <button
                disabled={!isOpen}
                onClick={()=>setReserveOpen(true)}
                className="w-full bg-volt hover:bg-volt/90 disabled:bg-bone/10 disabled:text-bone/40 text-carbon font-semibold py-3 rounded-md transition-colors flex items-center justify-center gap-2"
              >
                <Wallet className="w-4 h-4" /> {isOpen ? "Reservar" : "Indisponível"}
              </button>
              <div className="text-[10px] text-bone/40 mt-3 leading-relaxed">
                Requer cadastro, KYC e suitability aprovados. Sujeito a regras de elegibilidade e limites por perfil.
              </div>
            </div>
          </aside>
        </div>
      </section>

      <ReservationModal open={reserveOpen} onClose={()=>setReserveOpen(false)} token={token} />
    </InvestirShell>
  );
}

function Big({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-bone/40">{label}</div>
      <div className="text-xl md:text-2xl font-semibold text-bone tabular-nums mt-1">{value}</div>
      {sub && <div className="text-[11px] text-bone/40 font-mono">{sub}</div>}
    </div>
  );
}

function Side({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-bone/50">{k}</span>
      <span className="text-bone font-mono tabular-nums text-right">{v}</span>
    </div>
  );
}

function Overview({ token, listing }: any) {
  return (
    <div className="space-y-6">
      <Block title="Sobre a empresa" icon={Building2}>
        <p className="text-bone/70 leading-relaxed">
          {listing?.description || token.name + " é uma empresa privada disponível para investimento via ativo tokenizado."}
        </p>
      </Block>
      <Block title="Tese de investimento" icon={TrendingUp}>
        <p className="text-bone/70 leading-relaxed">
          {token.metadata?.thesis || "Os tokens representam direitos econômicos da empresa conforme o instrumento jurídico vinculado à oferta. Detalhes completos disponíveis nos documentos."}
        </p>
      </Block>
      <Block title="Direitos econômicos" icon={Shield}>
        <p className="text-bone/70 leading-relaxed">
          {token.economic_rights || "A definir conforme prospecto da oferta."}
        </p>
      </Block>
    </div>
  );
}

function Offering({ token }: { token: Token }) {
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <Stat label="Supply total" value={Intl.NumberFormat("pt-BR").format(token.total_supply || 0)} />
        <Stat label="Em circulação" value={Intl.NumberFormat("pt-BR").format(token.circulating_supply || 0)} />
        <Stat label="Instrumento jurídico" value={token.legal_instrument || token.instrument_type} />
        <Stat label="Token standard" value={token.token_standard || "—"} />
        <Stat label="Rede" value={token.blockchain_network || "Custódia plataforma"} />
        <Stat label="Smart contract" value={token.smart_contract_address ? token.smart_contract_address.slice(0,10)+"…" : "—"} mono />
      </div>
      <Block title="Regras de transferência" icon={Shield}>
        <p className="text-bone/70 text-sm">{token.transfer_rules || "Restrita conforme regulamento da oferta."}</p>
      </Block>
      <Block title="Restrições de elegibilidade" icon={Shield}>
        <p className="text-bone/70 text-sm">{token.eligibility_restrictions || "Investidores qualificados e elegíveis conforme suitability."}</p>
      </Block>
    </div>
  );
}

function Company({ listing }: { listing: Listing }) {
  if (!listing) return <div className="text-bone/50 text-sm">Sem dados detalhados da empresa.</div>;
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Stat label="Setor" value={listing.category || "—"} />
      <Stat label="Fundação" value={listing.foundation_year || "—"} />
      <Stat label="Receita anual" value={listing.annual_revenue ? fmtBRL(listing.annual_revenue) : "—"} />
      <Stat label="Localização" value={[listing.city, listing.state].filter(Boolean).join(" / ") || "—"} />
    </div>
  );
}

function Documents({ token }: { token: Token }) {
  const docs = Array.isArray(token.documents) ? token.documents : [];
  if (!docs.length) return <div className="text-bone/50 text-sm">Documentos serão publicados antes do início da oferta.</div>;
  return (
    <ul className="divide-y divide-bone/10 border border-bone/10 rounded-lg">
      {docs.map((d: any, i: number) => (
        <li key={i} className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <FileText className="w-4 h-4 text-volt" />
            <div>
              <div className="text-sm text-bone">{d.name || "Documento"}</div>
              {d.hash && <div className="text-[10px] font-mono text-bone/40">{d.hash.slice(0,16)}…</div>}
            </div>
          </div>
          {d.url && <a href={d.url} target="_blank" rel="noreferrer" className="text-xs text-volt hover:underline">Abrir</a>}
        </li>
      ))}
    </ul>
  );
}

function Risks({ token }: { token: Token }) {
  return (
    <div className="space-y-4 text-sm text-bone/70 leading-relaxed">
      <Block title="Risco de perda total" icon={AlertTriangle}>
        Investimentos em empresas privadas envolvem risco de perda total do capital investido.
      </Block>
      <Block title="Risco de liquidez" icon={AlertTriangle}>
        Ativos privados podem ter baixa liquidez. A capacidade de vender pode ser limitada por restrições regulatórias, operacionais e de elegibilidade.
      </Block>
      <Block title="Risco regulatório" icon={AlertTriangle}>
        A negociação pode estar sujeita a restrições regulatórias e operacionais. Leia os documentos antes de investir.
      </Block>
    </div>
  );
}

function Block({ title, icon: Icon, children }: any) {
  return (
    <div className="bg-graphite/40 border border-bone/10 rounded-lg p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-volt" />
        <div className="font-medium text-bone text-sm">{title}</div>
      </div>
      <div className="text-bone/70 text-sm">{children}</div>
    </div>
  );
}

function Stat({ label, value, mono }: { label: string; value: any; mono?: boolean }) {
  return (
    <div className="bg-graphite/40 border border-bone/10 rounded-lg p-4">
      <div className="text-[10px] uppercase tracking-wider text-bone/40">{label}</div>
      <div className={`text-bone mt-1 ${mono ? "font-mono text-sm" : ""}`}>{value}</div>
    </div>
  );
}
