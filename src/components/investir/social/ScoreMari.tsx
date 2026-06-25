import type { ScoreEixo } from "@/types/social";
import { Award } from "lucide-react";

function levelOf(avg: number) {
  if (avg >= 90) return { label: "Platina", color: "from-zinc-200 to-zinc-400" };
  if (avg >= 80) return { label: "Ouro", color: "from-amber-300 to-amber-500" };
  if (avg >= 65) return { label: "Prata", color: "from-zinc-300 to-zinc-500" };
  return { label: "Bronze", color: "from-amber-600 to-amber-800" };
}

export function ScoreMari({ eixos }: { eixos: ScoreEixo[] }) {
  const avg = Math.round(eixos.reduce((s, e) => s + e.valor, 0) / eixos.length);
  const lvl = levelOf(avg);

  return (
    <div className="bg-graphite/30 border border-bone/10 rounded-2xl p-5 md:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-volt mb-1">Score Mari</div>
          <div className="text-3xl font-semibold text-bone tabular-nums">{avg}<span className="text-bone/40 text-base">/100</span></div>
        </div>
        <div className={`flex items-center gap-2 px-3 py-2 rounded-full bg-gradient-to-r ${lvl.color}`}>
          <Award className="w-4 h-4 text-carbon" />
          <span className="text-carbon font-bold text-xs">{lvl.label}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-x-6 md:gap-y-2.5">
        {eixos.map((e) => (
          <div key={e.eixo} className="flex items-center gap-3">
            <span className="text-bone/70 text-xs w-32 shrink-0">{e.eixo}</span>
            <div className="flex-1 h-1.5 bg-bone/10 rounded-full overflow-hidden">
              <div className="h-full bg-volt" style={{ width: `${e.valor}%` }} />
            </div>
            <span className="text-bone/55 text-xs tabular-nums w-8 text-right">{e.valor}</span>
          </div>
        ))}
      </div>
      <p className="text-bone/40 text-[10px] mt-4 leading-relaxed">
        Indicador visual da Mari combinando governança, comunicação, transparência e tração.
        Não substitui análise individual.
      </p>
    </div>
  );
}
