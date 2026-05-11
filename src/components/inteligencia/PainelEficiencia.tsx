import { motion } from "framer-motion";
import { SectionHeader } from "./shared/SectionHeader";
import { CommentaryBox } from "./shared/CommentaryBox";

interface Card {
  label: string;
  valor: string;
  player?: string;
  fonte?: string;
  tom?: "positivo" | "alerta" | "neutro";
}

interface Props {
  data?: { cards?: Card[]; comentario?: string };
}

function tomColor(tom?: string) {
  if (tom === "positivo") return "text-accent border-accent/40 bg-accent/5";
  if (tom === "alerta") return "text-amber-400 border-amber-500/30 bg-amber-500/5";
  return "text-foreground border-border/60 bg-card";
}

export function PainelEficiencia({ data }: Props) {
  if (!data?.cards?.length) return null;
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.4 }}
      className="py-10"
    >
      <SectionHeader numero={2} titulo="Quem opera bem?" descricao="Indicadores de eficiência operacional comparados entre os principais players." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.cards.map((c, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            className={`rounded-xl border p-5 ${tomColor(c.tom)}`}
          >
            <p className="font-mono text-[10px] uppercase tracking-wider opacity-70 break-words">
              {c.label}
            </p>
            <p className="mt-3 text-2xl font-bold tracking-tight break-words">
              {c.valor}
            </p>
            {c.player && (
              <p className="mt-1 text-xs font-medium text-foreground/80 break-words">
                {c.player}
              </p>
            )}
            {c.fonte && (
              <p className="mt-2 font-mono text-[10px] text-muted-foreground break-words">
                {c.fonte}
              </p>
            )}
          </motion.div>
        ))}
      </div>
      <CommentaryBox>{data.comentario}</CommentaryBox>
    </motion.section>
  );
}
