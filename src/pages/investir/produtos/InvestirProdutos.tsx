import { InstitutionalPage } from "@/components/investir/InstitutionalPage";
import { HubGrid } from "@/components/investir/HubGrid";
import { photos } from "@/lib/investirPhotos";

export default function InvestirProdutos() {
  return (
    <InstitutionalPage
      kicker="Nossos produtos"
      title="Tudo que você precisa para investir em empresas reais."
      subtitle="Da descoberta da oportunidade à simulação de retorno — em um só lugar."
      crumbs={[{ label: "Produtos" }]}
    >
      <section className="bg-[#FAFAF7] text-carbon">
        <div className="max-w-[1200px] mx-auto px-5 md:px-6 py-12 md:py-20">
          <HubGrid
            items={[
              {
                to: "/investir/produtos/investimentos",
                title: "Todos os investimentos",
                description: "Equity, dívida e tokens — empresas brasileiras curadas, abertas para você.",
                image: photos.tech,
              },
              {
                to: "/investir/produtos/simulador",
                title: "Simulador de investimento",
                description: "Veja o potencial de retorno do seu aporte em diferentes cenários.",
                image: photos.heroJovemCelular,
              },
            ]}
          />
        </div>
      </section>
    </InstitutionalPage>
  );
}
