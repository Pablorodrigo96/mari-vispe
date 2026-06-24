import { InstitutionalPage } from "@/components/investir/InstitutionalPage";
import { SectionBand } from "@/components/investir/SectionBand";
import { Check } from "lucide-react";

const custos = [
  { item: "Abertura de conta", valor: "Grátis", obs: "Sem taxa de cadastro nem manutenção" },
  { item: "Manutenção mensal", valor: "Grátis", obs: "Sem mensalidade independente do saldo" },
  { item: "Aporte via Pix", valor: "Grátis", obs: "Confirmação em até 5 minutos" },
  { item: "Aporte via TED", valor: "Grátis", obs: "Compensação em D+0 útil" },
  { item: "Corretagem por ordem", valor: "R$ 0", obs: "Sem corretagem em ofertas primárias" },
  { item: "Custódia mensal", valor: "Grátis", obs: "Ativos custodiados pela Capitare" },
  { item: "Saque para sua conta", valor: "Grátis", obs: "Pix em até 1h útil" },
  { item: "Taxa de performance", valor: "1% a 2% a.a.", obs: "Apenas sobre lucro realizado em equity, conforme oferta" },
  { item: "Taxa da empresa emissora", valor: "Varia por oferta", obs: "Descrita no termo de cada captação" },
];

export default function InvestirCustos() {
  return (
    <InstitutionalPage
      kicker="Custos"
      title="Sem letras miúdas. Sem surpresas."
      subtitle="Transparência total sobre tudo que você paga (e não paga) para investir na mari."
      crumbs={[{ label: "Custos" }]}
    >
      <SectionBand tone="bone">
        <div className="overflow-x-auto">
          <table className="w-full text-sm rounded-xl overflow-hidden border border-carbon/10">
            <thead className="bg-carbon text-bone">
              <tr>
                <th className="text-left p-4 font-medium">Item</th>
                <th className="text-left p-4 font-medium">Valor</th>
                <th className="text-left p-4 font-medium hidden md:table-cell">Observação</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {custos.map((c, i) => (
                <tr key={i} className="border-t border-carbon/10">
                  <td className="p-4 font-medium text-carbon">{c.item}</td>
                  <td className="p-4">
                    <span className={c.valor === "Grátis" || c.valor === "R$ 0" ? "text-emerald-700 font-semibold inline-flex items-center gap-1" : "text-carbon font-semibold"}>
                      {(c.valor === "Grátis" || c.valor === "R$ 0") && <Check className="w-4 h-4" />}
                      {c.valor}
                    </span>
                    <div className="md:hidden text-xs text-carbon/60 mt-1">{c.obs}</div>
                  </td>
                  <td className="p-4 text-carbon/70 hidden md:table-cell">{c.obs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-carbon/50 mt-6">
          Todos os custos específicos de cada oferta são divulgados no termo de captação antes da sua
          confirmação. Você sempre saberá exatamente o que está pagando.
        </p>
      </SectionBand>
    </InstitutionalPage>
  );
}
