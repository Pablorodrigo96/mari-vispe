import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, ExternalLink } from "lucide-react";
import { SectionBand } from "@/components/investir/SectionBand";
import cvmLogo from "@/assets/cvm-logo.png.asset.json";
import capitareLogo from "@/assets/capitare-logo.svg.asset.json";

export function PartnersStrip() {
  return (
    <SectionBand tone="bone">
      <div className="text-center mb-8 md:mb-12">
        <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-wider text-carbon/60 bg-carbon/5 px-3 py-1 rounded-full mb-4">
          <ShieldCheck className="w-3 h-3" /> Regulamentação & Parceiros
        </div>
        <h2 className="text-2xl md:text-4xl font-semibold tracking-tight text-carbon">
          Regulado pela CVM. Operado com a <span className="text-volt">Capitare</span>.
        </h2>
        <p className="mt-3 text-carbon/60 max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
          A mari.invest opera ofertas públicas sob a <strong>Resolução CVM 88</strong> (crowdfunding de investimento),
          em parceria com a <strong>Capitare</strong>, plataforma especializada em infraestrutura regulada.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 md:gap-6 max-w-4xl mx-auto">
        {/* CVM */}
        <a
          href="https://www.gov.br/cvm/"
          target="_blank"
          rel="noopener noreferrer"
          className="group bg-white border border-carbon/10 hover:border-volt rounded-2xl p-6 md:p-8 flex flex-col items-center text-center transition-all"
        >
          <div className="h-20 md:h-24 flex items-center justify-center mb-4">
            <img src={cvmLogo.url} alt="CVM - Comissão de Valores Mobiliários" className="max-h-full max-w-[200px] object-contain" />
          </div>
          <div className="text-[10px] uppercase tracking-wider text-carbon/50 mb-1">Regulador</div>
          <div className="font-semibold text-carbon mb-1">Comissão de Valores Mobiliários</div>
          <div className="text-xs text-carbon/60 mb-3">Resolução CVM 88 · Crowdfunding de Investimento</div>
          <span className="text-xs text-carbon/50 inline-flex items-center gap-1 group-hover:text-volt transition-colors">
            gov.br/cvm <ExternalLink className="w-3 h-3" />
          </span>
        </a>

        {/* Capitare */}
        <a
          href="https://capitare.io/cvm88"
          target="_blank"
          rel="noopener noreferrer"
          className="group bg-carbon border border-bone/10 hover:border-volt rounded-2xl p-6 md:p-8 flex flex-col items-center text-center transition-all"
        >
          <div className="h-20 md:h-24 flex items-center justify-center mb-4">
            <img src={capitareLogo.url} alt="Capitare" className="max-h-full max-w-[220px] object-contain" />
          </div>
          <div className="text-[10px] uppercase tracking-wider text-bone/50 mb-1">Parceira de infraestrutura</div>
          <div className="font-semibold text-bone mb-1">Capitare</div>
          <div className="text-xs text-bone/60 mb-3">Plataforma white label regulada · CVM88</div>
          <span className="text-xs text-bone/50 inline-flex items-center gap-1 group-hover:text-volt transition-colors">
            capitare.io/cvm88 <ExternalLink className="w-3 h-3" />
          </span>
        </a>
      </div>

      <div className="mt-8 md:mt-10 text-center">
        <Link
          to="/investir/regulamentacao"
          className="inline-flex items-center gap-2 bg-carbon hover:bg-carbon/90 text-bone font-semibold px-6 py-3.5 rounded-full text-sm md:text-base transition-colors"
        >
          Entenda nossa regulamentação <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </SectionBand>
  );
}
