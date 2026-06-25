import { InvestirShell } from "@/components/investir/InvestirShell";
import { seedCompanies } from "@/data/socialSeed";
import { Radio, Calendar } from "lucide-react";

const lives = [
  { company: seedCompanies[4], when: "Amanhã · 19h", topic: "Expansão para 4 cidades — perguntas abertas" },
  { company: seedCompanies[2], when: "Quinta · 20h", topic: "Resultados Q1 e roadmap 2026" },
  { company: seedCompanies[0], when: "Sexta · 18h30", topic: "Bastidores: como abrimos a 2ª padaria" },
];

export default function Lives() {
  return (
    <InvestirShell hideFooter>
      <div className="max-w-[900px] mx-auto px-5 md:px-6 py-8 md:py-12">
        <div className="flex items-center gap-3 mb-2">
          <Radio className="w-6 h-6 text-volt" />
          <h1 className="text-2xl md:text-4xl font-semibold text-bone">Lives da semana</h1>
        </div>
        <p className="text-bone/55 text-sm mb-8">Fundadores ao vivo respondendo perguntas reais da comunidade.</p>

        <ul className="space-y-3">
          {lives.map((l, i) => (
            <li key={i} className="flex gap-4 p-4 md:p-5 rounded-2xl border border-bone/10 bg-graphite/30">
              <img src={l.company.avatar} alt={l.company.name} className="w-14 h-14 rounded-xl object-cover" />
              <div className="flex-1 min-w-0">
                <div className="text-volt text-[11px] uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-3 h-3" />{l.when}
                </div>
                <div className="text-bone font-medium text-sm md:text-base">{l.company.name}</div>
                <div className="text-bone/65 text-xs mt-0.5">{l.topic}</div>
              </div>
              <button className="self-center text-xs bg-volt/15 text-volt font-semibold px-3 py-1.5 rounded-full hover:bg-volt/25">
                Lembrar
              </button>
            </li>
          ))}
        </ul>
      </div>
    </InvestirShell>
  );
}
