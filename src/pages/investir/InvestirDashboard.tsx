import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { InvestirShell } from "@/components/investir/InvestirShell";
import { supabase } from "@/integrations/supabase/client";
import { Wallet, TrendingUp, Clock, Sparkles, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }).format(n || 0);

export default function InvestirDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<any>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [hasSuit, setHasSuit] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: ures } = await supabase.auth.getUser();
      if (!ures.user) { navigate("/investir/auth"); return; }
      const uid = ures.user.id;

      const [w, p, r, k, s] = await Promise.all([
        supabase.from("financial_wallets").select("*").eq("user_id", uid).maybeSingle(),
        supabase.from("token_positions").select("*, tokens(*)").eq("user_id", uid),
        supabase.from("primary_reservations").select("*, tokens(symbol,name)").eq("user_id", uid).order("created_at", { ascending: false }).limit(5),
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
  const invested = positions.reduce((s,p)=>s+Number(p.amount_invested||0),0);
  const pnl = portfolio - invested;
  const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;

  const showOnboardingBanner = kycStatus !== "approved" || !hasSuit;

  return (
    <InvestirShell authed>
      <div className="max-w-[1400px] mx-auto px-6 py-10">
        <h1 className="text-3xl font-semibold text-bone mb-2">Seu painel</h1>
        <p className="text-bone/50 mb-8">Carteira tokenizada, reservas e próximos passos.</p>

        {showOnboardingBanner && (
          <div className="mb-8 bg-volt/10 border border-volt/30 rounded-xl p-5 flex items-start gap-4">
            <Sparkles className="w-5 h-5 text-volt shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-bone font-medium">Complete seu onboarding para começar a investir</div>
              <div className="text-sm text-bone/60 mt-1">
                {kycStatus !== "approved" && <span>KYC {kycStatus === "in_review" ? "em análise" : "pendente"}. </span>}
                {!hasSuit && <span>Questionário de suitability pendente.</span>}
              </div>
              <div className="flex gap-2 mt-3">
                {kycStatus !== "approved" && (
                  <Link to="/investir/onboarding/kyc" className="text-xs bg-volt text-carbon font-medium px-3 py-1.5 rounded">
                    {kycStatus ? "Ver KYC" : "Fazer KYC"}
                  </Link>
                )}
                {!hasSuit && (
                  <Link to="/investir/onboarding/suitability" className="text-xs border border-volt/40 text-volt px-3 py-1.5 rounded hover:bg-volt/10">
                    Suitability
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* KPIs */}
        <div className="grid md:grid-cols-4 gap-4 mb-10">
          <Kpi
            icon={<TrendingUp className="w-4 h-4" />}
            label="Patrimônio em ativos"
            value={fmtBRL(portfolio)}
            loading={loading}
          />
          <Kpi
            icon={<Wallet className="w-4 h-4" />}
            label="Saldo disponível"
            value={fmtBRL(Number(wallet?.available_balance || 0))}
            loading={loading}
          />
          <Kpi
            icon={<Clock className="w-4 h-4" />}
            label="Em reserva"
            value={fmtBRL(Number(wallet?.blocked_balance || 0))}
            loading={loading}
          />
          <Kpi
            label="P&L não realizado"
            value={fmtBRL(pnl)}
            sub={`${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%`}
            tone={pnl >= 0 ? "pos" : "neg"}
            loading={loading}
          />
        </div>

        {/* Carteira */}
        <section className="mb-10">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-bone">Carteira tokenizada</h2>
            <Link to="/investir/empresas" className="text-xs text-volt hover:underline">Explorar ofertas →</Link>
          </div>
          {loading ? <Skeleton className="h-32 bg-graphite/40" /> : positions.length === 0 ? (
            <div className="border border-dashed border-bone/15 rounded-xl p-10 text-center text-bone/50 text-sm">
              Você ainda não tem posições. <Link to="/investir/empresas" className="text-volt hover:underline">Explorar empresas →</Link>
            </div>
          ) : (
            <div className="border border-bone/10 rounded-xl overflow-hidden bg-graphite/20">
              <div className="grid grid-cols-[1.5fr_0.8fr_1fr_1fr_1fr_0.8fr] gap-4 px-5 py-3 text-[10px] uppercase tracking-wider text-bone/40 bg-carbon/40">
                <div>Ativo</div><div className="text-right">Qtd</div><div className="text-right">Preço médio</div><div className="text-right">Investido</div><div className="text-right">Valor atual</div><div className="text-right">P&L</div>
              </div>
              {positions.map(p => {
                const price = Number(p.tokens?.current_reference_price || p.tokens?.initial_price || p.average_price);
                const current = Number(p.quantity) * price;
                const inv = Number(p.amount_invested);
                const diff = current - inv;
                return (
                  <Link
                    key={p.id}
                    to={`/investir/ativo/${p.tokens?.symbol}`}
                    className="grid grid-cols-[1.5fr_0.8fr_1fr_1fr_1fr_0.8fr] gap-4 px-5 py-4 items-center text-sm border-t border-bone/5 hover:bg-volt/5"
                  >
                    <div>
                      <div className="text-bone font-medium">{p.tokens?.name}</div>
                      <div className="text-[11px] font-mono text-bone/40">{p.tokens?.symbol}</div>
                    </div>
                    <div className="text-right font-mono tabular-nums text-bone">{Number(p.quantity).toFixed(4)}</div>
                    <div className="text-right font-mono tabular-nums text-bone/70">{fmtBRL(Number(p.average_price))}</div>
                    <div className="text-right font-mono tabular-nums text-bone/70">{fmtBRL(inv)}</div>
                    <div className="text-right font-mono tabular-nums text-bone">{fmtBRL(current)}</div>
                    <div className={`text-right font-mono tabular-nums ${diff >= 0 ? "text-volt" : "text-amber-400"}`}>
                      {diff >= 0 ? "+" : ""}{fmtBRL(diff)}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Reservas recentes */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-bone">Reservas recentes</h2>
            <Link to="/investir/reservas" className="text-xs text-volt hover:underline">Ver todas <ArrowRight className="w-3 h-3 inline" /></Link>
          </div>
          {loading ? <Skeleton className="h-24 bg-graphite/40" /> : reservations.length === 0 ? (
            <div className="border border-dashed border-bone/15 rounded-xl p-8 text-center text-bone/50 text-sm">Nenhuma reserva ainda.</div>
          ) : (
            <div className="border border-bone/10 rounded-xl divide-y divide-bone/5 bg-graphite/20">
              {reservations.map(r => (
                <div key={r.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm text-bone">{r.tokens?.name}</div>
                    <div className="text-[11px] font-mono text-bone/40">{r.tokens?.symbol} · {new Date(r.created_at).toLocaleDateString("pt-BR")}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono tabular-nums text-bone">{fmtBRL(Number(r.total_amount))}</div>
                    <div className="text-[11px] text-volt">{r.status}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </InvestirShell>
  );
}

function Kpi({ icon, label, value, sub, tone, loading }: any) {
  if (loading) return <Skeleton className="h-24 bg-graphite/40" />;
  return (
    <div className="bg-graphite/40 border border-bone/10 rounded-xl p-5">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-bone/50 mb-2">
        {icon} {label}
      </div>
      <div className="text-2xl font-semibold text-bone tabular-nums">{value}</div>
      {sub && <div className={`text-xs mt-1 font-mono ${tone === "neg" ? "text-amber-400" : "text-volt"}`}>{sub}</div>}
    </div>
  );
}
