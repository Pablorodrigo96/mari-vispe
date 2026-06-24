import { InstitutionalPage } from "@/components/investir/InstitutionalPage";
import { SectionBand } from "@/components/investir/SectionBand";
import { Mail, Clock, ShieldCheck } from "lucide-react";

export default function InvestirOuvidoria() {
  return (
    <InstitutionalPage
      kicker="Ouvidoria"
      title="Sua voz, levada a sério."
      subtitle="Canal de segunda instância para quando a Central de atendimento não resolveu a sua demanda. Resposta garantida em até 10 dias úteis."
      crumbs={[{ label: "Atendimento", to: "/investir/atendimento" }, { label: "Ouvidoria" }]}
      cta={false}
    >
      <SectionBand tone="bone">
        <div className="max-w-3xl">
          <div className="grid sm:grid-cols-3 gap-4 mb-10">
            <div className="p-5 rounded-xl bg-white border border-carbon/10">
              <Mail className="w-6 h-6 text-carbon mb-2" />
              <div className="font-semibold text-carbon">ouvidoria@mari.invest</div>
              <div className="text-xs text-carbon/60 mt-1">E-mail oficial</div>
            </div>
            <div className="p-5 rounded-xl bg-white border border-carbon/10">
              <Clock className="w-6 h-6 text-carbon mb-2" />
              <div className="font-semibold text-carbon">10 dias úteis</div>
              <div className="text-xs text-carbon/60 mt-1">Prazo de resposta</div>
            </div>
            <div className="p-5 rounded-xl bg-white border border-carbon/10">
              <ShieldCheck className="w-6 h-6 text-carbon mb-2" />
              <div className="font-semibold text-carbon">Independente</div>
              <div className="text-xs text-carbon/60 mt-1">Reporta direto à diretoria</div>
            </div>
          </div>

          <h2 className="text-xl md:text-2xl font-semibold text-carbon">Como registrar</h2>
          <ol className="mt-4 space-y-3 text-carbon/70 list-decimal pl-5 leading-relaxed">
            <li>Tenha em mãos o número de protocolo da sua reclamação na Central de atendimento.</li>
            <li>Envie e-mail para <strong>ouvidoria@mari.invest</strong> descrevendo o caso e anexando documentos.</li>
            <li>Você receberá um número de protocolo da Ouvidoria em até 2 dias úteis.</li>
            <li>A resposta final será enviada em até 10 dias úteis a contar do registro.</li>
          </ol>

          <form className="mt-10 p-6 rounded-2xl bg-white border border-carbon/10 space-y-4">
            <h3 className="font-semibold text-carbon">Ou registre diretamente aqui</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <input className="p-3 rounded-lg border border-carbon/15 bg-white text-carbon text-sm" placeholder="Nome completo" />
              <input className="p-3 rounded-lg border border-carbon/15 bg-white text-carbon text-sm" placeholder="CPF" />
              <input className="p-3 rounded-lg border border-carbon/15 bg-white text-carbon text-sm sm:col-span-2" placeholder="E-mail" type="email" />
              <input className="p-3 rounded-lg border border-carbon/15 bg-white text-carbon text-sm sm:col-span-2" placeholder="Protocolo anterior (se houver)" />
            </div>
            <textarea
              className="w-full p-3 rounded-lg border border-carbon/15 bg-white text-carbon text-sm min-h-[140px]"
              placeholder="Descreva o ocorrido com o máximo de detalhes."
            />
            <button
              type="button"
              className="w-full sm:w-auto px-6 py-3 rounded-md bg-carbon text-bone font-semibold text-sm hover:bg-graphite transition-colors"
            >
              Enviar para a Ouvidoria
            </button>
            <p className="text-xs text-carbon/50">
              Ao enviar, você concorda com a nossa Política de Privacidade.
            </p>
          </form>
        </div>
      </SectionBand>
    </InstitutionalPage>
  );
}
