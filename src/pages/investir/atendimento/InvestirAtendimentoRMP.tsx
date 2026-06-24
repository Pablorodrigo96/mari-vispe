import { InstitutionalPage } from "@/components/investir/InstitutionalPage";
import { SectionBand } from "@/components/investir/SectionBand";

const passos = [
  { n: "1", t: "Tente a Central de atendimento", d: "Boa parte das demandas é resolvida em até 24h pelo chat ou e-mail." },
  { n: "2", t: "Acione a Ouvidoria", d: "Se não houver solução, registre uma reclamação formal. Prazo: 10 dias úteis." },
  { n: "3", t: "Abra um RMP", d: "Procedimento gratuito de mediação entre você e a mari, conduzido por especialista." },
];

export default function InvestirAtendimentoRMP() {
  return (
    <InstitutionalPage
      kicker="Atendimento RMP"
      title="Reclamação por Mediação Prévia."
      subtitle="Procedimento extrajudicial, gratuito e rápido para mediar conflitos entre você e a mari, antes de acionar a Justiça ou a CVM."
      crumbs={[{ label: "Atendimento", to: "/investir/atendimento" }, { label: "RMP" }]}
      cta={false}
    >
      <SectionBand tone="bone">
        <div className="max-w-3xl">
          <h2 className="text-xl md:text-2xl font-semibold text-carbon">Como funciona</h2>
          <p className="mt-3 text-carbon/70 leading-relaxed">
            O RMP (Reclamação por Mediação Prévia) é uma alternativa institucional para resolução de
            conflitos. Você apresenta a reclamação, a mari responde no prazo, e um mediador imparcial
            conduz a tentativa de acordo.
          </p>

          <div className="mt-8 space-y-4">
            {passos.map((p) => (
              <div key={p.n} className="flex gap-4 p-5 rounded-xl bg-white border border-carbon/10">
                <div className="w-10 h-10 shrink-0 rounded-full bg-volt grid place-items-center text-carbon font-bold">
                  {p.n}
                </div>
                <div>
                  <div className="font-semibold text-carbon">{p.t}</div>
                  <p className="text-sm text-carbon/70 mt-1 leading-relaxed">{p.d}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 p-6 rounded-2xl bg-carbon text-bone">
            <div className="text-[11px] uppercase tracking-wider text-volt font-semibold">Abrir RMP</div>
            <h3 className="mt-2 text-xl font-semibold">Envie sua reclamação</h3>
            <p className="mt-2 text-bone/70 text-sm leading-relaxed">
              Envie um e-mail para <strong className="text-bone">rmp@mari.invest</strong> com seu nome,
              CPF, descrição do ocorrido e documentos. Você receberá um protocolo em até 2 dias úteis.
            </p>
          </div>
        </div>
      </SectionBand>
    </InstitutionalPage>
  );
}
