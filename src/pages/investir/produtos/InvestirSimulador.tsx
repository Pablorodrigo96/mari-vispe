import { InstitutionalPage } from "@/components/investir/InstitutionalPage";
import { SectionBand } from "@/components/investir/SectionBand";
import { SimuladorRapido } from "@/components/investir/SimuladorRapido";
import { photos } from "@/lib/investirPhotos";

export default function InvestirSimulador() {
  return (
    <InstitutionalPage
      kicker="Simulador"
      title="Quanto seu dinheiro pode render?"
      subtitle="Projeção ilustrativa baseada em cenário médio de ofertas privadas (14% a.a.). Não é promessa de retorno."
      image={photos.heroFamilia}
      crumbs={[{ label: "Produtos", to: "/investir/produtos" }, { label: "Simulador" }]}
    >
      <SectionBand tone="bone">
        <div className="max-w-3xl mx-auto">
          <SimuladorRapido />
          <p className="text-xs text-carbon/50 mt-6 text-center leading-relaxed">
            Os valores apresentados são meramente ilustrativos. Rentabilidade passada não representa
            garantia de retorno futuro. Investimentos em ativos privados envolvem risco de perda total.
          </p>
        </div>
      </SectionBand>
    </InstitutionalPage>
  );
}
