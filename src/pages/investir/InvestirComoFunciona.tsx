import { Link } from "react-router-dom";
import { InvestirShell, SectionEyebrow } from "@/components/investir/InvestirShell";
import { ShieldCheck, Layers, Wallet, TrendingUp, FileCheck2, Lock, Coins } from "lucide-react";

export default function InvestirComoFunciona() {
  return (
    <InvestirShell>
      <section className="border-b border-bone/10 bg-graphite/30">
        <div className="max-w-4xl mx-auto px-6 py-20">
          <SectionEyebrow>Plataforma regulada</SectionEyebrow>
          <h1 className="mt-3 text-4xl md:text-5xl font-semibold text-bone tracking-tight">
            Como funciona a mari.invest
          </h1>
          <p className="mt-4 text-bone/70 text-lg leading-relaxed max-w-2xl">
            Conectamos investidores a empresas privadas reais por meio de ativos digitais tokenizados.
            Cada etapa segue regras claras de compliance, transparência e proteção do investidor.
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-16 space-y-12">
        <Step n="01" icon={ShieldCheck} title="Cadastro e verificação de identidade (KYC)" desc="Você cria sua conta e envia seus dados pessoais e documentos. Nosso time analisa para garantir conformidade com as regras de prevenção à lavagem de dinheiro (AML)." />
        <Step n="02" icon={Layers} title="Suitability: definição do seu perfil" desc="Um questionário curto identifica seu perfil — conservador, moderado, agressivo, qualificado ou profissional — e quais ativos são compatíveis com você." />
        <Step n="03" icon={Wallet} title="Carteira interna em reais" desc="Você deposita via Pix e mantém um saldo na carteira da plataforma. Esse saldo é usado para reservar tokens em ofertas primárias." />
        <Step n="04" icon={Coins} title="Reserva e alocação de tokens" desc="Escolhe a empresa, define o valor e confirma. O valor é bloqueado e, após validação de compliance, os tokens são alocados na sua carteira." id="tokenizacao" />
        <Step n="05" icon={Lock} title="Custódia e proteção" desc="Os tokens ficam custodiados na plataforma com whitelist de investidores aprovados. Toda movimentação é registrada e auditada." />
        <Step n="06" icon={TrendingUp} title="Acompanhamento e eventos corporativos" desc="Você acompanha sua carteira em tempo real, recebe atualizações da empresa, distribuições e eventos relevantes." />
        <Step n="07" icon={FileCheck2} title="Documentos e transparência" desc="Cada oferta vem com prospecto, regulamento, escritura e documentos vinculados ao token. Você lê e assina antes de investir." />
      </section>

      <section className="border-t border-bone/10 bg-volt/5">
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <h2 className="text-3xl font-semibold text-bone">Pronto para começar?</h2>
          <Link to="/investir/auth?mode=signup" className="inline-block mt-6 bg-volt hover:bg-volt/90 text-carbon font-semibold px-6 py-3 rounded-md">
            Criar conta de investidor
          </Link>
        </div>
      </section>
    </InvestirShell>
  );
}

function Step({ n, icon: Icon, title, desc, id }: any) {
  return (
    <div id={id} className="grid md:grid-cols-[120px_60px_1fr] gap-6 items-start">
      <div className="text-5xl font-mono text-volt/40 tabular-nums">{n}</div>
      <div><Icon className="w-8 h-8 text-volt" /></div>
      <div>
        <h3 className="text-xl font-semibold text-bone">{title}</h3>
        <p className="mt-2 text-bone/60 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
