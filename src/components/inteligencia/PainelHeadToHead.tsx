import { motion } from "framer-motion";
import { SectionHeader } from "./shared/SectionHeader";
import { CommentaryBox } from "./shared/CommentaryBox";

interface Props {
  data?: {
    player_a?: { nome: string; tese: string };
    player_b?: { nome: string; tese: string };
    metricas_comparativas?: { label: string; valor_a: string; valor_b: string }[];
    comentario?: string;
  };
}

export function PainelHeadToHead({ data }: Props) {
  if (!data?.player_a || !data?.player_b) return null;
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.4 }}
      className="py-10"
    >
      <SectionHeader
        numero={4}
        titulo="Não existe fórmula única"
        descricao="Dois players, teses opostas. Ambos vencem à sua maneira."
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-5">
          <p className="font-mono text-[10px] uppercase tracking-wider text-accent">Player A</p>
          <h3 className="mt-2 text-lg font-bold text-foreground break-words">{data.player_a.nome}</h3>
          <p className="mt-2 text-sm text-muted-foreground break-words">{data.player_a.tese}</p>
        </div>
        <div className="hidden lg:flex items-center justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card font-mono text-xs font-bold text-muted-foreground">
            VS
          </div>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
          <p className="font-mono text-[10px] uppercase tracking-wider text-amber-400">Player B</p>
          <h3 className="mt-2 text-lg font-bold text-foreground break-words">{data.player_b.nome}</h3>
          <p className="mt-2 text-sm text-muted-foreground break-words">{data.player_b.tese}</p>
        </div>
      </div>
      {data.metricas_comparativas?.length ? (
        <div className="mt-5 overflow-hidden rounded-xl border border-border/60">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Métrica</th>
                <th className="px-4 py-2 text-right text-accent">{data.player_a.nome}</th>
                <th className="px-4 py-2 text-right text-amber-400">{data.player_b.nome}</th>
              </tr>
            </thead>
            <tbody>
              {data.metricas_comparativas.map((m, i) => (
                <tr key={i} className="border-t border-border/60">
                  <td className="px-4 py-3 text-muted-foreground break-words">{m.label}</td>
                  <td className="px-4 py-3 text-right font-mono text-foreground break-words">{m.valor_a}</td>
                  <td className="px-4 py-3 text-right font-mono text-foreground break-words">{m.valor_b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <CommentaryBox>{data.comentario}</CommentaryBox>
    </motion.section>
  );
}
