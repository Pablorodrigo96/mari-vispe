import { InstitutionalPage } from "@/components/investir/InstitutionalPage";
import { SectionBand } from "@/components/investir/SectionBand";
import { photos } from "@/lib/investirPhotos";

const time = [
  { nome: "Mariana Vispe", cargo: "CEO & Cofundadora", bio: "15 anos em M&A e capital de risco. Ex-BTG.", foto: photos.depoimento2 },
  { nome: "Rafael Costa", cargo: "CTO & Cofundador", bio: "Engenheiro com passagem por fintechs reguladas.", foto: photos.personaDiversifica },
  { nome: "Juliana Almeida", cargo: "Head de Compliance", bio: "Especialista em CVM e LGPD, ex-CVM.", foto: photos.depoimento1 },
  { nome: "Pedro Henrique", cargo: "Head de Curadoria", bio: "Analista fundamentalista, CFA.", foto: photos.personaApoiador },
];

const conselho = [
  { nome: "Carlos Vispe", cargo: "Presidente do Conselho — Grupo Vispe" },
  { nome: "Ana Paula Mendes", cargo: "Conselheira independente — ex-CVM" },
  { nome: "Ricardo Tavares", cargo: "Conselheiro — gestor de fundos" },
];

export default function InvestirQuemSomos() {
  return (
    <InstitutionalPage
      kicker="Quem somos"
      title="Um time obcecado por acesso e transparência."
      subtitle="Engenheiros, analistas e especialistas em compliance trabalhando para tornar o investimento privado tão simples quanto comprar uma ação."
      image={photos.tech}
      crumbs={[{ label: "Sobre", to: "/investir/sobre" }, { label: "Quem somos" }]}
    >
      <SectionBand tone="bone">
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-carbon">Time executivo</h2>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {time.map((p) => (
            <div key={p.nome} className="bg-white rounded-2xl overflow-hidden border border-carbon/10">
              <div className="aspect-[4/5] overflow-hidden">
                <img src={p.foto} alt={p.nome} className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="p-4">
                <div className="font-semibold text-carbon">{p.nome}</div>
                <div className="text-xs text-volt-dark font-medium mt-0.5" style={{ color: "#8a9a1e" }}>{p.cargo}</div>
                <p className="text-sm text-carbon/60 mt-2 leading-relaxed">{p.bio}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionBand>

      <SectionBand tone="carbon">
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Conselho consultivo</h2>
        <div className="mt-6 grid md:grid-cols-3 gap-4">
          {conselho.map((c) => (
            <div key={c.nome} className="p-5 rounded-xl border border-bone/10 bg-graphite/40">
              <div className="font-semibold text-bone">{c.nome}</div>
              <div className="text-sm text-bone/60 mt-1">{c.cargo}</div>
            </div>
          ))}
        </div>
      </SectionBand>
    </InstitutionalPage>
  );
}
