import { InvestirShell, SectionEyebrow } from "@/components/investir/InvestirShell";
import { AlertTriangle } from "lucide-react";

const RISKS = [
  { t: "Risco de perda total do capital", d: "Empresas privadas têm risco elevado e podem falir, levando à perda total do valor investido." },
  { t: "Baixa liquidez", d: "Ativos privados podem ter pouca ou nenhuma liquidez. A possibilidade de venda dos tokens no mercado secundário pode ser limitada." },
  { t: "Risco regulatório", d: "Mudanças regulatórias podem afetar a oferta, a negociação ou os direitos econômicos do investidor." },
  { t: "Risco de diluição", d: "Novas rodadas, conversões ou emissões podem diluir sua participação econômica." },
  { t: "Risco de governança", d: "Decisões da empresa emissora podem impactar o valor do token sem que o investidor tenha direito a voto." },
  { t: "Risco operacional e tecnológico", d: "Falhas técnicas, smart contracts ou da custódia podem afetar a disponibilidade dos ativos." },
  { t: "Risco fiscal", d: "Tributação aplicável pode mudar e impactar a rentabilidade líquida." },
  { t: "Rentabilidade não garantida", d: "Rentabilidade passada ou projetada não representa garantia de retorno futuro." },
];

export default function InvestirRiscos() {
  return (
    <InvestirShell>
      <section className="border-b border-bone/10 bg-graphite/30">
        <div className="max-w-4xl mx-auto px-6 py-20">
          <SectionEyebrow>Educação e risco</SectionEyebrow>
          <h1 className="mt-3 text-4xl md:text-5xl font-semibold text-bone tracking-tight">
            Riscos do investimento em ativos privados
          </h1>
          <p className="mt-4 text-bone/70 text-lg max-w-2xl">
            Investir em empresas privadas oferece potencial relevante, mas envolve riscos significativos.
            Conheça antes de operar.
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-16 space-y-4">
        {RISKS.map(r => (
          <div key={r.t} className="bg-graphite/40 border border-bone/10 rounded-xl p-5 flex gap-4">
            <AlertTriangle className="w-5 h-5 text-volt shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-bone">{r.t}</div>
              <p className="text-bone/60 text-sm mt-1 leading-relaxed">{r.d}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="border-t border-bone/10 bg-volt/5">
        <div className="max-w-3xl mx-auto px-6 py-12 text-center text-sm text-bone/70 leading-relaxed">
          Leia sempre os documentos da oferta antes de investir. Em caso de dúvida, consulte um assessor.
          A negociação pode estar sujeita a restrições regulatórias, operacionais e de elegibilidade.
        </div>
      </section>
    </InvestirShell>
  );
}
