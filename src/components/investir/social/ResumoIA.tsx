import { Sparkles } from "lucide-react";

export function ResumoIA({
  summary,
  bullets,
}: {
  summary: string;
  bullets?: { label: string; body: string }[];
}) {
  return (
    <div className="bg-gradient-to-br from-volt/10 to-transparent border border-volt/25 rounded-2xl p-5 md:p-6">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-volt" />
        <span className="text-[10px] uppercase tracking-wider font-semibold text-volt">Resumo Mari · 30 segundos</span>
      </div>
      <p className="text-bone/85 text-sm md:text-base leading-relaxed">{summary}</p>
      {bullets && bullets.length > 0 && (
        <ul className="mt-4 grid sm:grid-cols-3 gap-2.5">
          {bullets.map((b) => (
            <li key={b.label} className="bg-carbon/40 border border-bone/10 rounded-xl p-3">
              <div className="text-[10px] uppercase tracking-wider text-volt mb-1">{b.label}</div>
              <div className="text-bone/80 text-xs leading-snug">{b.body}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
