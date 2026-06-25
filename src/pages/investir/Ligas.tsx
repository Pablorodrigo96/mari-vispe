import { InvestirShell } from "@/components/investir/InvestirShell";
import { Trophy } from "lucide-react";

const LIGAS = [
  { id: "agro", nome: "Liga Agro", emoji: "🌾", membros: 1240, top: "@joao_agronomo" },
  { id: "saude", nome: "Liga Saúde", emoji: "🩺", membros: 982, top: "@dra_camila" },
  { id: "franquias", nome: "Liga Franquias", emoji: "🛍️", membros: 1530, top: "@rafael_inv" },
  { id: "industria", nome: "Liga Indústria", emoji: "🏭", membros: 760, top: "@ana_pme" },
  { id: "alimentacao", nome: "Liga Alimentação", emoji: "🍽️", membros: 2104, top: "@chef_lu" },
  { id: "tech", nome: "Liga Tecnologia", emoji: "💻", membros: 3210, top: "@dev_mariana" },
  { id: "construcao", nome: "Liga Construção", emoji: "🏗️", membros: 540, top: "@eng_paulo" },
  { id: "academias", nome: "Liga Academias", emoji: "🏋️", membros: 612, top: "@bia_fit" },
];

export default function Ligas() {
  return (
    <InvestirShell hideFooter>
      <div className="max-w-[1100px] mx-auto px-5 md:px-6 py-8 md:py-12">
        <div className="flex items-center gap-3 mb-2">
          <Trophy className="w-6 h-6 text-volt" />
          <h1 className="text-2xl md:text-4xl font-semibold text-bone">Ligas Mari</h1>
        </div>
        <p className="text-bone/55 text-sm mb-8 max-w-xl">
          Ranking pelo <strong>conhecimento</strong> sobre cada setor — não pela rentabilidade.
          Quem mais aprende, mais comenta e mais participa sobe na liga.
        </p>

        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {LIGAS.map((l) => (
            <li key={l.id} className="rounded-2xl border border-bone/10 bg-graphite/30 p-5 hover:border-volt/40 transition-colors">
              <div className="text-3xl mb-2">{l.emoji}</div>
              <div className="text-bone font-semibold">{l.nome}</div>
              <div className="text-bone/45 text-xs mt-0.5">{l.membros.toLocaleString("pt-BR")} membros</div>
              <div className="mt-3 pt-3 border-t border-bone/10 text-[11px] text-bone/65">
                Líder atual: <span className="text-volt">{l.top}</span>
              </div>
              <button className="mt-3 w-full text-xs bg-volt/15 text-volt font-semibold py-2 rounded-lg hover:bg-volt/25 transition-colors">
                Entrar na liga
              </button>
            </li>
          ))}
        </ul>
      </div>
    </InvestirShell>
  );
}
