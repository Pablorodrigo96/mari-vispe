import { InstitutionalPage } from "@/components/investir/InstitutionalPage";
import { SectionBand } from "@/components/investir/SectionBand";
import { photos } from "@/lib/investirPhotos";
import { CreditCard, Sparkles } from "lucide-react";

export default function InvestirCartao() {
  return (
    <InstitutionalPage
      kicker="Serviços financeiros · Em breve"
      title="Cartão de crédito mari."
      subtitle="O primeiro cartão que devolve cashback em equity das empresas que você acredita. Em desenvolvimento."
      image={photos.heroCasal}
      crumbs={[{ label: "Cartão de crédito" }]}
      cta={false}
    >
      <SectionBand tone="bone">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-16 h-16 rounded-2xl bg-volt grid place-items-center mx-auto mb-6">
            <CreditCard className="w-8 h-8 text-carbon" />
          </div>
          <h2 className="text-2xl md:text-3xl font-semibold text-carbon">Lançamento previsto para 2027</h2>
          <p className="mt-4 text-carbon/70 leading-relaxed">
            Estamos construindo o cartão de crédito que transforma cada compra em uma micro-aporte em
            empresas reais. Sem anuidade, com cashback convertido automaticamente em equity das
            ofertas ativas na plataforma.
          </p>
          <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-volt/20 border border-volt/40 text-sm text-carbon font-medium">
            <Sparkles className="w-4 h-4" /> Cadastre-se na lista de espera no painel
          </div>
        </div>
      </SectionBand>
    </InstitutionalPage>
  );
}
