import { Link } from "react-router-dom";
import { InstitutionalPage } from "@/components/investir/InstitutionalPage";
import { SectionBand } from "@/components/investir/SectionBand";
import { photos } from "@/lib/investirPhotos";
import { Monitor, BarChart3, Bell, Lock, ArrowRight } from "lucide-react";

const features = [
  { icon: BarChart3, t: "Cotações em tempo real", d: "Veja oferta, demanda e histórico de cada ativo." },
  { icon: Bell, t: "Alertas customizáveis", d: "Receba avisos por preço, evento corporativo ou nova oferta." },
  { icon: Lock, t: "Autenticação reforçada", d: "2FA, sessões auditadas e logs de acesso." },
  { icon: Monitor, t: "Layout multi-tela", d: "Personalize a tela de operação com até 4 painéis." },
];

export default function InvestirHomeBroker() {
  return (
    <InstitutionalPage
      kicker="Home Broker"
      title="A experiência completa, agora no seu navegador."
      subtitle="Painel profissional para você operar, acompanhar e gerenciar sua carteira de empresas privadas."
      image={photos.tech}
      crumbs={[{ label: "Ferramentas", to: "/investir/ferramentas" }, { label: "Home Broker" }]}
    >
      <SectionBand tone="bone">
        <div className="grid md:grid-cols-2 gap-5">
          {features.map(({ icon: Icon, ...f }) => (
            <div key={f.t} className="p-6 rounded-2xl bg-white border border-carbon/10 flex gap-4">
              <div className="w-12 h-12 shrink-0 rounded-xl bg-volt grid place-items-center">
                <Icon className="w-6 h-6 text-carbon" />
              </div>
              <div>
                <div className="font-semibold text-carbon text-lg">{f.t}</div>
                <p className="text-sm text-carbon/70 mt-1 leading-relaxed">{f.d}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link
            to="/investir/auth"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-carbon text-bone font-semibold text-sm hover:bg-graphite transition-colors"
          >
            Acessar Home Broker <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </SectionBand>
    </InstitutionalPage>
  );
}
