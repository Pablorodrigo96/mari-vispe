import { InstitutionalPage } from "@/components/investir/InstitutionalPage";
import { SectionBand } from "@/components/investir/SectionBand";
import { photos } from "@/lib/investirPhotos";
import { Clock, ArrowRight } from "lucide-react";

const posts = [
  { t: "Como avaliar uma empresa privada antes de investir", c: "Educação", min: 6, img: photos.heroEmpreendedora },
  { t: "Equity vs dívida: qual escolher para começar?", c: "Educação", min: 4, img: photos.tech },
  { t: "Resolução CVM 88 explicada em 5 minutos", c: "Regulação", min: 5, img: photos.heroFamilia },
  { t: "Diversificação: por que empresas privadas mudam o jogo", c: "Estratégia", min: 7, img: photos.heroJovemCelular },
  { t: "5 perguntas para fazer antes de aportar em uma oferta", c: "Checklist", min: 3, img: photos.padaria },
  { t: "Cases: empresas que entregaram retorno em 2025", c: "Cases", min: 8, img: photos.varejo },
];

export default function InvestirBlog() {
  return (
    <InstitutionalPage
      kicker="Blog"
      title="Educação, análises e bastidores do mercado privado."
      subtitle="Conteúdo produzido pelo time de curadoria da mari para você investir melhor."
      crumbs={[{ label: "Blog" }]}
    >
      <SectionBand tone="bone">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {posts.map((p) => (
            <article
              key={p.t}
              className="group rounded-2xl overflow-hidden bg-white border border-carbon/10 hover:border-carbon/30 transition-colors cursor-pointer"
            >
              <div className="aspect-[16/10] overflow-hidden">
                <img
                  src={p.img}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              </div>
              <div className="p-5">
                <div className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: "#8a9a1e" }}>
                  {p.c}
                </div>
                <h3 className="mt-2 font-semibold text-carbon leading-snug">{p.t}</h3>
                <div className="mt-4 flex items-center justify-between text-xs text-carbon/60">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {p.min} min de leitura
                  </span>
                  <ArrowRight className="w-4 h-4 text-carbon group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </article>
          ))}
        </div>
      </SectionBand>
    </InstitutionalPage>
  );
}
