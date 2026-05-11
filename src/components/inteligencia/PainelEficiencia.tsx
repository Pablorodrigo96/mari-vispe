import { motion } from "framer-motion";
import { SectionHeader } from "./shared/SectionHeader";
import { CommentaryBox } from "./shared/CommentaryBox";

interface Card {
  label: string;
  valor: string;
  denominador?: string;
  player?: string;
  fonte?: string;
  tom?: "positivo" | "alerta" | "neutro";
  cor?: number;
}

interface Props {
  data?: {
    metrica_principal?: string;
    cards?: Card[];
    comentario?: string;
    punch_line?: string;
  };
}

const VALUE_COLORS = [
  "text-accent",
  "text-amber-400",
  "text-rose-400",
  "text-violet-400",
];
const GLOW_COLORS = [
  "bg-accent",
  "bg-amber-400",
  "bg-rose-400",
  "bg-violet-400",
];

export function PainelEficiencia({ data }: Props) {
  if (!data?.cards?.length) return null;
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.4 }}
      className="mb-24"
    >
      <SectionHeader
        numero={2}
        eyebrow="Eficiência operacional"
        titulo="Quem opera bem?"
        descricao={data.metrica_principal ?? "Indicadores que separam operação enxuta de operação inflada."}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.cards.map((c, i) => {
          const idx = ((c.cor ?? i + 1) - 1) % 4;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.06 }}
              className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6"
            >
              <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground break-words">
                {c.label}
              </div>
              <div
                className={`mt-3 text-4xl font-extrabold leading-none tracking-tight sm:text-[42px] ${VALUE_COLORS[idx]} break-words`}
              >
                {c.valor}
              </div>
              {c.denominador && (
                <div className="mt-2 font-mono text-[11px] text-muted-foreground break-words">
                  {c.denominador}
                </div>
              )}
              {c.fonte && (
                <div className="mt-2 font-mono text-[10px] text-muted-foreground/70 break-words">
                  {c.fonte}
                </div>
              )}
              <span
                className={`pointer-events-none absolute -right-8 -bottom-8 h-32 w-32 rounded-full opacity-[0.06] ${GLOW_COLORS[idx]}`}
              />
            </motion.div>
          );
        })}
      </div>
      <CommentaryBox punchLine={data.punch_line}>{data.comentario}</CommentaryBox>
    </motion.section>
  );
}
