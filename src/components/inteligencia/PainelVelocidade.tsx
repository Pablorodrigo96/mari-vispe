import { motion } from "framer-motion";
import { SectionHeader } from "./shared/SectionHeader";
import { CommentaryBox } from "./shared/CommentaryBox";

interface Player {
  nome: string;
  crescimento_pct?: number;
  organico_pct?: number;
  inorganico_pct?: number;
  tecnologia_pct?: number;
  fonte?: string;
}

interface Props {
  data?: { players?: Player[]; comentario?: string };
}

export function PainelVelocidade({ data }: Props) {
  if (!data?.players?.length) return null;
  const max = Math.max(...data.players.map((p) => Math.abs(p.crescimento_pct || 0)));

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.4 }}
      className="py-10"
    >
      <SectionHeader
        numero={3}
        titulo="Quem cresce — e como cresce?"
        descricao="Decomposição do crescimento entre orgânico, inorgânico (M&A) e tecnologia."
      />
      <div className="space-y-4">
        {data.players.map((p, i) => {
          const growth = p.crescimento_pct ?? 0;
          const pct = max > 0 ? (Math.abs(growth) / max) * 100 : 0;
          const positive = growth >= 0;
          return (
            <div
              key={i}
              className="rounded-lg border border-border/60 bg-card p-4"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-semibold text-foreground break-words">
                  {p.nome}
                </span>
                <span
                  className={`font-mono text-lg font-bold ${
                    positive ? "text-accent" : "text-rose-400"
                  }`}
                >
                  {positive ? "+" : ""}
                  {growth.toFixed(1)}%
                </span>
              </div>
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${pct}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: i * 0.05 }}
                  className={positive ? "h-full bg-accent" : "h-full bg-rose-400"}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-wider">
                {typeof p.organico_pct === "number" && (
                  <span className="rounded border border-accent/30 bg-accent/5 px-2 py-1 text-accent">
                    Orgânico {p.organico_pct}%
                  </span>
                )}
                {typeof p.inorganico_pct === "number" && (
                  <span className="rounded border border-amber-500/30 bg-amber-500/5 px-2 py-1 text-amber-400">
                    M&amp;A {p.inorganico_pct}%
                  </span>
                )}
                {typeof p.tecnologia_pct === "number" && (
                  <span className="rounded border border-border bg-muted/40 px-2 py-1 text-muted-foreground">
                    Tech {p.tecnologia_pct}%
                  </span>
                )}
              </div>
              {p.fonte && (
                <p className="mt-2 font-mono text-[10px] text-muted-foreground break-words">
                  {p.fonte}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <CommentaryBox>{data.comentario}</CommentaryBox>
    </motion.section>
  );
}
