import { InstitutionalPage } from "@/components/investir/InstitutionalPage";
import { SectionBand } from "@/components/investir/SectionBand";
import { photos } from "@/lib/investirPhotos";

const stats = [
  { v: "R$ 180M+", l: "captados para empresas" },
  { v: "12 mil+", l: "investidores ativos" },
  { v: "60+", l: "rodadas concluídas" },
  { v: "98%", l: "de pagamentos em dia" },
];

export default function InvestirAMari() {
  return (
    <InstitutionalPage
      kicker="A mari"
      title="Capital privado, agora acessível."
      subtitle="Nascemos do Grupo Vispe com uma convicção: o brasileiro merece investir nas empresas reais que movimentam o país — não só em ativos da bolsa."
      image={photos.heroFamilia}
      crumbs={[{ label: "Sobre", to: "/investir/sobre" }, { label: "A mari" }]}
    >
      <SectionBand tone="bone">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s) => (
            <div key={s.l} className="text-center md:text-left">
              <div className="text-3xl md:text-4xl font-semibold text-carbon">{s.v}</div>
              <div className="text-sm text-carbon/60 mt-1">{s.l}</div>
            </div>
          ))}
        </div>
      </SectionBand>

      <SectionBand tone="carbon">
        <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-start">
          <div>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Nossa história</h2>
            <p className="mt-4 text-bone/70 leading-relaxed">
              Fundada em 2024 dentro do Grupo Vispe, a mari nasceu para resolver um problema antigo:
              empresas brasileiras de qualidade não tinham acesso fácil a capital, e investidores não
              tinham acesso fácil a essas empresas. Construímos uma plataforma regulada pela CVM 88,
              em parceria com a Capitare, que conecta esses dois lados com tecnologia, transparência
              e curadoria.
            </p>
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Nosso propósito</h2>
            <p className="mt-4 text-bone/70 leading-relaxed">
              Democratizar o acesso ao capital privado brasileiro. Acreditamos que quando milhares de
              pessoas conseguem investir nas empresas certas, todo mundo ganha: o investidor diversifica
              fora da bolsa, a empresa cresce, e a economia real se fortalece.
            </p>
          </div>
        </div>
      </SectionBand>
    </InstitutionalPage>
  );
}
