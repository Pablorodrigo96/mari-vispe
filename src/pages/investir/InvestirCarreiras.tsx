import { InstitutionalPage } from "@/components/investir/InstitutionalPage";
import { SectionBand } from "@/components/investir/SectionBand";
import { photos } from "@/lib/investirPhotos";
import { Briefcase, MapPin, ArrowRight } from "lucide-react";

const vagas = [
  { titulo: "Engenheiro(a) Full Stack Sênior", area: "Engenharia", local: "São Paulo / Remoto" },
  { titulo: "Analista de Risco e Compliance", area: "Compliance", local: "São Paulo" },
  { titulo: "Head de Marketing de Performance", area: "Growth", local: "São Paulo / Remoto" },
  { titulo: "Analista de Crédito Pleno", area: "Curadoria", local: "São Paulo" },
  { titulo: "Designer de Produto", area: "Design", local: "Remoto" },
  { titulo: "Customer Success — Investidores", area: "Atendimento", local: "São Paulo" },
];

const beneficios = [
  "Equity para todos os colaboradores",
  "Plano de saúde e odontológico premium",
  "Vale-refeição/alimentação flexível",
  "Auxílio home office e equipamentos",
  "Day off no aniversário",
  "Cultura de feedback contínuo",
];

export default function InvestirCarreiras() {
  return (
    <InstitutionalPage
      kicker="Trabalhe conosco"
      title="Construa o mercado de capitais do futuro."
      subtitle="Estamos contratando para todas as áreas. Se você acredita que capital privado deveria ser acessível a todos, queremos te conhecer."
      image={photos.tech}
      crumbs={[{ label: "Carreiras" }]}
    >
      <SectionBand tone="bone">
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-carbon">Vagas abertas</h2>
        <div className="mt-6 grid gap-3">
          {vagas.map((v) => (
            <div
              key={v.titulo}
              className="p-5 rounded-xl bg-white border border-carbon/10 hover:border-carbon/30 transition-colors flex flex-col md:flex-row md:items-center md:justify-between gap-3 cursor-pointer group"
            >
              <div>
                <div className="font-semibold text-carbon">{v.titulo}</div>
                <div className="text-sm text-carbon/60 mt-1 flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5" /> {v.area}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> {v.local}
                  </span>
                </div>
              </div>
              <button className="text-sm font-semibold text-carbon inline-flex items-center gap-1 group-hover:gap-2 transition-all self-start md:self-center">
                Candidatar-se <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-carbon/60">
          Não encontrou sua vaga? Envie seu currículo para <strong>talentos@mari.invest</strong>.
        </p>
      </SectionBand>

      <SectionBand tone="carbon">
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Benefícios</h2>
        <div className="mt-6 grid sm:grid-cols-2 md:grid-cols-3 gap-3">
          {beneficios.map((b) => (
            <div key={b} className="p-4 rounded-lg border border-bone/10 bg-graphite/40 text-bone/80 text-sm">
              {b}
            </div>
          ))}
        </div>
      </SectionBand>
    </InstitutionalPage>
  );
}
