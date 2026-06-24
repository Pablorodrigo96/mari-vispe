import { InstitutionalPage } from "@/components/investir/InstitutionalPage";
import { HubGrid } from "@/components/investir/HubGrid";
import { photos } from "@/lib/investirPhotos";

export default function InvestirPoliticas() {
  return (
    <InstitutionalPage
      kicker="Políticas"
      title="Como tratamos seus dados e direitos."
      subtitle="Transparência total sobre privacidade, cookies e uso da plataforma."
      crumbs={[{ label: "Políticas" }]}
      cta={false}
    >
      <section className="bg-[#FAFAF7] text-carbon">
        <div className="max-w-[1200px] mx-auto px-5 md:px-6 py-12 md:py-20">
          <HubGrid
            items={[
              {
                to: "/investir/politicas/privacidade",
                title: "Política de Privacidade",
                description: "Quais dados coletamos, por que e como você pode exercer seus direitos LGPD.",
                image: photos.tech,
              },
              {
                to: "/investir/politicas/cookies",
                title: "Política de Cookies",
                description: "Tipos de cookies que usamos e como gerenciar suas preferências.",
                image: photos.heroJovemCelular,
              },
            ]}
          />
        </div>
      </section>
    </InstitutionalPage>
  );
}
