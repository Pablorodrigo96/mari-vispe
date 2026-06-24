import { InstitutionalPage } from "@/components/investir/InstitutionalPage";
import { HubGrid } from "@/components/investir/HubGrid";
import { photos } from "@/lib/investirPhotos";

export default function InvestirAtendimento() {
  return (
    <InstitutionalPage
      kicker="Canais oficiais"
      title="Atendimento regulatório e ouvidoria."
      subtitle="Canais formais para reclamações, mediação e contato com órgãos reguladores."
      crumbs={[{ label: "Atendimento" }]}
      cta={false}
    >
      <section className="bg-[#FAFAF7] text-carbon">
        <div className="max-w-[1200px] mx-auto px-5 md:px-6 py-12 md:py-20">
          <HubGrid
            items={[
              {
                to: "/investir/atendimento/cvm",
                title: "Atendimento CVM",
                description: "Como acionar a Comissão de Valores Mobiliários — órgão regulador.",
                image: photos.tech,
              },
              {
                to: "/investir/atendimento/rmp",
                title: "Atendimento RMP",
                description: "Reclamação por Mediação Prévia — solução rápida e gratuita.",
                image: photos.heroFamilia,
              },
              {
                to: "/investir/atendimento/ouvidoria",
                title: "Ouvidoria",
                description: "Segunda instância interna. Prazo de resposta de até 10 dias úteis.",
                image: photos.depoimento1,
              },
            ]}
          />
        </div>
      </section>
    </InstitutionalPage>
  );
}
