import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { InvestirShell } from "@/components/investir/InvestirShell";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowRight,
  ShieldCheck,
  Wallet,
  Sparkles,
  Lock,
  FileCheck2,
  Smartphone,
  TrendingUp,
  ChevronDown,
} from "lucide-react";
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

export default function InvestirHome() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("tokens")
        .select("id,symbol,name,instrument_type,initial_price,min_ticket,total_offering_amount,amount_raised,status,risk_level,listing_id")
        .in("status", ["primary_open", "approved", "issued"])
        .order("created_at", { ascending: false })
        .limit(6);
      setTokens((data as Token[]) || []);
      const { count } = await supabase
        .from("listings")
        .select("id", { head: true, count: "exact" })
        .eq("is_tokenizable", true);
      setCompanies(count || 0);
      setLoading(false);
    })();
  }, []);

  const minTicket = tokens.length ? Math.min(...tokens.map(t => t.min_ticket || 100)) : 100;

  return (
    <InvestirShell>
      {/* HERO — direto, sem jargão */}
      <section className="relative overflow-hidden border-b border-bone/10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(217,245,100,0.18),transparent_60%)]" />
        <div className="relative max-w-[1200px] mx-auto px-6 pt-20 pb-16 md:pt-28 md:pb-24 text-center">
          <span className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-volt/90 bg-volt/10 border border-volt/20 px-3 py-1.5 rounded-full mb-6">
            <Sparkles className="w-3 h-3" /> Novo · investimento em empresas privadas
          </span>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.02] text-bone max-w-4xl mx-auto">
            Invista em empresas reais <br className="hidden md:block" />
            <span className="text-volt">a partir de {fmtBRL(minTicket)}.</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-bone/70 max-w-2xl mx-auto leading-relaxed">
            Conta 100% digital, sem mensalidade. Escolha a empresa, deposite via Pix
            e acompanhe sua carteira em um só lugar.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link
              to="/investir/auth?mode=signup"
              className="inline-flex items-center gap-2 bg-volt hover:bg-volt/90 text-carbon font-semibold px-6 py-3.5 rounded-full transition-all text-base"
            >
              Quero começar <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/investir/empresas"
              className="inline-flex items-center gap-2 border border-bone/20 hover:bg-bone/10 text-bone font-medium px-6 py-3.5 rounded-full transition-all text-base"
            >
              Ver empresas disponíveis
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-x-8 gap-y-3 text-xs text-bone/50">
            <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-volt/70" />Identidade verificada</span>
            <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-volt/70" />Custódia regulada</span>
            <span className="flex items-center gap-1.5"><FileCheck2 className="w-3.5 h-3.5 text-volt/70" />Documentação jurídica</span>
          </div>
        </div>
      </section>

      {/* POR QUE INVESTIR AQUI */}
      <section className="border-b border-bone/10">
        <div className="max-w-[1200px] mx-auto px-6 py-16 md:py-20">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-bone text-center mb-3">
            Simples, do início ao fim.
          </h2>
          <p className="text-bone/60 text-center mb-12 max-w-xl mx-auto">
            Sem corretagem escondida, sem boletas complicadas. É só escolher, depositar e investir.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Wallet, t: `Comece com ${fmtBRL(minTicket)}`, d: "Ticket baixo. Sem precisar de patrimônio enorme pra entrar." },
              { icon: ShieldCheck, t: "Empresas curadas", d: "Cada oferta passa por análise antes de chegar até você." },
              { icon: Smartphone, t: "100% digital", d: "Do cadastro à compra em minutos, no celular ou no computador." },
              { icon: TrendingUp, t: "Você no controle", d: "Acompanhe sua carteira, reservas e documentos em tempo real." },
            ].map((b, i) => (
              <div key={i} className="bg-graphite/40 border border-bone/10 rounded-2xl p-6 hover:border-volt/30 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-volt/15 grid place-items-center mb-4">
                  <b.icon className="w-5 h-5 text-volt" />
                </div>
                <div className="font-semibold text-bone mb-2 text-lg">{b.t}</div>
                <div className="text-sm text-bone/60 leading-relaxed">{b.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* OFERTAS EM DESTAQUE */}
      <section className="border-b border-bone/10 bg-graphite/20">
        <div className="max-w-[1200px] mx-auto px-6 py-16 md:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
            <div>
              <div className="text-xs uppercase tracking-wider text-volt mb-2">Disponível agora</div>
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-bone">
                Empresas abertas para investimento
              </h2>
            </div>
            <Link to="/investir/empresas" className="text-sm text-bone/70 hover:text-volt flex items-center gap-1">
              Ver todas <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-56 rounded-2xl bg-graphite/50" />
              ))}
            </div>
          ) : tokens.length === 0 ? (
            <EmptyOfferings />
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tokens.map(t => <OfferCard key={t.id} token={t} />)}
            </div>
          )}
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="border-b border-bone/10">
        <div className="max-w-[1200px] mx-auto px-6 py-16 md:py-20">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-bone text-center mb-3">
            Como funciona em 4 passos
          </h2>
          <p className="text-bone/60 text-center mb-12">Em menos de 10 minutos você está investindo.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { t: "Crie sua conta", d: "Cadastro rápido com e-mail e senha. Sem papelada." },
              { t: "Confirme seus dados", d: "Envie um documento com foto e selfie. Análise em até 1 dia útil." },
              { t: "Deposite via Pix", d: "Adicione saldo na sua carteira na hora, sem taxa." },
              { t: "Escolha e invista", d: "Selecione a empresa, defina o valor e confirme. Pronto." },
            ].map((s, i) => (
              <div key={i} className="relative bg-carbon/60 border border-bone/10 rounded-2xl p-6">
                <div className="text-5xl font-semibold text-volt/30 tabular-nums leading-none mb-4">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="font-semibold text-bone mb-2 text-lg">{s.t}</div>
                <div className="text-sm text-bone/60 leading-relaxed">{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SEGURANÇA */}
      <section className="border-b border-bone/10 bg-graphite/20">
        <div className="max-w-[1200px] mx-auto px-6 py-16 md:py-20 grid md:grid-cols-[1fr_1.3fr] gap-12 items-center">
          <div>
            <div className="text-xs uppercase tracking-wider text-volt mb-3">Segurança</div>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-bone">
              Seu dinheiro protegido, regras claras.
            </h2>
            <p className="mt-4 text-bone/60 leading-relaxed">
              Investir em empresas privadas envolve risco. Por isso, somos transparentes em cada etapa.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { icon: ShieldCheck, t: "Identidade verificada", d: "KYC obrigatório com análise antifraude." },
              { icon: Lock, t: "Custódia regulada", d: "Seu saldo fica segregado em conta de pagamento." },
              { icon: FileCheck2, t: "Documentos jurídicos", d: "Cada oferta tem contrato, prospecto e riscos disponíveis." },
            ].map((s, i) => (
              <div key={i} className="bg-carbon/60 border border-bone/10 rounded-2xl p-5">
                <s.icon className="w-5 h-5 text-volt mb-3" />
                <div className="font-medium text-bone text-sm mb-1.5">{s.t}</div>
                <div className="text-xs text-bone/55 leading-relaxed">{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-b border-bone/10">
        <div className="max-w-[820px] mx-auto px-6 py-16 md:py-20">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-bone text-center mb-10">
            Perguntas frequentes
          </h2>
          <div className="divide-y divide-bone/10 border-y border-bone/10">
            {[
              {
                q: "Quanto preciso pra começar?",
                a: `O ticket mínimo varia por empresa, mas começa em ${fmtBRL(minTicket)}. Você escolhe o valor que quer investir em cada oferta.`,
              },
              {
                q: "Como recebo retorno do meu investimento?",
                a: "Depende da empresa e do tipo de oferta — pode ser via valorização da cota, dividendos ou recompra. Tudo está descrito nos documentos da oferta.",
              },
              {
                q: "Posso resgatar quando quiser?",
                a: "Investimentos em empresas privadas têm liquidez limitada. Você só consegue vender quando há comprador interessado ou em eventos previstos no contrato.",
              },
              {
                q: "Tem taxa de mensalidade?",
                a: "Não. Manter sua conta e sua carteira é grátis. Pode haver taxa por operação, sempre informada antes da reserva.",
              },
            ].map((item, i) => (
              <FaqItem key={i} {...item} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-volt/5">
        <div className="max-w-[1200px] mx-auto px-6 py-20 text-center">
          <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-bone">
            Pronto para começar?
          </h2>
          <p className="mt-4 text-bone/60 max-w-xl mx-auto">
            Abra sua conta grátis e veja todas as empresas disponíveis em segundos.
          </p>
          <Link
            to="/investir/auth?mode=signup"
            className="inline-flex items-center gap-2 mt-8 bg-volt hover:bg-volt/90 text-carbon font-semibold px-7 py-4 rounded-full transition-all"
          >
            Abrir conta grátis <ArrowRight className="w-4 h-4" />
          </Link>
          <div className="mt-4 text-xs text-bone/40">
            {companies > 0 ? `${companies}+ empresas disponíveis · ` : ""}Sem mensalidade · Cancelamento a qualquer momento
          </div>
        </div>
      </section>
    </InvestirShell>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen(o => !o)}
      className="w-full text-left py-5 flex items-start justify-between gap-4 group"
    >
      <div className="flex-1">
        <div className="font-medium text-bone group-hover:text-volt transition-colors">{q}</div>
        {open && <div className="mt-3 text-sm text-bone/65 leading-relaxed">{a}</div>}
      </div>
      <ChevronDown className={`w-5 h-5 text-bone/40 mt-0.5 transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
  );
}

function EmptyOfferings() {
  return (
    <div className="border border-dashed border-bone/15 rounded-2xl p-12 text-center bg-carbon/40">
      <div className="text-bone/70 mb-2 text-lg">Nenhuma oferta aberta no momento</div>
      <p className="text-sm text-bone/50 max-w-md mx-auto">
        Cadastre-se grátis pra receber aviso assim que a próxima empresa abrir.
      </p>
      <Link to="/investir/auth?mode=signup" className="inline-block mt-6 text-volt hover:underline text-sm font-medium">
        Quero ser avisado →
      </Link>
    </div>
  );
}

function OfferCard({ token }: { token: Token }) {
  const pct = token.total_offering_amount
    ? Math.min(100, (token.amount_raised / token.total_offering_amount) * 100)
    : 0;
  const isOpen = token.status === "primary_open";
  return (
    <Link
      to={`/investir/ativo/${token.symbol}`}
      className="group relative bg-carbon/60 border border-bone/10 rounded-2xl p-5 hover:border-volt/40 transition-all overflow-hidden block"
    >
      <div className="flex items-start justify-between mb-5">
        <div className="min-w-0 pr-3">
          <div className="font-semibold text-bone text-lg leading-tight line-clamp-2 break-words">
            {token.name}
          </div>
          <div className="text-xs text-bone/40 mt-1 font-mono">{token.symbol}</div>
        </div>
        <span className={`shrink-0 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${
          isOpen ? "bg-volt/15 text-volt" : "bg-bone/10 text-bone/60"
        }`}>
          {isOpen ? "Aberta" : "Em breve"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-bone/40">A partir de</div>
          <div className="text-base font-semibold text-bone tabular-nums">{fmtBRL(token.min_ticket)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-bone/40">Preço/cota</div>
          <div className="text-base font-semibold text-bone tabular-nums">{fmtBRL(token.initial_price)}</div>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-[11px] text-bone/50 mb-1.5">
          <span>{pct.toFixed(0)}% captado</span>
          {token.total_offering_amount && (
            <span className="font-mono tabular-nums">{fmtBRL(token.total_offering_amount)}</span>
          )}
        </div>
        <div className="h-1.5 bg-carbon/80 rounded-full overflow-hidden border border-bone/5">
          <div className="h-full bg-volt rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between text-sm">
        <span className="text-bone/60">Ver detalhes</span>
        <ArrowRight className="w-4 h-4 text-volt group-hover:translate-x-1 transition-transform" />
      </div>
    </Link>
  );
}
