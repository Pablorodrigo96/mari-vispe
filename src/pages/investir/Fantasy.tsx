import { InvestirShell } from "@/components/investir/InvestirShell";
import { seedCompanies } from "@/data/socialSeed";
import { useState } from "react";
import { Trophy, Plus, Minus } from "lucide-react";

export default function Fantasy() {
  const [portfolio, setPortfolio] = useState<Record<string, number>>({});
  const total = Object.values(portfolio).reduce((s, v) => s + v, 0);

  return (
    <InvestirShell hideFooter>
      <div className="max-w-[1100px] mx-auto px-5 md:px-6 py-8 md:py-12">
        <div className="flex items-center gap-3 mb-2">
          <Trophy className="w-6 h-6 text-volt" />
          <h1 className="text-2xl md:text-4xl font-semibold text-bone">Fantasy Business</h1>
        </div>
        <p className="text-bone/55 text-sm mb-8 max-w-xl">
          Monte um portfólio fictício. Empresas pontuam por <strong>receita, clientes, margem, governança, expansão</strong> —
          jamais por rentabilidade diária. O jogo recompensa quem aposta em quem cresce de verdade.
        </p>

        <div className="rounded-2xl bg-gradient-to-r from-volt/15 to-transparent border border-volt/25 p-5 mb-6">
          <div className="text-[10px] uppercase tracking-wider text-volt mb-1">Pontuação atual</div>
          <div className="text-3xl font-semibold text-bone tabular-nums">{total} pts</div>
          <div className="text-bone/55 text-xs mt-1">Atualizada toda semana com os indicadores reais das empresas.</div>
        </div>

        <ul className="grid sm:grid-cols-2 gap-3">
          {seedCompanies.map((c) => {
            const pts = portfolio[c.id] || 0;
            return (
              <li key={c.id} className="rounded-2xl border border-bone/10 bg-graphite/30 p-4 flex items-center gap-3">
                <img src={c.avatar} alt={c.name} className="w-12 h-12 rounded-xl object-cover" />
                <div className="flex-1 min-w-0">
                  <div className="text-bone font-medium text-sm truncate">{c.name}</div>
                  <div className="text-bone/45 text-[11px]">{c.sector}</div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPortfolio((p) => ({ ...p, [c.id]: Math.max(0, (p[c.id] || 0) - 10) }))}
                    className="p-1.5 rounded-lg bg-bone/10 text-bone/70 hover:text-volt"
                  ><Minus className="w-3.5 h-3.5" /></button>
                  <span className="text-bone font-semibold text-sm tabular-nums w-10 text-center">{pts}</span>
                  <button
                    onClick={() => setPortfolio((p) => ({ ...p, [c.id]: (p[c.id] || 0) + 10 }))}
                    className="p-1.5 rounded-lg bg-volt text-carbon hover:bg-volt/90"
                  ><Plus className="w-3.5 h-3.5" /></button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </InvestirShell>
  );
}
