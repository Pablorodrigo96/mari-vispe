import { InstitutionalPage } from "@/components/investir/InstitutionalPage";
import { SectionBand } from "@/components/investir/SectionBand";
import { photos } from "@/lib/investirPhotos";
import { Check, X } from "lucide-react";

const vantagens = [
  { t: "Acesso a empresas privadas", d: "Você investe em negócios reais brasileiros, fora da volatilidade da bolsa." },
  { t: "Ticket a partir de R$ 100", d: "Diversificação real, sem precisar de patrimônio milionário." },
  { t: "Curadoria com due diligence", d: "Cada empresa passa por análise financeira, jurídica e de mercado antes de chegar à plataforma." },
  { t: "Regulação CVM 88 + Capitare", d: "Operação dentro do framework regulatório, com infraestrutura blockchain auditada." },
  { t: "Transparência total", d: "Demonstrações, contratos e atualizações disponíveis no painel a qualquer momento." },
  { t: "Sem taxas escondidas", d: "Sem corretagem, sem custódia. Veja a página de custos." },
];

const comparativo = [
  { feat: "Acesso a empresas privadas", mari: true, trad: false },
  { feat: "Ticket inicial baixo (R$ 100)", mari: true, trad: false },
  { feat: "Diversificação fora da bolsa", mari: true, trad: false },
  { feat: "Curadoria com due diligence", mari: true, trad: false },
  { feat: "Sem taxa de corretagem", mari: true, trad: false },
];

export default function InvestirVantagens() {
  return (
    <InstitutionalPage
      kicker="Vantagens mari"
      title="Por que investir com a mari?"
      subtitle="Acesso, simplicidade e transparência. O que antes era exclusivo de fundos e family offices, agora cabe no seu celular."
      image={photos.heroJovemCelular}
      crumbs={[{ label: "Sobre", to: "/investir/sobre" }, { label: "Vantagens" }]}
    >
      <SectionBand tone="bone">
        <div className="grid md:grid-cols-2 gap-5">
          {vantagens.map((v) => (
            <div key={v.t} className="p-6 rounded-2xl bg-white border border-carbon/10 flex gap-4">
              <div className="w-10 h-10 shrink-0 rounded-lg bg-volt grid place-items-center">
                <Check className="w-5 h-5 text-carbon" />
              </div>
              <div>
                <div className="font-semibold text-carbon">{v.t}</div>
                <p className="text-sm text-carbon/60 mt-1 leading-relaxed">{v.d}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionBand>

      <SectionBand tone="carbon">
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">mari vs. corretora tradicional</h2>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm border border-bone/10 rounded-xl overflow-hidden">
            <thead className="bg-graphite/60 text-bone/80">
              <tr>
                <th className="text-left p-4 font-medium">Característica</th>
                <th className="text-center p-4 font-medium">mari</th>
                <th className="text-center p-4 font-medium">Corretora tradicional</th>
              </tr>
            </thead>
            <tbody>
              {comparativo.map((r, i) => (
                <tr key={i} className="border-t border-bone/10">
                  <td className="p-4 text-bone">{r.feat}</td>
                  <td className="p-4 text-center">
                    {r.mari ? <Check className="inline w-5 h-5 text-volt" /> : <X className="inline w-5 h-5 text-bone/30" />}
                  </td>
                  <td className="p-4 text-center">
                    {r.trad ? <Check className="inline w-5 h-5 text-volt" /> : <X className="inline w-5 h-5 text-bone/30" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionBand>
    </InstitutionalPage>
  );
}
