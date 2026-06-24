import { InstitutionalPage } from "@/components/investir/InstitutionalPage";
import { SectionBand } from "@/components/investir/SectionBand";
import { photos } from "@/lib/investirPhotos";
import { Smartphone, Bell, Fingerprint, Wallet } from "lucide-react";

const features = [
  { icon: Fingerprint, t: "Login biométrico", d: "Face ID e Touch ID para entrar em 1 segundo." },
  { icon: Bell, t: "Notificações inteligentes", d: "Alertas de novas ofertas, atualizações da empresa e pagamentos." },
  { icon: Wallet, t: "Carteira em tempo real", d: "Acompanhe rendimento e marcação a mercado de cada posição." },
  { icon: Smartphone, t: "Pix integrado", d: "Aporte com 1 toque direto da sua conta bancária." },
];

export default function InvestirApp() {
  return (
    <InstitutionalPage
      kicker="Aplicativo"
      title="Sua carteira de empresas privadas no bolso."
      subtitle="Em breve nas lojas. Disponível para iOS 15+ e Android 9+."
      image={photos.heroJovemCelular}
      crumbs={[{ label: "Ferramentas", to: "/investir/ferramentas" }, { label: "Aplicativo" }]}
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
      </SectionBand>

      <SectionBand tone="carbon">
        <div className="text-center">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Em breve nas lojas</h2>
          <p className="mt-3 text-bone/70 max-w-xl mx-auto">
            Enquanto isso, use o Home Broker web — a experiência é completa e sincronizada.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <div className="px-5 py-3 rounded-lg bg-graphite/60 border border-bone/10 text-bone/80 text-sm">
              📱 App Store · em breve
            </div>
            <div className="px-5 py-3 rounded-lg bg-graphite/60 border border-bone/10 text-bone/80 text-sm">
              🤖 Google Play · em breve
            </div>
          </div>
        </div>
      </SectionBand>
    </InstitutionalPage>
  );
}
