import { InstitutionalPage } from "@/components/investir/InstitutionalPage";
import { HubGrid } from "@/components/investir/HubGrid";
import { photos } from "@/lib/investirPhotos";

export default function InvestirSobre() {
  return (
    <InstitutionalPage
      kicker="Sobre"
      title="Quem está por trás da mari"
      subtitle="Somos uma plataforma de investimentos em empresas brasileiras reais. Nossa missão é tornar o capital privado acessível, transparente e simples."
      image={photos.heroEmpreendedora}
      crumbs={[{ label: "Sobre" }]}
    >
      <section className="bg-[#FAFAF7] text-carbon">
        <div className="max-w-[1200px] mx-auto px-5 md:px-6 py-12 md:py-20">
          <HubGrid
            items={[
              {
                to: "/investir/sobre/a-mari",
                title: "A mari",
                description: "Nossa história, propósito e os números da plataforma.",
                image: photos.tech,
              },
              {
                to: "/investir/sobre/quem-somos",
                title: "Quem somos",
                description: "Fundadores, time executivo e conselho consultivo.",
                image: photos.personaDiversifica,
              },
              {
                to: "/investir/sobre/vantagens",
                title: "Vantagens mari",
                description: "Por que investir conosco em vez da corretora tradicional.",
                image: photos.heroJovemCelular,
              },
            ]}
          />
        </div>
      </section>
    </InstitutionalPage>
  );
}
