import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { InvestirShell } from "@/components/investir/InvestirShell";
import { supabase } from "@/integrations/supabase/client";
import {
  Wallet,
  TrendingUp,
  Clock,
  Sparkles,
  ArrowRight,
  Plus,
  ArrowDownToLine,
  BarChart3,
  Eye,
  EyeOff,
  ChevronRight,
  LineChart,
  ClipboardList,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }).format(n || 0);

export default function InvestirDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<any>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [hasSuit, setHasSuit] = useState(false);
  const [userName, setUserName] = useState("");
  const [hideBalance, setHideBalance] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: ures } = await supabase.auth.getUser();
      if (!ures.user) {
        navigate("/investir/auth");
        return;
      }
      const uid = ures.user.id;
      setUserName((ures.user.user_metadata?.full_name || ures.user.email || "").toString().split(" ")[0]);

      const [w, p, r, k, s, o] = await Promise.all([
        supabase.from("financial_wallets").select("*").eq("user_id", uid).maybeSingle(),
        supabase.from("token_positions").select("*, tokens(*)").eq("user_id", uid),
        supabase.from("primary_reservations").select("*, tokens(symbol,name)").eq("user_id", uid).order("created_at", { ascending: false }).limit(5),
        supabase.from("investor_kyc").select("status").eq("user_id", uid).maybeSingle(),
        supabase.from("investor_suitability").select("id").eq("user_id", uid).maybeSingle(),
        supabase.from("tokens").select("id,symbol,name,initial_price,min_ticket,total_offering_amount,amount_raised,status").in("status", ["primary_open", "approved"]).order("created_at", { ascending: false }).limit(8),
      ]);
      setWallet(w.data);
      setPositions(p.data || []);
      setReservations(r.data || []);
      setKycStatus(k.data?.status || null);
      setHasSuit(!!s.data);
      setOffers(o.data || []);
      setLoading(false);
    })();
  }, [navigate]);

  const portfolio = positions.reduce((sum, p) => {
    const price = p.tokens?.current_reference_price || p.tokens?.initial_price || p.average_price;
    return sum + Number(p.quantity) * Number(price);
  }, 0);
  const invested = positions.reduce((s, p) => s + Number(p.amount_invested || 0), 0);
  const pnl = portfolio - invested;
  const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
  const available = Number(wallet?.available_balance || 0);
  const blocked = Number(wallet?.blocked_balance || 0);
  const total = available + blocked + portfolio;

  const showOnboardingBanner = kycStatus !== "approved" || !hasSuit;
  const mask = (v: string) => (hideBalance ? "•••••" : v);

  return (
    <InvestirShell authed>
      <div className="bg-carbon min-h-[calc(100vh-3.5rem)]">
        {/* HERO Saldo - estilo home broker XP/Rico */}
        <div className="bg-gradient-to-br from-carbon via-carbon to-graphite/40 border-b border-bone/10">
          <div className="max-w-[1400px] mx-auto px-5 md:px-6 pt-6 md:pt-8 pb-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-bone/60 text-sm">Olá{userName ? `, ${userName}` : ""} 👋</div>
                <div className="flex items-center gap-2 text-bone/45 text-xs mt-0.5">
                  Patrimônio total
                  <button
                    onClick={() => setHideBalance((h) => !h)}
                    className="text-bone/40 hover:text-bone"
                    aria-label={hideBalance ? "Mostrar saldo" : "Ocultar saldo"}
                  >
                    {hideBalance ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="text-[40px] leading-none md:text-5xl font-semibold text-bone tabular-nums mt-2">
              {loading ? (
                <Skeleton className="h-10 w-56 bg-graphite/40" />
              ) : (
                mask(fmtBRL(total))
              )}
            </div>
            {!loading && invested > 0 && !hideBalance && (
              <div className={`text-sm mt-1.5 font-mono tabular-nums ${pnl >= 0 ? "text-volt" : "text-amber-400"}`}>
                {pnl >= 0 ? "▲" : "▼"} {fmtBRL(Math.abs(pnl))} ({pnlPct >= 0 ? "+" : ""}
                {pnlPct.toFixed(2)}%)
              </div>
            )}

            {/* Quick Actions estilo Rico */}
            <div className="grid grid-cols-4 gap-2 mt-6">
              <QuickAction icon={Plus} label="Depositar" to="/investir/carteira" />
              <QuickAction icon={ArrowDownToLine} label="Sacar" to="/investir/carteira" />
              <QuickAction icon={LineChart} label="Investir" to="/investir/empresas" highlight />
              <QuickAction icon={ClipboardList} label="Reservas" to="/investir/reservas" />
            </div>

            {/* Mini KPIs */}
            <div className="grid grid-cols-3 gap-2 mt-5">
              <MiniStat label="Disponível" value={mask(fmtBRL(available))} loading={loading} />
              <MiniStat label="Em reserva" value={mask(fmtBRL(blocked))} loading={loading} />
              <MiniStat label="Investido" value={mask(fmtBRL(portfolio))} loading={loading} />
            </div>
          </div>
        </div>

        {/* Onboarding banner */}
        {showOnboardingBanner && (
          <div className="max-w-[1400px] mx-auto px-5 md:px-6 pt-5">
            <div className="bg-volt/10 border border-volt/30 rounded-2xl p-4 md:p-5 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-volt shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-bone font-medium text-sm md:text-base">Falta pouco pra você começar</div>
                <div className="text-xs md:text-sm text-bone/60 mt-1">
                  {kycStatus !== "approved" && <span>Cadastro {kycStatus === "in_review" ? "em análise" : "pendente"}. </span>}
                  {!hasSuit && <span>Defina seu perfil.</span>}
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {kycStatus !== "approved" && (
                    <Link to="/investir/onboarding/kyc" className="text-xs bg-volt text-carbon font-semibold px-3 py-1.5 rounded-full">
                      {kycStatus ? "Ver cadastro" : "Completar cadastro"}
                    </Link>
                  )}
                  {!hasSuit && (
                    <Link to="/investir/onboarding/suitability" className="text-xs border border-volt/40 text-volt px-3 py-1.5 rounded-full">
                      Definir perfil
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Suas posições */}
        <section className="max-w-[1400px] mx-auto px-5 md:px-6 mt-8">
          <SectionHeader title="Minhas posições" link={positions.length ? { to: "/investir/carteira", label: "Ver tudo" } : undefined} />
          {loading ? (
            <Skeleton className="h-24 bg-graphite/40 rounded-xl" />
          ) : positions.length === 0 ? (
            <EmptyBlock
              title="Sua carteira está vazia"
              desc="Comece a investir em empresas brasileiras a partir de R$ 100."
              cta="Ver oportunidades"
              to="/investir/empresas"
            />
          ) : (
            <div className="bg-graphite/30 border border-bone/10 rounded-2xl divide-y divide-bone/5 overflow-hidden">
              {positions.slice(0, 5).map((p) => {
                const price = Number(p.tokens?.current_reference_price || p.tokens?.initial_price || p.average_price);
                const current = Number(p.quantity) * price;
                const inv = Number(p.amount_invested);
                const diff = current - inv;
                const pct = inv > 0 ? (diff / inv) * 100 : 0;
                return (
                  <PositionRow
                    key={p.id}
                    to={`/investir/ativo/${p.tokens?.symbol}`}
                    name={p.tokens?.name}
                    symbol={p.tokens?.symbol}
                    value={mask(fmtBRL(current))}
                    pct={pct}
                    sub={`${Number(p.quantity).toFixed(2)} cotas`}
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* Ofertas pra você */}
        <section className="max-w-[1400px] mx-auto pl-5 md:px-6 mt-10">
          <div className="pr-5 md:pr-0">
            <SectionHeader title="Ofertas pra você" link={{ to: "/investir/empresas", label: "Ver todas" }} />
          </div>
          {loading ? (
            <Skeleton className="h-40 bg-graphite/40 rounded-2xl mr-5 md:mr-0" />
          ) : offers.length === 0 ? (
            <div className="pr-5 md:pr-0">
              <EmptyBlock title="Sem ofertas abertas no momento" desc="Avisaremos quando uma nova oferta abrir." cta="Cadastrar interesse" to="/investir/empresas" />
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-3 md:grid md:grid-cols-3 md:gap-4 md:pr-0 -mx-0 md:mx-0">
              {offers.slice(0, 6).map((o) => (
                <OfferMiniCard key={o.id} token={o} />
              ))}
              <div className="shrink-0 w-1 md:hidden" />
            </div>
          )}
        </section>

        {/* Reservas recentes */}
        <section className="max-w-[1400px] mx-auto px-5 md:px-6 mt-10 mb-8">
          <SectionHeader title="Atividade recente" link={reservations.length ? { to: "/investir/reservas", label: "Ver tudo" } : undefined} />
          {loading ? (
            <Skeleton className="h-20 bg-graphite/40 rounded-xl" />
          ) : reservations.length === 0 ? (
            <div className="text-sm text-bone/45 px-1 py-4">Nenhuma movimentação ainda.</div>
          ) : (
            <div className="bg-graphite/30 border border-bone/10 rounded-2xl divide-y divide-bone/5 overflow-hidden">
              {reservations.map((r) => (
                <div key={r.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-volt/15 text-volt grid place-items-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-bone font-medium truncate">{r.tokens?.name}</div>
                    <div className="text-[11px] text-bone/45">
                      {new Date(r.created_at).toLocaleDateString("pt-BR")} · {r.status}
                    </div>
                  </div>
                  <div className="text-sm font-mono tabular-nums text-bone shrink-0">{mask(fmtBRL(Number(r.total_amount)))}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </InvestirShell>
  );
}

function QuickAction({
  icon: Icon,
  label,
  to,
  highlight,
}: {
  icon: any;
  label: string;
  to: string;
  highlight?: boolean;
}) {
  return (
    <Link to={to} className="flex flex-col items-center gap-2 group">
      <div
        className={`w-14 h-14 rounded-full grid place-items-center transition-all ${
          highlight
            ? "bg-volt text-carbon group-active:scale-95"
            : "bg-graphite/60 border border-bone/10 text-bone group-active:bg-graphite group-active:scale-95"
        }`}
      >
        <Icon className="w-5 h-5" strokeWidth={2.2} />
      </div>
      <span className="text-[11px] text-bone/75 font-medium">{label}</span>
    </Link>
  );
}

function MiniStat({ label, value, loading }: any) {
  if (loading) return <Skeleton className="h-16 rounded-xl bg-graphite/40" />;
  return (
    <div className="bg-graphite/40 border border-bone/10 rounded-xl p-3">
      <div className="text-[10px] uppercase tracking-wider text-bone/50">{label}</div>
      <div className="text-sm font-semibold text-bone tabular-nums mt-1 truncate">{value}</div>
    </div>
  );
}

function SectionHeader({ title, link }: { title: string; link?: { to: string; label: string } }) {
  return (
    <div className="flex items-end justify-between mb-3">
      <h2 className="text-base md:text-lg font-semibold text-bone">{title}</h2>
      {link && (
        <Link to={link.to} className="text-xs text-volt hover:underline flex items-center gap-1">
          {link.label} <ChevronRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}

function PositionRow({
  to,
  name,
  symbol,
  value,
  pct,
  sub,
}: {
  to: string;
  name: string;
  symbol: string;
  value: string;
  pct: number;
  sub: string;
}) {
  return (
    <Link to={to} className="flex items-center gap-3 px-4 py-3.5 hover:bg-bone/5 transition-colors active:bg-bone/10">
      <div className="w-10 h-10 rounded-lg bg-volt/15 text-volt grid place-items-center font-mono text-[11px] font-semibold shrink-0">
        {symbol?.slice(0, 3)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm text-bone font-medium truncate">{name}</div>
        <div className="text-[11px] text-bone/45 truncate">{sub}</div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm text-bone font-semibold tabular-nums">{value}</div>
        <div className={`text-[11px] font-mono tabular-nums ${pct >= 0 ? "text-volt" : "text-amber-400"}`}>
          {pct >= 0 ? "+" : ""}
          {pct.toFixed(2)}%
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-bone/30 shrink-0" />
    </Link>
  );
}

function OfferMiniCard({ token }: { token: any }) {
  const pct = token.total_offering_amount ? Math.min(100, (token.amount_raised / token.total_offering_amount) * 100) : 0;
  const isOpen = token.status === "primary_open";
  return (
    <Link
      to={`/investir/ativo/${token.symbol}`}
      className="shrink-0 w-[78vw] max-w-[300px] md:w-auto md:max-w-none snap-start bg-graphite/40 border border-bone/10 hover:border-volt/40 rounded-2xl p-4 transition-colors active:scale-[0.98]"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-bone leading-tight truncate">{token.name}</div>
          <div className="text-[10px] font-mono text-bone/40 mt-0.5">{token.symbol}</div>
        </div>
        <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${isOpen ? "bg-volt text-carbon" : "bg-bone/10 text-bone/60"}`}>
          {isOpen ? "Aberta" : "Em breve"}
        </span>
      </div>
      <div className="flex items-baseline gap-1 mb-3">
        <span className="text-[11px] text-bone/50">A partir de</span>
        <span className="text-base font-semibold text-bone tabular-nums">{fmtBRL(token.min_ticket)}</span>
      </div>
      <div className="h-1 bg-carbon rounded-full overflow-hidden">
        <div className="h-full bg-volt" style={{ width: `${pct}%` }} />
      </div>
      <div className="text-[10px] text-bone/45 mt-1.5">{pct.toFixed(0)}% captado</div>
    </Link>
  );
}

function EmptyBlock({ title, desc, cta, to }: { title: string; desc: string; cta: string; to: string }) {
  return (
    <div className="border border-dashed border-bone/15 rounded-2xl p-6 md:p-10 text-center bg-graphite/20">
      <div className="text-bone/85 text-base md:text-lg mb-1.5">{title}</div>
      <p className="text-xs md:text-sm text-bone/55 max-w-md mx-auto mb-5">{desc}</p>
      <Link to={to} className="inline-flex items-center gap-2 bg-volt hover:bg-volt/90 text-carbon font-semibold px-5 py-2.5 rounded-full text-sm">
        {cta} <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
