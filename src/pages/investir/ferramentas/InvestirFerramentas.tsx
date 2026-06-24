import { InstitutionalPage } from "@/components/investir/InstitutionalPage";
import { HubGrid } from "@/components/investir/HubGrid";
import { photos } from "@/lib/investirPhotos";

export default function InvestirFerramentas() {
  return (
    <InstitutionalPage
      kicker="Ferramentas"
      title="Onde quiser, no dispositivo que preferir."
      subtitle="Aplicativo nativo, Home Broker web e tudo sincronizado em tempo real."
      crumbs={[{ label: "Ferramentas" }]}
    >
      <section className="bg-[#FAFAF7] text-carbon">
        <div className="max-w-[1200px] mx-auto px-5 md:px-6 py-12 md:py-20">
          <HubGrid
            items={[
              {
                to: "/investir/ferramentas/app",
                title: "Aplicativo mari",
                description: "iOS e Android. Compre, acompanhe e receba notificações no celular.",
                image: photos.heroJovemCelular,
              },
              {
                to: "/investir/ferramentas/home-broker",
                title: "Home Broker mari",
                description: "Plataforma web completa para gestão de carteira no desktop.",
                image: photos.tech,
              },
            ]}
          />
        </div>
      </section>
    </InstitutionalPage>
  );
}
