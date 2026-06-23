import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { InvestirShell } from "@/components/investir/InvestirShell";
import { supabase } from "@/integrations/supabase/client";
import { Wallet, TrendingUp, Clock, Sparkles, ArrowRight, Plus, ArrowDownToLine, BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }).format(n || 0);

type Tab = "carteira" | "oportunidades" | "reservas" | "extrato";

export default function InvestirDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<any>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [hasSuit, setHasSuit] = useState(false);
  const [tab, setTab] = useState<Tab>("carteira");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    (async () => {
      const { data: ures } = await supabase.auth.getUser();
      if (!ures.user) { navigate("/investir/auth"); return; }
      const uid = ures.user.id;
      setUserName((ures.user.user_metadata?.full_name || ures.user.email || "").toString().split(" ")[0]);

      const [w, p, r, k, s] = await Promise.all([
        supabase.from("financial_wallets").select("*").eq("user_id", uid).maybeSingle(),
        supabase.from("token_positions").select("*, tokens(*)").eq("user_id", uid),
        supabase.from("primary_reservations").select("*, tokens(symbol,name)").eq("user_id", uid).order("created_at", { ascending: false }).limit(10),
        supabase.from("investor_kyc").select("status").eq("user_id", uid).maybeSingle(),
        supabase.from("investor_suitability").select("id").eq("user_id", uid).maybeSingle(),
      ]);
      setWallet(w.data);
      setPositions(p.data || []);
      setReservations(r.data || []);
      setKycStatus(k.data?.status || null);
      setHasSuit(!!s.data);
      setLoading(false);
    })();
  }, [navigate]);

  const portfolio = positions.reduce((sum, p) => {
    const price = p.tokens?.current_reference_price || p.tokens?.initial_price || p.average_price;
    return sum + (Number(p.quantity) * Number(price));
  }, 0);
  const invested = positions.reduce((s, p) => s + Number(p.amount_invested || 0), 0);
  const pnl = portfolio - invested;
  const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
  const available = Number(wallet?.available_balance || 0);
  const blocked = Number(wallet?.blocked_balance || 0);
  const total = available + blocked + portfolio;

  const showOnboardingBanner = kycStatus !== "approved" || !hasSuit;

  return (
    <InvestirShell authed>
      <div className="bg-carbon min-h-[calc(100vh-3.5rem)]">
        {/* Header executivo — estilo home broker */}
        <div className="border-b border-bone/10 bg-gradient-to-br from-carbon via-carbon to-graphite/30">
          <div className="max-w-[1400px] mx-auto px-6 py-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="text-bone/60 text-sm">Olá{userName ? `, ${userName}` : ""} 👋</div>
                <div className="text-bone/45 text-xs mt-0.5">Patrimônio total</div>
                <div className="text-4xl md:text-5xl font-semibold text-bone tabular-nums mt-1">
                  {loading ? <Skeleton className="h-12 w-64 bg-graphite/40" /> : fmtBRL(total)}
                </div>
                {!loading && invested > 0 && (
                  <div className={`text-sm mt-1 font-mono tabular-nums ${pnl >= 0 ? "text-volt" : "text-amber-400"}`}>
                    {pnl >= 0 ? "▲" : "▼"} {fmtBRL(Math.abs(pnl))} ({pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%)
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Link to="/investir/carteira" className="inline-flex items-center gap-2 bg-volt hover:bg-volt/90 text-carbon font-semibold px-5 py-3 rounded-full text-sm">
                  <Plus className="w-4 h-4" /> Depositar
                </Link>
                <Link to="/investir/carteira" className="inline-flex items-center gap-2 border border-bone/20 text-bone hover:bg-bone/5 font-medium px-5 py-3 rounded-full text-sm">
                  <ArrowDownToLine className="w-4 h-4" /> Sacar
                </Link>
              </div>
            </div>

            {/* Mini KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
              <MiniStat label="Disponível" value={fmtBRL(available)} icon={<Wallet className="w-3.5 h-3.5" />} loading={loading} />
              <MiniStat label="Em reserva" value={fmtBRL(blocked)} icon={<Clock className="w-3.5 h-3.5" />} loading={loading} />
              <MiniStat label="Investido" value={fmtBRL(portfolio)} icon={<TrendingUp className="w-3.5 h-3.5" />} loading={loading} />
              <MiniStat label="P&L" value={`${pnl >= 0 ? "+" : ""}${fmtBRL(pnl)}`} sub={`${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%`} tone={pnl >= 0 ? "pos" : "neg"} loading={loading} icon={<BarChart3 className="w-3.5 h-3.5" />} />
            </div>
          </div>
        </div>

        {/* Onboarding banner */}
        {showOnboardingBanner && (
          <div className="max-w-[1400px] mx-auto px-6 pt-6">
            <div className="bg-volt/10 border border-volt/30 rounded-2xl p-5 flex items-start gap-4">
              <Sparkles className="w-5 h-5 text-volt shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-bone font-medium">Falta pouco pra você começar a investir</div>
                <div className="text-sm text-bone/60 mt-1">
                  {kycStatus !== "approved" && <span>Cadastro {kycStatus === "in_review" ? "em análise" : "pendente"}. </span>}
                  {!hasSuit && <span>Defina seu perfil de investidor.</span>}
                </div>
                <div className="flex gap-2 mt-3">
                  {kycStatus !== "approved" && (
                    <Link to="/investir/onboarding/kyc" className="text-xs bg-volt text-carbon font-medium px-3 py-1.5 rounded-full">
                      {kycStatus ? "Ver cadastro" : "Completar cadastro"}
                    </Link>
                  )}
                  {!hasSuit && (
                    <Link to="/investir/onboarding/suitability" className="text-xs border border-volt/40 text-volt px-3 py-1.5 rounded-full hover:bg-volt/10">
                      Definir perfil
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="max-w-[1400px] mx-auto px-6 mt-8">
          <div className="border-b border-bone/10 flex gap-1 overflow-x-auto">
            {([
              ["carteira", "Minha carteira"],
              ["oportunidades", "Oportunidades"],
              ["reservas", "Minhas reservas"],
              ["extrato", "Extrato"],
            ] as [Tab, string][]).map(([k, l]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  tab === k ? "border-volt text-bone" : "border-transparent text-bone/50 hover:text-bone"
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          <div className="py-6">
            {tab === "carteira" && <CarteiraTab loading={loading} positions={positions} />}
            {tab === "oportunidades" && <OportunidadesTab />}
            {tab === "reservas" && <ReservasTab loading={loading} reservations={reservations} />}
            {tab === "extrato" && <ExtratoTab />}
          </div>
        </div>
      </div>
    </InvestirShell>
  );
}

function MiniStat({ label, value, sub, tone, loading, icon }: any) {
  if (loading) return <Skeleton className="h-20 rounded-xl bg-graphite/40" />;
  return (
    <div className="bg-graphite/40 border border-bone/10 rounded-xl p-4">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-bone/50 mb-1.5">
        {icon} {label}
      </div>
      <div className="text-lg font-semibold text-bone tabular-nums">{value}</div>
      {sub && <div className={`text-[11px] mt-0.5 font-mono ${tone === "neg" ? "text-amber-400" : "text-volt"}`}>{sub}</div>}
    </div>
  );
}

function CarteiraTab({ loading, positions }: any) {
  if (loading) return <Skeleton className="h-40 bg-graphite/40 rounded-2xl" />;
  if (!positions.length) {
    return (
      <div className="border border-dashed border-bone/15 rounded-2xl p-12 text-center bg-graphite/20">
        <div className="text-bone/80 text-lg mb-2">Sua carteira está vazia</div>
        <p className="text-sm text-bone/55 max-w-md mx-auto mb-6">Que tal começar agora? Veja as empresas abertas pra investimento.</p>
        <Link to="/investir/empresas" className="inline-flex items-center gap-2 bg-volt hover:bg-volt/90 text-carbon font-semibold px-6 py-3 rounded-full">
          Ver oportunidades <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
      {positions.map((p: any) => {
        const price = Number(p.tokens?.current_reference_price || p.tokens?.initial_price || p.average_price);
        const current = Number(p.quantity) * price;
        const inv = Number(p.amount_invested);
        const diff = current - inv;
        const pct = inv > 0 ? (diff / inv) * 100 : 0;
        return (
          <Link key={p.id} to={`/investir/ativo/${p.tokens?.symbol}`} className="bg-graphite/30 hover:bg-graphite/50 border border-bone/10 hover:border-volt/40 rounded-2xl p-5 transition-all group">
            <div className="flex items-start justify-between mb-4">
              <div className="min-w-0">
                <div className="font-semibold text-bone leading-tight break-words">{p.tokens?.name}</div>
                <div className="text-[10px] font-mono text-bone/40 mt-0.5">{p.tokens?.symbol}</div>
              </div>
              <span className={`text-xs font-mono tabular-nums shrink-0 ${diff >= 0 ? "text-volt" : "text-amber-400"}`}>
                {diff >= 0 ? "▲" : "▼"} {pct >= 0 ? "+" : ""}{pct.toFixed(1)}%
              </span>
            </div>
            <div className="text-2xl font-semibold text-bone tabular-nums">{fmtBRL(current)}</div>
            <div className="text-[11px] text-bone/50 mt-1">
              {Number(p.quantity).toFixed(2)} cotas · investido {fmtBRL(inv)}
            </div>
            <div className="mt-4 pt-4 border-t border-bone/5 flex gap-2">
              <span className="flex-1 text-center text-xs py-2 rounded-full bg-volt/15 text-volt font-medium group-hover:bg-volt group-hover:text-carbon transition-colors">
                Aportar mais
              </span>
              <span className="flex-1 text-center text-xs py-2 rounded-full border border-bone/15 text-bone/60">
                Vender
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function OportunidadesTab() {
  return (
    <div className="text-center py-16">
      <p className="text-bone/60 mb-4">Veja todas as empresas abertas pra investimento.</p>
      <Link to="/investir/empresas" className="inline-flex items-center gap-2 bg-volt hover:bg-volt/90 text-carbon font-semibold px-6 py-3 rounded-full">
        Ver oportunidades <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

function ReservasTab({ loading, reservations }: any) {
  if (loading) return <Skeleton className="h-32 bg-graphite/40 rounded-2xl" />;
  if (!reservations.length) {
    return <div className="border border-dashed border-bone/15 rounded-2xl p-10 text-center text-bone/55">Nenhuma reserva ainda.</div>;
  }
  return (
    <div className="border border-bone/10 rounded-2xl divide-y divide-bone/5 bg-graphite/20 overflow-hidden">
      {reservations.map((r: any) => (
        <div key={r.id} className="px-5 py-4 flex items-center justify-between hover:bg-graphite/30">
          <div>
            <div className="text-sm text-bone font-medium">{r.tokens?.name}</div>
            <div className="text-[11px] font-mono text-bone/40">{r.tokens?.symbol} · {new Date(r.created_at).toLocaleDateString("pt-BR")}</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-mono tabular-nums text-bone">{fmtBRL(Number(r.total_amount))}</div>
            <div className="text-[11px] text-volt capitalize">{r.status}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ExtratoTab() {
  return (
    <div className="border border-dashed border-bone/15 rounded-2xl p-10 text-center text-bone/55 text-sm">
      Histórico financeiro completo em breve. Por enquanto, acesse <Link to="/investir/carteira" className="text-volt hover:underline">sua carteira</Link>.
    </div>
  );
}
