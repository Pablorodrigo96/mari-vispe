import { useState } from "react";
import { Link } from "react-router-dom";
import { InvestirShell } from "@/components/investir/InvestirShell";
import { SectionBand } from "@/components/investir/SectionBand";
import {
  ShieldCheck, FileCheck2, Lock, Users, Clock, AlertTriangle,
  ArrowRight, ChevronDown, ExternalLink, Scale, TrendingUp, FileText,
} from "lucide-react";
import cvmLogo from "@/assets/cvm-logo.png.asset.json";
import capitareLogo from "@/assets/capitare-logo.svg.asset.json";

export default function InvestirRegulamentacao() {
  return (
    <InvestirShell>
      {/* HERO */}
      <section className="relative overflow-hidden bg-carbon border-b border-bone/5">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(217,245,100,0.15),transparent_55%)]" />
        <div className="relative max-w-[1200px] mx-auto px-5 md:px-6 pt-10 pb-12 md:pt-24 md:pb-20">
          <Link to="/investir" className="inline-flex items-center gap-1 text-xs text-bone/50 hover:text-volt mb-6">
            ← Voltar
          </Link>
          <div className="grid lg:grid-cols-[1.3fr_1fr] gap-10 items-center">
            <div>
              <span className="inline-flex items-center gap-2 text-[11px] md:text-xs uppercase tracking-wider text-volt bg-volt/10 border border-volt/25 px-3 py-1.5 rounded-full mb-4 md:mb-6">
                <ShieldCheck className="w-3 h-3" /> Regulamentação
              </span>
              <h1 className="text-[32px] leading-[1.05] md:text-5xl lg:text-6xl font-semibold tracking-tight text-bone">
                Como a mari<span className="text-volt">.invest</span> é regulada.
              </h1>
              <p className="mt-4 md:mt-5 text-base md:text-lg text-bone/70 leading-relaxed max-w-xl">
                Operamos sob a <strong className="text-bone">Resolução CVM 88</strong>, que regula
                ofertas públicas de pequeno porte via plataformas eletrônicas no Brasil. Nossa parceira
                de infraestrutura é a <strong className="text-bone">Capitare</strong>.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <div className="bg-bone rounded-2xl p-5 flex flex-col items-center justify-center aspect-square">
                <img src={cvmLogo.url} alt="CVM" className="max-h-20 max-w-full object-contain" />
                <div className="text-[10px] uppercase tracking-wider text-carbon/60 mt-3">Regulador</div>
              </div>
              <div className="bg-graphite border border-bone/10 rounded-2xl p-5 flex flex-col items-center justify-center aspect-square">
                <img src={capitareLogo.url} alt="Capitare" className="max-h-16 max-w-full object-contain" />
                <div className="text-[10px] uppercase tracking-wider text-bone/60 mt-3">Parceira</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* O QUE É CVM 88 */}
      <SectionBand tone="bone">
        <div className="max-w-3xl mx-auto text-center">
          <div className="text-xs uppercase tracking-wider text-carbon/50 mb-3">O marco regulatório</div>
          <h2 className="text-2xl md:text-4xl font-semibold tracking-tight text-carbon mb-5">
            O que é a Resolução CVM 88?
          </h2>
          <p className="text-carbon/70 leading-relaxed text-base md:text-lg">
            Editada pela Comissão de Valores Mobiliários, a <strong>CVM 88</strong> (que substituiu a
            antiga Instrução CVM 588) regula ofertas públicas de valores mobiliários de pequeno porte
            distribuídas via plataformas eletrônicas autorizadas — o chamado <em>crowdfunding de
            investimento</em>. Ela permite que empresas captem até <strong>R$ 15 milhões por oferta</strong>,
            com rito simplificado e proteções específicas ao investidor de varejo.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 md:gap-5 mt-10 max-w-5xl mx-auto">
          {[
            { icon: TrendingUp, t: "Até R$ 15M por oferta", d: "Limite máximo de captação por empresa, por rodada." },
            { icon: Users, t: "Aberta ao público", d: "Qualquer pessoa física maior de 18 anos pode investir." },
            { icon: Scale, t: "Plataforma autorizada", d: "Só plataformas registradas na CVM podem distribuir." },
          ].map((s, i) => (
            <div key={i} className="bg-white border border-carbon/10 rounded-2xl p-5">
              <div className="w-10 h-10 rounded-xl bg-volt/15 grid place-items-center mb-3">
                <s.icon className="w-5 h-5 text-carbon" />
              </div>
              <div className="font-semibold text-carbon text-sm mb-1.5">{s.t}</div>
              <div className="text-xs text-carbon/60 leading-relaxed">{s.d}</div>
            </div>
          ))}
        </div>
      </SectionBand>

      {/* COMO FUNCIONA NA PRÁTICA */}
      <SectionBand tone="carbon">
        <div className="text-center mb-10">
          <div className="text-xs uppercase tracking-wider text-volt mb-3">Como funciona</div>
          <h2 className="text-2xl md:text-4xl font-semibold tracking-tight text-bone">
            Da estruturação à liquidação.
          </h2>
          <p className="mt-3 text-bone/60 max-w-2xl mx-auto">
            Cinco etapas que toda oferta percorre antes de chegar até você.
          </p>
        </div>

        <div className="grid md:grid-cols-5 gap-3 md:gap-4 max-w-5xl mx-auto">
          {[
            { n: "01", t: "Estruturação", d: "Definição do ativo, regulamento e ticket mínimo.", prazo: "~ 2 semanas" },
            { n: "02", t: "Registro CVM", d: "Submissão e dispensa de registro via rito simplificado.", prazo: "~ 4 semanas" },
            { n: "03", t: "Plataforma", d: "Oferta entra no ar com toda documentação.", prazo: "~ 2 semanas" },
            { n: "04", t: "Captação", d: "Distribuição pública ao investidor.", prazo: "até 180 dias" },
            { n: "05", t: "Liquidação", d: "Emissão dos títulos e crédito do capital.", prazo: "~ 5 dias úteis" },
          ].map((p) => (
            <div key={p.n} className="bg-graphite/40 border border-bone/10 rounded-2xl p-4 md:p-5">
              <div className="text-volt text-xs font-mono mb-2">{p.n}</div>
              <div className="text-bone font-semibold text-sm mb-1.5">{p.t}</div>
              <div className="text-xs text-bone/55 leading-relaxed mb-3">{p.d}</div>
              <div className="text-[10px] uppercase tracking-wider text-bone/40">{p.prazo}</div>
            </div>
          ))}
        </div>
      </SectionBand>

      {/* O QUE VOCÊ PODE INVESTIR */}
      <SectionBand tone="bone">
        <div className="text-center mb-10">
          <div className="text-xs uppercase tracking-wider text-carbon/50 mb-3">Tipos de ativo</div>
          <h2 className="text-2xl md:text-4xl font-semibold tracking-tight text-carbon">
            Dois tipos de investimento.
          </h2>
          <p className="mt-3 text-carbon/60 max-w-2xl mx-auto">
            Em qualquer oferta CVM 88, a empresa emite equity ou dívida — você escolhe o que faz sentido.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 md:gap-6 max-w-4xl mx-auto">
          {[
            {
              t: "Equity",
              d: "Cotas ou participações societárias. Você vira sócio minoritário da empresa, com direitos definidos em regulamento.",
              bullets: [
                "Até R$ 15M por captação",
                "Sem pagamento periódico obrigatório",
                "Retorno por valorização ou dividendos",
                "Adequado a startups e PMEs em escala",
              ],
            },
            {
              t: "Dívida",
              d: "Debêntures, notas comerciais ou outros títulos de renda fixa. Remuneração previsível, sem diluir sociedade.",
              bullets: [
                "Até R$ 15M por captação",
                "Remuneração CDI, IPCA+ ou prefixada",
                "Vencimento entre 12 e 60 meses",
                "Pode ter garantias reais ou fidejussórias",
              ],
            },
          ].map((c) => (
            <div key={c.t} className="bg-white border border-carbon/10 rounded-2xl p-6 md:p-7">
              <div className="text-xs uppercase tracking-wider text-volt mb-2">Ativo</div>
              <div className="text-2xl font-semibold text-carbon mb-3">{c.t}</div>
              <p className="text-sm text-carbon/65 leading-relaxed mb-5">{c.d}</p>
              <ul className="space-y-2.5">
                {c.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm text-carbon/75">
                    <span className="w-1.5 h-1.5 rounded-full bg-volt mt-2 shrink-0" /> {b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </SectionBand>

      {/* PROTEÇÕES AO INVESTIDOR */}
      <SectionBand tone="carbon">
        <div className="text-center mb-10">
          <div className="text-xs uppercase tracking-wider text-volt mb-3">Proteções</div>
          <h2 className="text-2xl md:text-4xl font-semibold tracking-tight text-bone">
            Como a CVM protege você.
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {[
            { icon: ShieldCheck, t: "KYC obrigatório", d: "Identidade verificada com análise antifraude antes de qualquer investimento." },
            { icon: FileCheck2, t: "Suitability", d: "Avaliação do seu perfil de risco para garantir aderência ao investimento." },
            { icon: AlertTriangle, t: "Limite anual", d: "Investidores varejo limitados a R$ 20 mil/ano em ofertas CVM 88 (com exceções para renda/patrimônio comprovados)." },
            { icon: Lock, t: "Custódia segregada", d: "Seu saldo fica em conta de pagamento regulada, separada do patrimônio da plataforma." },
            { icon: FileText, t: "Documentação completa", d: "Contrato, prospecto, fatores de risco e demonstrativos sempre disponíveis." },
            { icon: Clock, t: "Direito de arrependimento", d: "Você pode desistir do investimento em até 5 dias após a confirmação, sem multa." },
          ].map((s, i) => (
            <div key={i} className="bg-graphite/40 border border-bone/10 rounded-2xl p-5">
              <div className="w-10 h-10 rounded-xl bg-volt/15 grid place-items-center mb-3">
                <s.icon className="w-5 h-5 text-volt" />
              </div>
              <div className="font-semibold text-bone text-sm mb-1.5">{s.t}</div>
              <div className="text-xs text-bone/60 leading-relaxed">{s.d}</div>
            </div>
          ))}
        </div>
      </SectionBand>

      {/* PARCERIA CAPITARE */}
      <SectionBand tone="bone">
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-10 items-center max-w-5xl mx-auto">
          <div className="bg-carbon rounded-2xl p-8 md:p-10 flex items-center justify-center aspect-[4/3]">
            <img src={capitareLogo.url} alt="Capitare" className="max-h-32 max-w-full object-contain" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-carbon/50 mb-3">Nossa parceira</div>
            <h2 className="text-2xl md:text-4xl font-semibold tracking-tight text-carbon mb-4">
              Infraestrutura Capitare.
            </h2>
            <p className="text-carbon/70 leading-relaxed mb-4">
              A Capitare é a plataforma de oferta pública via CVM 88 que opera nos bastidores da
              mari<span className="text-volt">.invest</span>. Eles trazem a estrutura regulatória,
              tecnológica e operacional — incluindo registro de ativos em blockchain operacional,
              escrituração e liquidação financeira.
            </p>
            <p className="text-carbon/70 leading-relaxed mb-6">
              Já são <strong>30+ empresas operando</strong> e mais de <strong>R$ 1 bilhão tokenizado</strong>{" "}
              em ofertas reguladas estruturadas via Capitare em 2025.
            </p>
            <a
              href="https://capitare.io/cvm88"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-carbon font-medium hover:text-volt transition-colors text-sm"
            >
              Conhecer a Capitare <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </SectionBand>

      {/* FAQ */}
      <SectionBand tone="bone" innerClassName="max-w-[820px] mx-auto">
        <h2 className="text-2xl md:text-4xl font-semibold tracking-tight text-carbon text-center mb-10">
          Perguntas regulatórias
        </h2>
        <div className="divide-y divide-carbon/10 border-y border-carbon/10">
          {[
            { q: "Quem é responsável pela oferta?", a: "A empresa emissora é responsável pelas informações divulgadas e pelo cumprimento das obrigações com o investidor. A plataforma (mari.invest / Capitare) é responsável por seguir o rito regulatório, fazer suitability e KYC, e custodiar o fluxo financeiro até a liquidação." },
            { q: "Posso perder dinheiro?", a: "Sim. Investir em empresas privadas envolve risco real, inclusive de perda total do valor investido. A CVM 88 não garante rentabilidade nem devolução. Leia sempre os fatores de risco da oferta antes de investir." },
            { q: "Quanto posso investir por ano?", a: "Investidores de varejo têm limite de R$ 20 mil por ano em ofertas CVM 88, somando todas as plataformas. Há exceções para quem comprova renda bruta anual ou investimentos financeiros acima de R$ 200 mil, e para investidores qualificados/profissionais." },
            { q: "O que é o direito de arrependimento?", a: "Após confirmar o investimento, você tem 5 dias para desistir sem qualquer custo ou penalidade. Os recursos são devolvidos integralmente, conforme previsto na Resolução CVM 88." },
            { q: "Onde posso reclamar?", a: "Primeiro, abra um chamado direto com o nosso atendimento. Se não houver solução, você pode acionar o Serviço de Atendimento ao Cidadão da CVM (www.gov.br/cvm) ou a plataforma consumidor.gov.br." },
            { q: "A Capitare também é regulada?", a: "Sim. A Capitare é a plataforma autorizada pela CVM para distribuição de ofertas CVM 88. A mari.invest opera em parceria white label, mantendo todo o arcabouço regulatório." },
          ].map((item, i) => <FaqItem key={i} {...item} />)}
        </div>
      </SectionBand>

      {/* CTA */}
      <section className="bg-volt">
        <div className="max-w-[1100px] mx-auto px-6 py-14 md:py-20 text-center md:text-left grid md:grid-cols-[1.3fr_1fr] gap-8 items-center">
          <div>
            <h2 className="text-2xl md:text-5xl font-semibold tracking-tight text-carbon">
              Pronto para investir com segurança?
            </h2>
            <p className="mt-4 text-carbon/75 text-base md:text-lg max-w-lg">
              Abra sua conta grátis, faça o KYC e comece a investir em empresas reguladas pela CVM.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row md:flex-col gap-3">
            <Link
              to="/investir/auth?mode=signup"
              className="inline-flex items-center justify-center gap-2 bg-carbon hover:bg-carbon/90 text-bone font-semibold px-7 py-4 rounded-full text-base"
            >
              Abrir conta grátis <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/investir/empresas"
              className="inline-flex items-center justify-center gap-2 border-2 border-carbon text-carbon hover:bg-carbon hover:text-bone font-semibold px-7 py-4 rounded-full text-base transition-colors"
            >
              Ver ofertas
            </Link>
          </div>
        </div>
        <div className="bg-carbon text-bone/45 text-[10px] text-center py-2 px-4">
          Investimentos em empresas privadas envolvem risco de perda total. Leia sempre a documentação da oferta.
        </div>
      </section>

      <div className="md:hidden h-4" aria-hidden />
    </InvestirShell>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button onClick={() => setOpen(o => !o)} className="w-full text-left py-5 flex items-start justify-between gap-4 group">
      <div className="flex-1">
        <div className="font-medium text-carbon group-hover:text-volt transition-colors">{q}</div>
        {open && <div className="mt-3 text-sm text-carbon/65 leading-relaxed break-words">{a}</div>}
      </div>
      <ChevronDown className={`w-5 h-5 text-carbon/40 mt-0.5 transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
    </button>
  );
}
