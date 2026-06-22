import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { InvestirShell, SectionEyebrow } from "@/components/investir/InvestirShell";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, ShieldCheck, Layers, TrendingUp, Lock, FileCheck2, Wallet } from "lucide-react";
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
  listing_id: string | null;
};

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n || 0);

const fmtNum = (n: number) =>
  new Intl.NumberFormat("pt-BR").format(n || 0);

export default function InvestirHome() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ offerings: 0, companies: 0, sectors: 0, minTicket: 0 });

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("tokens")
        .select("id,symbol,name,instrument_type,initial_price,min_ticket,total_offering_amount,amount_raised,status,risk_level,listing_id")
        .in("status", ["primary_open", "approved", "issued"])
        .order("created_at", { ascending: false })
        .limit(6);
      const list = (data as Token[]) || [];
      setTokens(list);

      const { count: companyCount } = await supabase
        .from("listings")
        .select("id", { head: true, count: "exact" })
        .eq("is_tokenizable", true);

      setStats({
        offerings: list.filter(t => t.status === "primary_open").length,
        companies: companyCount || list.length,
        sectors: 12,
        minTicket: list.length ? Math.min(...list.map(t => t.min_ticket || Infinity)) : 100,
      });
      setLoading(false);
    })();
  }, []);

  return (
    <InvestirShell>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-bone/10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(217,245,100,0.15),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(217,245,100,0.06),transparent_60%)]" />
        <div className="relative max-w-[1400px] mx-auto px-6 pt-20 pb-24 grid lg:grid-cols-[1.2fr_1fr] gap-16 items-center">
          <div>
            <SectionEyebrow>Plataforma regulada · Ativos privados tokenizados</SectionEyebrow>
            <h1 className="mt-5 text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.02] text-bone">
              Invista em empresas <br/>
              <span className="text-volt">privadas tokenizadas</span>
            </h1>
            <p className="mt-6 text-lg text-bone/70 max-w-xl leading-relaxed">
              Acesse ativos digitais lastreados em empresas reais, participe de ofertas selecionadas
              e acompanhe sua carteira em uma plataforma regulada, segura e transparente.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/investir/empresas"
                className="inline-flex items-center gap-2 bg-volt hover:bg-volt/90 text-carbon font-semibold px-5 py-3 rounded-md transition-all"
              >
                Explorar empresas <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/investir/auth?mode=signup"
                className="inline-flex items-center gap-2 border border-bone/20 hover:bg-bone/10 text-bone font-medium px-5 py-3 rounded-md transition-all"
              >
                Criar conta de investidor
              </Link>
              <Link
                to="/investir/como-funciona"
                className="inline-flex items-center gap-2 text-bone/70 hover:text-bone font-medium px-2 py-3"
              >
                Como funciona →
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-xs text-bone/50">
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-volt/70" />Verificação KYC/AML</span>
              <span className="flex items-center gap-1.5"><FileCheck2 className="w-3.5 h-3.5 text-volt/70" />Documentação jurídica</span>
              <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-volt/70" />Custódia regulada</span>
            </div>
          </div>

          {/* Ticker preview */}
          <div className="relative bg-graphite/60 border border-bone/10 rounded-2xl p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-bone/40 mb-4">
              <span>Ofertas em destaque</span>
              <span className="text-volt">ao vivo</span>
            </div>
            <div className="space-y-1">
              {(loading ? Array.from({length:4}) : tokens.slice(0,4)).map((t: any, i) => (
                <TickerRow key={i} token={t} loading={loading} />
              ))}
            </div>
            <Link to="/investir/empresas" className="mt-4 text-xs text-volt hover:underline flex items-center gap-1">
              Ver todas as empresas <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </section>

      {/* STAT STRIP */}
      <section className="border-b border-bone/10 bg-graphite/30">
        <div className="max-w-[1400px] mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          <Stat label="Ofertas ativas" value={fmtNum(stats.offerings)} />
          <Stat label="Empresas tokenizadas" value={fmtNum(stats.companies)} />
          <Stat label="Setores cobertos" value={fmtNum(stats.sectors)} />
          <Stat label="Ticket mínimo a partir de" value={fmtBRL(stats.minTicket)} />
        </div>
      </section>

      {/* FEATURED OFFERINGS */}
      <section className="max-w-[1400px] mx-auto px-6 py-20">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <SectionEyebrow>Ofertas em destaque</SectionEyebrow>
            <h2 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight">
              Empresas selecionadas, disponíveis agora
            </h2>
          </div>
          <Link to="/investir/empresas" className="text-sm text-bone/70 hover:text-volt flex items-center gap-1">
            Ver listagem completa <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({length: 6}).map((_,i)=>(<Skeleton key={i} className="h-56 rounded-xl bg-graphite/50" />))}
          </div>
        ) : tokens.length === 0 ? (
          <EmptyOfferings />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tokens.map(t => <OfferCard key={t.id} token={t} />)}
          </div>
        )}
      </section>

      {/* HOW IT WORKS */}
      <section className="border-t border-bone/10 bg-graphite/20">
        <div className="max-w-[1400px] mx-auto px-6 py-20">
          <SectionEyebrow>Como funciona em 4 passos</SectionEyebrow>
          <h2 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight mb-12">
            Do cadastro ao token na sua carteira
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { n: "01", icon: ShieldCheck, t: "Cadastro e KYC", d: "Crie sua conta e envie sua documentação para análise de identidade." },
              { n: "02", icon: Layers, t: "Suitability", d: "Defina seu perfil de investidor e os ativos elegíveis pra você." },
              { n: "03", icon: Wallet, t: "Reserva", d: "Deposite, escolha o ativo, defina o valor e confirme a reserva." },
              { n: "04", icon: TrendingUp, t: "Liquidação", d: "Tokens custodiados na sua carteira e acompanhamento em tempo real." },
            ].map(step => (
              <div key={step.n} className="bg-carbon/60 border border-bone/10 rounded-xl p-6 hover:border-volt/30 transition-colors">
                <div className="text-volt/70 text-xs font-mono mb-3">{step.n}</div>
                <step.icon className="w-6 h-6 text-volt mb-4" />
                <div className="font-semibold text-bone mb-2">{step.t}</div>
                <div className="text-sm text-bone/60 leading-relaxed">{step.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RISK STRIP */}
      <section className="border-t border-bone/10">
        <div className="max-w-[1400px] mx-auto px-6 py-16 grid md:grid-cols-[1fr_1.4fr] gap-12 items-center">
          <div>
            <SectionEyebrow>Educação e risco</SectionEyebrow>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              Transparência sobre o que você está adquirindo
            </h2>
          </div>
          <ul className="space-y-3 text-sm text-bone/70">
            {[
              "Todos os investidores passam por verificação de identidade, suitability e validações de compliance antes de operar.",
              "As ofertas e negociações seguem regras aplicáveis ao tipo de ativo, ao perfil do investidor e à autorização regulatória da plataforma.",
              "Investimentos em empresas privadas envolvem risco de perda total do capital; ativos privados podem ter baixa liquidez.",
              "Rentabilidade passada ou projetada não representa garantia de retorno. Leia sempre os documentos da oferta antes de investir.",
            ].map((t,i)=>(
              <li key={i} className="flex gap-3"><span className="text-volt mt-1">•</span><span>{t}</span></li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-bone/10 bg-volt/5">
        <div className="max-w-[1400px] mx-auto px-6 py-20 text-center">
          <h2 className="text-4xl md:text-5xl font-semibold tracking-tight">
            Pronto para entrar no <span className="text-volt">private equity</span> digital?
          </h2>
          <p className="mt-4 text-bone/60 max-w-xl mx-auto">
            Abra sua conta de investidor, conclua o onboarding e comece a participar das ofertas disponíveis.
          </p>
          <Link
            to="/investir/auth?mode=signup"
            className="inline-flex items-center gap-2 mt-8 bg-volt hover:bg-volt/90 text-carbon font-semibold px-6 py-3.5 rounded-md transition-all"
          >
            Criar conta gratuita <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </InvestirShell>
  );
}

function TickerRow({ token, loading }: { token?: Token; loading?: boolean }) {
  if (loading) return <Skeleton className="h-12 rounded bg-carbon/60" />;
  if (!token) {
    return (
      <div className="flex items-center justify-between px-3 py-3 rounded bg-carbon/40">
        <div className="text-xs text-bone/40">Em breve</div>
      </div>
    );
  }
  const pct = token.total_offering_amount
    ? Math.min(100, (token.amount_raised / token.total_offering_amount) * 100)
    : 0;
  return (
    <Link
      to={`/investir/ativo/${token.symbol}`}
      className="flex items-center justify-between px-3 py-3 rounded hover:bg-carbon/60 transition-colors group"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded bg-volt/10 border border-volt/20 grid place-items-center text-[10px] font-mono text-volt">
          {token.symbol.slice(0, 3)}
        </div>
        <div className="min-w-0">
          <div className="text-sm text-bone group-hover:text-volt truncate">{token.name}</div>
          <div className="text-[11px] text-bone/40 font-mono">{token.symbol} · {token.instrument_type}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-mono tabular-nums text-bone">{fmtBRL(token.initial_price)}</div>
        <div className="text-[11px] text-volt/80 font-mono tabular-nums">{pct.toFixed(0)}% captado</div>
      </div>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-3xl md:text-4xl font-semibold text-bone tabular-nums">{value}</div>
      <div className="text-xs text-bone/50 mt-1 uppercase tracking-wider">{label}</div>
    </div>
  );
}

function EmptyOfferings() {
  return (
    <div className="border border-dashed border-bone/15 rounded-xl p-12 text-center">
      <div className="text-bone/60 mb-2">Nenhuma oferta ativa neste momento</div>
      <p className="text-sm text-bone/40 max-w-md mx-auto">
        Estamos finalizando a curadoria das próximas empresas. Cadastre-se para ser avisado assim que abrirem.
      </p>
      <Link to="/investir/auth?mode=signup" className="inline-block mt-6 text-volt hover:underline text-sm">
        Criar conta e receber alertas →
      </Link>
    </div>
  );
}

function OfferCard({ token }: { token: Token }) {
  const pct = token.total_offering_amount
    ? Math.min(100, (token.amount_raised / token.total_offering_amount) * 100)
    : 0;
  const statusLabels: Record<string,string> = {
    primary_open: "Aberta",
    approved: "Em breve",
    issued: "Emitida",
    primary_closed: "Encerrada",
    secondary_open: "Mercado secundário",
  };
  const riskLabels: Record<string,string> = { low: "Baixo", medium: "Médio", high: "Alto" };
  return (
    <Link
      to={`/investir/ativo/${token.symbol}`}
      className="group relative bg-graphite/40 border border-bone/10 rounded-xl p-5 hover:border-volt/40 transition-all overflow-hidden"
    >
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-volt/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-[10px] font-mono text-volt/80 mb-1">{token.symbol}</div>
            <div className="font-semibold text-bone leading-tight line-clamp-2">{token.name}</div>
          </div>
          <span className="text-[10px] uppercase tracking-wider bg-volt/10 text-volt px-2 py-0.5 rounded">
            {statusLabels[token.status] || token.status}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Field label="Instrumento" value={token.instrument_type} />
          <Field label="Risco" value={riskLabels[token.risk_level || ""] || "—"} />
          <Field label="Preço/token" value={fmtBRL(token.initial_price)} mono />
          <Field label="Ticket mínimo" value={fmtBRL(token.min_ticket)} mono />
        </div>
        <div>
          <div className="flex justify-between text-[11px] text-bone/50 mb-1.5">
            <span>{pct.toFixed(0)}% captado</span>
            <span className="font-mono tabular-nums">
              {fmtBRL(token.amount_raised)} {token.total_offering_amount ? `/ ${fmtBRL(token.total_offering_amount)}` : ""}
            </span>
          </div>
          <div className="h-1.5 bg-carbon/80 rounded-full overflow-hidden">
            <div className="h-full bg-volt rounded-full" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    </Link>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-bone/40">{label}</div>
      <div className={`text-sm text-bone ${mono ? "font-mono tabular-nums" : ""}`}>{value}</div>
    </div>
  );
}
