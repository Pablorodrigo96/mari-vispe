import { Link } from "react-router-dom";
import { InstitutionalPage } from "@/components/investir/InstitutionalPage";
import { SectionBand } from "@/components/investir/SectionBand";
import { photos } from "@/lib/investirPhotos";
import { TrendingUp, Coins, Layers, ArrowRight } from "lucide-react";

const tipos = [
  {
    icon: TrendingUp,
    titulo: "Equity",
    desc: "Participação societária em empresas. Você se torna sócio e participa do crescimento de longo prazo.",
    perfil: "Perfil mais arrojado — horizonte 3 a 7 anos.",
  },
  {
    icon: Coins,
    titulo: "Dívida",
    desc: "Empresta capital para a empresa e recebe principal + juros em prazo definido. Retornos mais previsíveis.",
    perfil: "Perfil moderado — horizonte 12 a 36 meses.",
  },
  {
    icon: Layers,
    titulo: "Tokens de recebível",
    desc: "Antecipe recebíveis de empresas (contratos, faturas) com lastro auditado. Liquidez intermediária.",
    perfil: "Perfil moderado — horizonte 3 a 12 meses.",
  },
];

export default function InvestirInvestimentos() {
  return (
    <InstitutionalPage
      kicker="Investimentos"
      title="Três formas de colocar seu dinheiro para trabalhar."
      subtitle="Diversifique entre Equity, Dívida e Tokens de recebível. Tudo regulamentado pela CVM 88 e auditado pela Capitare."
      image={photos.heroEmpreendedora}
      crumbs={[{ label: "Produtos", to: "/investir/produtos" }, { label: "Investimentos" }]}
    >
      <SectionBand tone="bone">
        <div className="grid md:grid-cols-3 gap-5">
          {tipos.map(({ icon: Icon, ...t }) => (
            <div key={t.titulo} className="p-6 rounded-2xl bg-white border border-carbon/10">
              <div className="w-12 h-12 rounded-xl bg-volt grid place-items-center mb-4">
                <Icon className="w-6 h-6 text-carbon" />
              </div>
              <div className="text-xl font-semibold text-carbon">{t.titulo}</div>
              <p className="text-sm text-carbon/70 mt-2 leading-relaxed">{t.desc}</p>
              <div className="mt-4 pt-4 border-t border-carbon/10 text-xs text-carbon/60">{t.perfil}</div>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link
            to="/investir/empresas"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-carbon text-bone font-semibold text-sm hover:bg-graphite transition-colors"
          >
            Ver empresas disponíveis <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </SectionBand>
    </InstitutionalPage>
  );
}
