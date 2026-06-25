import { useState } from "react";
import type { DiarioEntry } from "@/types/social";

const CATS: DiarioEntry["category"][] = [
  "Resultados", "Expansão", "Governança", "Clientes", "Equipe", "Financeiro", "Conquistas", "Desafios",
];

export function DiarioFeed({ entries }: { entries: DiarioEntry[] }) {
  const [active, setActive] = useState<DiarioEntry["category"] | "Todas">("Todas");
  const filtered = active === "Todas" ? entries : entries.filter((e) => e.category === active);

  return (
    <section className="bg-graphite/30 border border-bone/10 rounded-2xl p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-bone font-semibold text-base md:text-lg">Diário da empresa</h3>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 pb-3 md:pb-4">
        {(["Todas", ...CATS] as const).map((c) => (
          <button
            key={c}
            onClick={() => setActive(c)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors ${
              active === c ? "bg-volt text-carbon" : "bg-bone/10 text-bone/70 hover:bg-bone/15"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <ul className="space-y-3">
        {filtered.map((e) => (
          <li key={e.id} className="flex gap-3 p-3 md:p-4 rounded-xl bg-carbon/30 border border-bone/5">
            {e.media && (
              <img src={e.media} alt={e.title} className="w-16 h-16 md:w-20 md:h-20 rounded-lg object-cover shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider mb-1">
                <span className="text-volt">{e.category}</span>
                <span className="text-bone/40">· {e.date}</span>
              </div>
              <div className="text-bone font-medium text-sm break-words">{e.title}</div>
              <p className="text-bone/65 text-xs leading-relaxed mt-1 break-words">{e.body}</p>
            </div>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="text-bone/45 text-sm text-center py-6">Nenhuma atualização nesta categoria ainda.</li>
        )}
      </ul>
    </section>
  );
}
