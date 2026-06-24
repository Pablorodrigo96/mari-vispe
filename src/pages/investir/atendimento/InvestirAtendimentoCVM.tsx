import { InstitutionalPage } from "@/components/investir/InstitutionalPage";
import { SectionBand } from "@/components/investir/SectionBand";
import { ExternalLink, AlertCircle } from "lucide-react";

export default function InvestirAtendimentoCVM() {
  return (
    <InstitutionalPage
      kicker="Atendimento CVM"
      title="Como falar com a Comissão de Valores Mobiliários."
      subtitle="A CVM é o órgão regulador do mercado de capitais brasileiro e fiscaliza a atuação da mari."
      crumbs={[{ label: "Atendimento", to: "/investir/atendimento" }, { label: "CVM" }]}
      cta={false}
    >
      <SectionBand tone="bone">
        <div className="max-w-3xl space-y-8">
          <div>
            <h2 className="text-xl md:text-2xl font-semibold text-carbon">Quando acionar a CVM</h2>
            <p className="mt-3 text-carbon/70 leading-relaxed">
              Você pode acionar a CVM quando entender que houve descumprimento de normas do mercado
              de capitais por parte da mari, de empresas emissoras ou de outros participantes.
              Recomendamos primeiro tentar resolver via nossa <strong>Central de atendimento</strong> e,
              se não resolvido, pela <strong>Ouvidoria</strong>.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-carbon/10">
            <h3 className="font-semibold text-carbon">Canais oficiais da CVM</h3>
            <ul className="mt-4 space-y-3 text-sm text-carbon/80">
              <li>
                <strong>Serviço de Atendimento ao Cidadão (SAC):</strong>{" "}
                <a
                  href="https://www.gov.br/cvm/pt-br/canais_atendimento/sac"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 underline hover:no-underline"
                  style={{ color: "#8a9a1e" }}
                >
                  gov.br/cvm/sac <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li><strong>Telefone:</strong> 0800 591 0084</li>
              <li><strong>Endereço:</strong> Rua Sete de Setembro, 111 — Centro, Rio de Janeiro/RJ</li>
            </ul>
          </div>

          <div className="p-5 rounded-xl bg-amber-50 border border-amber-200 flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-900 leading-relaxed">
              A CVM <strong>não atua como mediadora</strong> em reclamações individuais nem garante
              ressarcimento. Para mediação, utilize o RMP. Para resolução interna, a Ouvidoria.
            </p>
          </div>
        </div>
      </SectionBand>
    </InstitutionalPage>
  );
}
