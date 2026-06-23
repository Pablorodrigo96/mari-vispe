import { Link } from "react-router-dom";
import { InvestirShell } from "@/components/investir/InvestirShell";
import { SectionBand } from "@/components/investir/SectionBand";
import { ShieldCheck, Layers, Wallet, TrendingUp, FileCheck2, Lock, Coins, ArrowRight, CheckCircle2 } from "lucide-react";
import { photos } from "@/lib/investirPhotos";

export default function InvestirComoFunciona() {
  return (
    <InvestirShell>
      {/* Hero claro */}
      <SectionBand tone="bone" innerClassName="grid md:grid-cols-[1fr_1fr] gap-10 items-center">
        <div>
          <div className="text-xs uppercase tracking-wider text-carbon/50 mb-3">Como funciona</div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-carbon tracking-tight leading-tight">
            Investir em empresas brasileiras, <span className="text-carbon">passo a passo.</span>
          </h1>
          <p className="mt-5 text-carbon/65 text-lg leading-relaxed max-w-lg">
            A gente conecta você a empresas privadas reais. Sem corretora, sem papelada, sem termos difíceis —
            tudo digital, do cadastro à compra.
          </p>
          <Link to="/investir/auth?mode=signup" className="mt-7 inline-flex items-center gap-2 bg-carbon hover:bg-carbon/90 text-bone font-semibold px-7 py-4 rounded-full">
            Quero abrir minha conta <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="rounded-3xl overflow-hidden aspect-[4/3] border border-carbon/10">
          <img src={photos.comoFunciona} alt="Pessoa usando aplicativo" className="w-full h-full object-cover" />
        </div>
      </SectionBand>

      {/* Faixa Volt */}
      <section className="bg-volt">
        <div className="max-w-[1100px] mx-auto px-6 py-8 grid md:grid-cols-3 gap-6 text-center">
          {[
            ["3 min", "para abrir conta"],
            ["1 dia útil", "para aprovar cadastro"],
            ["R$ 100", "ticket mínimo"],
          ].map(([n, d]) => (
            <div key={n}>
              <div className="text-3xl font-bold text-carbon">{n}</div>
              <div className="text-sm text-carbon/70">{d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Passos com bandas alternadas */}
      <SectionBand tone="carbon">
        <h2 className="text-3xl md:text-4xl font-semibold text-bone text-center mb-3">7 etapas, tudo no app</h2>
        <p className="text-bone/60 text-center mb-12 max-w-xl mx-auto">Cada etapa segue regras claras de compliance, transparência e proteção.</p>
        <div className="space-y-4">
          {[
            { n: "01", icon: ShieldCheck, t: "Cadastro e KYC", d: "Você cria sua conta com e-mail e senha. Depois envia seus dados pessoais — a gente verifica sua identidade (CVM/AML)." },
            { n: "02", icon: Layers, t: "Suitability — descobrimos seu perfil", d: "Um questionário rápido mostra se você é conservador, moderado ou agressivo. Isso garante que você só veja oportunidades compatíveis com você." },
            { n: "03", icon: Wallet, t: "Carteira em reais via Pix", d: "Sua conta tem uma carteira em reais. Você deposita por Pix e usa esse saldo pra investir nas ofertas." },
            { n: "04", icon: Coins, t: "Reserva e alocação de cotas", d: "Escolhe a empresa, define o valor e confirma. Após validação, suas cotas aparecem na sua carteira.", id: "tokenizacao" },
            { n: "05", icon: Lock, t: "Custódia segura", d: "Suas cotas ficam custodiadas com whitelist de investidores aprovados. Toda movimentação é auditada." },
            { n: "06", icon: TrendingUp, t: "Acompanhe sua carteira", d: "Você vê sua carteira em tempo real, recebe atualizações das empresas e eventos relevantes." },
            { n: "07", icon: FileCheck2, t: "Documentos sempre à mão", d: "Cada oferta tem prospecto, contrato e riscos — você lê e assina antes de investir." },
          ].map((s) => (
            <div key={s.n} id={s.id} className="bg-graphite/30 hover:bg-graphite/50 border border-bone/10 rounded-2xl p-6 grid md:grid-cols-[80px_60px_1fr] gap-5 items-start transition-colors">
              <div className="text-4xl font-mono text-volt/50 tabular-nums">{s.n}</div>
              <div className="w-12 h-12 rounded-xl bg-volt/15 grid place-items-center">
                <s.icon className="w-6 h-6 text-volt" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-bone mb-1">{s.t}</h3>
                <p className="text-bone/65 leading-relaxed text-sm">{s.d}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionBand>

      {/* Por que a mari */}
      <SectionBand tone="bone">
        <div className="grid md:grid-cols-[1fr_1.2fr] gap-12 items-center">
          <div className="rounded-3xl overflow-hidden aspect-square border border-carbon/10">
            <img src={photos.heroFamilia} alt="" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-carbon/50 mb-3">Por que aqui</div>
            <h2 className="text-3xl md:text-4xl font-semibold text-carbon tracking-tight">
              Feito pra quem quer começar simples.
            </h2>
            <ul className="mt-6 space-y-3">
              {[
                "Sem mensalidade, sem taxa de abertura",
                "Empresas curadas — só chega o que passa na análise",
                "Documentos jurídicos disponíveis pra cada oferta",
                "Custódia regulada e identidade verificada",
                "Suporte humano por WhatsApp e e-mail",
              ].map(t => (
                <li key={t} className="flex items-center gap-3 text-carbon/80">
                  <CheckCircle2 className="w-5 h-5 text-carbon shrink-0" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </SectionBand>

      {/* CTA */}
      <section className="bg-volt">
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <h2 className="text-3xl md:text-4xl font-semibold text-carbon">Bora começar?</h2>
          <p className="mt-3 text-carbon/70">Em menos de 3 minutos você abre sua conta — grátis e sem complicação.</p>
          <Link to="/investir/auth?mode=signup" className="inline-flex items-center gap-2 mt-6 bg-carbon text-bone hover:bg-carbon/90 font-semibold px-8 py-4 rounded-full">
            Abrir conta grátis <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </InvestirShell>
  );
}
