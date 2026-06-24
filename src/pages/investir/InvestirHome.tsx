import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { InvestirShell } from "@/components/investir/InvestirShell";
import { SectionBand } from "@/components/investir/SectionBand";
import { SimuladorRapido } from "@/components/investir/SimuladorRapido";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowRight, ShieldCheck, Wallet, Lock, FileCheck2,
  Smartphone, TrendingUp, ChevronDown, CheckCircle2, Sparkles, Users, Heart, Rocket,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { photos, sectorPhoto } from "@/lib/investirPhotos";

type Token = {
  id: string; symbol: string; name: string; instrument_type: string;
  initial_price: number; min_ticket: number;
  total_offering_amount: number | null; amount_raised: number;
  status: string; risk_level: string | null; listing_id: string | null;
  sector?: string | null;
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
      {/* 1. HERO mobile-first */}
      <section className="relative overflow-hidden bg-carbon border-b border-bone/5">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(217,245,100,0.15),transparent_55%)]" />
        <div className="relative max-w-[1300px] mx-auto px-5 md:px-6 pt-8 pb-8 md:pt-24 md:pb-20 grid lg:grid-cols-[1.1fr_1fr] gap-8 lg:gap-16 items-center">
          <div className="order-2 lg:order-1">
            <span className="inline-flex items-center gap-2 text-[11px] md:text-xs uppercase tracking-wider text-volt bg-volt/10 border border-volt/25 px-3 py-1.5 rounded-full mb-4 md:mb-6">
              <Sparkles className="w-3 h-3" /> Empresas brasileiras
            </span>
            <h1 className="text-[34px] leading-[1.05] md:text-5xl lg:text-6xl font-semibold tracking-tight text-bone">
              Invista em empresas brasileiras <span className="text-volt">de verdade.</span>
            </h1>
            <p className="mt-4 md:mt-5 text-base md:text-lg text-bone/70 leading-relaxed max-w-xl">
              A partir de <strong className="text-bone">{fmtBRL(minTicket)}</strong> você vira sócio de negócios reais. Cadastro grátis, 100% pelo celular.
            </p>
            <div className="mt-6 md:mt-8 flex flex-col sm:flex-row gap-2.5 sm:gap-3">
              <Link
                to="/investir/auth?mode=signup"
                className="inline-flex items-center justify-center gap-2 bg-volt hover:bg-volt/90 text-carbon font-semibold px-6 py-3.5 md:px-7 md:py-4 rounded-full text-base transition-all"
              >
                Abrir conta grátis <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/investir/empresas"
                className="inline-flex items-center justify-center gap-2 border border-bone/25 hover:bg-bone/10 text-bone font-medium px-6 py-3.5 md:px-7 md:py-4 rounded-full text-base transition-all"
              >
                Ver oportunidades
              </Link>
            </div>
            <div className="mt-6 md:mt-8 grid grid-cols-3 md:flex md:flex-wrap gap-x-3 md:gap-x-6 gap-y-2 text-[11px] md:text-xs text-bone/55">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-volt shrink-0" />Sem taxa</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-volt shrink-0" />Aprovação 1 dia</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-volt shrink-0" />Pix instantâneo</span>
            </div>
          </div>

          <div className="relative order-1 lg:order-2">
            <div className="relative rounded-2xl md:rounded-3xl overflow-hidden border border-bone/10 aspect-[16/10] md:aspect-[4/5] max-w-md mx-auto lg:max-w-none">
              <img
                src={photos.heroEmpreendedora}
                alt="Empreendedora brasileira"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-carbon/80 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 md:bottom-5 md:left-5 md:right-5 bg-carbon/85 backdrop-blur-md border border-bone/10 rounded-xl md:rounded-2xl p-3 md:p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-volt grid place-items-center text-carbon font-bold">+</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-bone text-sm font-medium truncate">{companies > 0 ? `${companies}+ empresas` : "Empresas curadas"}</div>
                    <div className="text-bone/55 text-xs">prontas para receber investimento</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-volt shrink-0" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. FAIXA KTO — Volt sólido */}
      <section className="bg-volt">
        <div className="max-w-[1200px] mx-auto px-5 md:px-6 py-6 md:py-10 grid grid-cols-3 gap-3 md:gap-6">
          {[
            { icon: Wallet, t: `A partir de ${fmtBRL(minTicket)}`, d: "Ticket baixo" },
            { icon: Smartphone, t: "100% digital", d: "Pelo celular" },
            { icon: ShieldCheck, t: "Sem mensalidade", d: "Conta grátis" },
          ].map((b, i) => (
            <div key={i} className="flex flex-col md:flex-row items-center md:items-center text-center md:text-left gap-2 md:gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-carbon grid place-items-center shrink-0">
                <b.icon className="w-4 h-4 md:w-5 md:h-5 text-volt" />
              </div>
              <div className="min-w-0">
                <div className="text-carbon font-bold text-[11px] md:text-base leading-tight">{b.t}</div>
                <div className="text-carbon/70 text-[10px] md:text-sm hidden md:block">{b.d}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. COMO FUNCIONA — Bone (claro) com fotos */}
      <SectionBand tone="bone">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-wider text-carbon/60 bg-carbon/5 px-3 py-1 rounded-full mb-4">
            Simples
          </div>
          <h2 className="text-2xl md:text-5xl font-semibold tracking-tight text-carbon">
            Comece em 3 passos.
          </h2>
          <p className="mt-3 text-carbon/60 max-w-xl mx-auto">
            Sem papelada, sem corretor. Você no controle do início ao fim.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            { n: "1", t: "Crie sua conta grátis", d: "Cadastro com e-mail em menos de 1 minuto.", img: photos.heroJovemCelular },
            { n: "2", t: "Escolha a empresa", d: "Navegue pelas oportunidades curadas e leia os detalhes.", img: photos.heroFamilia },
            { n: "3", t: "Invista via Pix", d: "Confirme o valor e pronto — você já é sócio.", img: photos.heroCasal },
          ].map((s) => (
            <div key={s.n} className="bg-white rounded-2xl overflow-hidden border border-carbon/10 hover:border-volt hover:shadow-[0_20px_60px_-20px_rgba(0,0,0,0.15)] transition-all">
              <div className="aspect-[16/10] overflow-hidden bg-carbon/5">
                <img src={s.img} alt={s.t} className="w-full h-full object-cover" />
              </div>
              <div className="p-6">
                <div className="w-10 h-10 rounded-full bg-volt grid place-items-center text-carbon font-bold mb-3">{s.n}</div>
                <div className="text-carbon font-semibold text-lg mb-1.5">{s.t}</div>
                <div className="text-carbon/60 text-sm leading-relaxed">{s.d}</div>
              </div>
            </div>
          ))}
        </div>
      </SectionBand>

      {/* 4. OFERTAS EM DESTAQUE — Carbon */}
      <SectionBand tone="carbon">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <div className="text-xs uppercase tracking-wider text-volt mb-2">Disponível agora</div>
            <h2 className="text-2xl md:text-4xl font-semibold tracking-tight text-bone">
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
              <Skeleton key={i} className="h-72 rounded-2xl bg-graphite/50" />
            ))}
          </div>
        ) : tokens.length === 0 ? (
          <EmptyOfferings />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tokens.map(t => <OfferCard key={t.id} token={t} />)}
          </div>
        )}
      </SectionBand>

      {/* 5. PRA QUEM É (perfis) — Bone */}
      <SectionBand tone="bone">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-5xl font-semibold tracking-tight text-carbon">
            Pra quem é a mari<span className="text-volt">.invest</span>?
          </h2>
          <p className="mt-3 text-carbon/60">Escolha o perfil que mais combina com você.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Rocket, t: "Quero começar pequeno", d: `Você pode investir a partir de ${fmtBRL(minTicket)} e ir aprendendo no caminho.`, img: photos.personaIniciante },
            { icon: Users, t: "Quero diversificar", d: "Mistura entre renda fixa e empresas privadas — mais retorno potencial com risco controlado.", img: photos.personaDiversifica },
            { icon: Heart, t: "Quero apoiar negócios reais", d: "Coloque seu dinheiro em empresas brasileiras que geram empregos e crescem de verdade.", img: photos.personaApoiador },
          ].map((p, i) => (
            <Link to="/investir/empresas" key={i} className="group bg-white rounded-2xl overflow-hidden border border-carbon/10 hover:border-volt transition-all">
              <div className="aspect-[16/11] overflow-hidden bg-carbon/5">
                <img src={p.img} alt={p.t} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="p-6">
                <p.icon className="w-6 h-6 text-volt mb-3" strokeWidth={2.2} />
                <div className="text-carbon font-semibold text-lg mb-2">{p.t}</div>
                <div className="text-carbon/60 text-sm leading-relaxed mb-4">{p.d}</div>
                <span className="text-volt text-sm font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                  Ver oportunidades <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </SectionBand>

      {/* 6. SIMULADOR — Carbon com bloco Volt */}
      <SectionBand tone="carbon">
        <div className="grid lg:grid-cols-[1fr_1.1fr] gap-10 items-center">
          <div>
            <div className="text-xs uppercase tracking-wider text-volt mb-3">Simulador</div>
            <h2 className="text-2xl md:text-5xl font-semibold tracking-tight text-bone">
              Quanto seu dinheiro pode <span className="text-volt">render?</span>
            </h2>
            <p className="mt-4 text-bone/65 text-lg leading-relaxed">
              Faça uma simulação rápida. Veja uma projeção ilustrativa de quanto seu investimento
              pode crescer ao longo dos anos investindo em empresas privadas.
            </p>
            <ul className="mt-6 space-y-3 text-bone/70 text-sm">
              {["Sem cadastro pra simular", "Resultado na hora", "Valores reais do mercado"].map(t => (
                <li key={t} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-volt" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <SimuladorRapido />
        </div>
      </SectionBand>

      {/* 7. SEGURANÇA — Bone */}
      <SectionBand tone="bone">
        <div className="grid md:grid-cols-[1fr_1.3fr] gap-12 items-center">
          <div>
            <div className="text-xs uppercase tracking-wider text-carbon/50 mb-3">Segurança</div>
            <h2 className="text-2xl md:text-4xl font-semibold tracking-tight text-carbon">
              Seu dinheiro protegido. Regras claras.
            </h2>
            <p className="mt-4 text-carbon/60 leading-relaxed">
              Investir em empresas privadas envolve risco — por isso, somos transparentes em cada etapa.
              Custódia regulada, identidade verificada e documentação jurídica completa.
            </p>
            <Link to="/investir/riscos" className="inline-flex items-center gap-1 mt-5 text-carbon font-medium hover:text-volt transition-colors text-sm">
              Entenda os riscos <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { icon: ShieldCheck, t: "KYC obrigatório", d: "Identidade verificada com análise antifraude." },
              { icon: Lock, t: "Custódia segregada", d: "Seu saldo fica em conta de pagamento regulada." },
              { icon: FileCheck2, t: "Documentos jurídicos", d: "Contrato, prospecto e riscos sempre disponíveis." },
            ].map((s, i) => (
              <div key={i} className="bg-white border border-carbon/10 rounded-2xl p-5">
                <div className="w-10 h-10 rounded-xl bg-volt/15 grid place-items-center mb-3">
                  <s.icon className="w-5 h-5 text-carbon" />
                </div>
                <div className="font-semibold text-carbon text-sm mb-1.5">{s.t}</div>
                <div className="text-xs text-carbon/55 leading-relaxed">{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </SectionBand>

      {/* 8. PROVA SOCIAL / DEPOIMENTOS — Carbon */}
      <SectionBand tone="carbon">
        <div className="text-center mb-12">
          <div className="text-xs uppercase tracking-wider text-volt mb-3">Quem está aqui</div>
          <h2 className="text-2xl md:text-5xl font-semibold tracking-tight text-bone">
            Empresas brasileiras de verdade.
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { name: "Padaria São José", quote: "Captamos R$ 800k pra abrir a segunda unidade. Em 60 dias, oferta fechada.", img: photos.padaria, sector: "Alimentação" },
            { name: "MecTech Auto Center", quote: "Os investidores se tornaram clientes. Triplicou nossa base em 6 meses.", img: photos.oficina, sector: "Serviços" },
            { name: "Brasiltech Soluções", quote: "Não foi só dinheiro — virou rede de contatos. Recomendo demais.", img: photos.tech, sector: "Tecnologia" },
          ].map((d, i) => (
            <div key={i} className="bg-graphite/40 border border-bone/10 rounded-2xl overflow-hidden">
              <div className="aspect-[16/10] overflow-hidden bg-carbon">
                <img src={d.img} alt={d.name} className="w-full h-full object-cover" />
              </div>
              <div className="p-6">
                <div className="text-[10px] uppercase tracking-wider text-volt mb-2">{d.sector}</div>
                <div className="text-bone font-semibold mb-3">{d.name}</div>
                <p className="text-bone/65 text-sm leading-relaxed italic">"{d.quote}"</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-center text-bone/40 text-[10px] mt-8">Empresas e depoimentos ilustrativos.</p>
      </SectionBand>

      {/* 9. FAQ — Bone */}
      <SectionBand tone="bone" innerClassName="max-w-[820px] mx-auto">
        <h2 className="text-2xl md:text-4xl font-semibold tracking-tight text-carbon text-center mb-10">
          Perguntas frequentes
        </h2>
        <div className="divide-y divide-carbon/10 border-y border-carbon/10">
          {[
            { q: "É seguro investir aqui?", a: "Sim. Toda oferta passa por análise jurídica e de compliance, sua identidade é verificada via KYC e seu saldo fica em conta de pagamento regulada. Mas atenção: investir em empresas privadas sempre envolve risco." },
            { q: `Quanto preciso pra começar?`, a: `O ticket mínimo varia por empresa, mas começa em ${fmtBRL(minTicket)}. Você escolhe o valor que quer investir em cada oferta.` },
            { q: "Como recebo retorno?", a: "Depende da empresa — pode ser por valorização da cota, dividendos ou recompra. Tudo descrito nos documentos da oferta antes de você investir." },
            { q: "Posso vender quando quiser?", a: "Investimentos em empresas privadas têm liquidez limitada. Você vende quando há comprador interessado ou em eventos previstos no contrato. Estamos construindo um mercado secundário pra facilitar." },
            { q: "Tem taxa ou mensalidade?", a: "Não. Sua conta e sua carteira são grátis. Pode haver taxa por operação, sempre informada antes da reserva." },
            { q: "Quem regula a plataforma?", a: "Operamos seguindo regras da CVM aplicáveis a ofertas via crowdfunding de investimento (Resolução CVM 88), com custódia em parceiros regulados e assinatura eletrônica MP 2.200-2." },
          ].map((item, i) => <FaqItem key={i} {...item} />)}
        </div>
      </SectionBand>

      {/* 10. CTA FINAL — Volt full-bleed */}
      <section className="bg-volt">
        <div className="max-w-[1100px] mx-auto px-6 py-16 md:py-20 grid md:grid-cols-[1.3fr_1fr] gap-10 items-center">
          <div>
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-carbon">
              Pronto pra ser sócio?
            </h2>
            <p className="mt-4 text-carbon/75 text-lg max-w-lg">
              Abra sua conta em 3 minutos. Sem mensalidade, sem complicação.
              {companies > 0 && ` Mais de ${companies} empresas esperando você.`}
            </p>
            <Link
              to="/investir/auth?mode=signup"
              className="inline-flex items-center gap-2 mt-8 bg-carbon hover:bg-carbon/90 text-bone font-semibold px-8 py-4 rounded-full text-base transition-colors"
            >
              Abrir conta grátis <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="hidden md:flex items-center justify-center">
            <div className="grid grid-cols-2 gap-3">
              {[photos.personaIniciante, photos.personaDiversifica, photos.depoimento1, photos.personaApoiador].map((src, i) => (
                <div key={i} className={`rounded-2xl overflow-hidden aspect-square border-2 border-carbon ${i % 2 ? "translate-y-4" : ""}`}>
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="bg-carbon text-bone/45 text-[10px] text-center py-2">
          Fotos meramente ilustrativas. Investimentos em empresas privadas envolvem risco de perda total.
        </div>
      </section>
    </InvestirShell>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button onClick={() => setOpen(o => !o)} className="w-full text-left py-5 flex items-start justify-between gap-4 group">
      <div className="flex-1">
        <div className="font-medium text-carbon group-hover:text-volt transition-colors">{q}</div>
        {open && <div className="mt-3 text-sm text-carbon/65 leading-relaxed">{a}</div>}
      </div>
      <ChevronDown className={`w-5 h-5 text-carbon/40 mt-0.5 transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
  );
}

function EmptyOfferings() {
  return (
    <div className="border border-dashed border-bone/15 rounded-2xl p-12 text-center bg-graphite/40">
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
  const img = sectorPhoto(token.sector || token.name);

  return (
    <Link
      to={`/investir/ativo/${token.symbol}`}
      className="group relative bg-graphite/30 border border-bone/10 rounded-2xl hover:border-volt/50 transition-all overflow-hidden block"
    >
      <div className="aspect-[16/9] overflow-hidden bg-carbon relative">
        <img src={img} alt={token.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-graphite/90 to-transparent" />
        <span className={`absolute top-3 right-3 text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full font-semibold ${
          isOpen ? "bg-volt text-carbon animate-pulse" : "bg-bone/15 text-bone/80 backdrop-blur"
        }`}>
          {isOpen ? "● Aberta" : "Em breve"}
        </span>
      </div>

      <div className="p-5">
        <div className="font-semibold text-bone text-base leading-tight line-clamp-2 break-words mb-1">
          {token.name}
        </div>
        <div className="text-[11px] text-bone/40 mb-4 font-mono">{token.symbol}</div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-bone/40">A partir de</div>
            <div className="text-sm font-semibold text-bone tabular-nums">{fmtBRL(token.min_ticket)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-bone/40">Por cota</div>
            <div className="text-sm font-semibold text-bone tabular-nums">{fmtBRL(token.initial_price)}</div>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-[11px] text-bone/50 mb-1.5">
            <span><strong className="text-volt">{pct.toFixed(0)}%</strong> captado</span>
            {token.total_offering_amount && (
              <span className="font-mono tabular-nums">de {fmtBRL(token.total_offering_amount)}</span>
            )}
          </div>
          <div className="h-1.5 bg-carbon rounded-full overflow-hidden">
            <div className="h-full bg-volt rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-bone/60">Quero ver</span>
          <ArrowRight className="w-4 h-4 text-volt group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  );
}
