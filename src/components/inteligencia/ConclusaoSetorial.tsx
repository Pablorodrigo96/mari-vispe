import { motion } from "framer-motion";
import { Trophy, Layers, Target } from "lucide-react";

interface Props {
  data?: {
    vencedores?: string;
    consolidadores?: string;
    alvos?: string;
    punch_line?: string;
  };
}

export function ConclusaoSetorial({ data }: Props) {
  if (!data) return null;
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.4 }}
      className="my-10 rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 via-card to-card p-6 sm:p-8"
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">Conclusão setorial</p>
      <div className="mt-5 grid gap-5 sm:grid-cols-3">
        {data.vencedores && (
          <div>
            <Trophy className="h-4 w-4 text-accent" />
            <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Vencedores</p>
            <p className="mt-1 text-sm text-foreground break-words">{data.vencedores}</p>
          </div>
        )}
        {data.consolidadores && (
          <div>
            <Layers className="h-4 w-4 text-accent" />
            <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Consolidadores</p>
            <p className="mt-1 text-sm text-foreground break-words">{data.consolidadores}</p>
          </div>
        )}
        {data.alvos && (
          <div>
            <Target className="h-4 w-4 text-accent" />
            <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Alvos</p>
            <p className="mt-1 text-sm text-foreground break-words">{data.alvos}</p>
          </div>
        )}
      </div>
      {data.punch_line && (
        <p className="mt-6 border-t border-border/60 pt-5 text-base italic text-foreground break-words">
          “{data.punch_line}”
        </p>
      )}
    </motion.section>
  );
}
