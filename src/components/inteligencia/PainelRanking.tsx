import { motion } from "framer-motion";
import { SectionHeader } from "./shared/SectionHeader";
import { CommentaryBox } from "./shared/CommentaryBox";

interface Player {
  nome: string;
  valor: number;
  unidade?: string;
  share_pct?: number;
  variacao_yoy_pct?: number;
}

interface Props {
  data?: {
    metrica?: string;
    fonte?: string;
    players?: Player[];
    comentario?: string;
  };
}

function formatNum(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "N/D";
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return n.toLocaleString("pt-BR");
}

export function PainelRanking({ data }: Props) {
  if (!data?.players?.length) return null;
  const max = Math.max(...data.players.map((p) => p.valor || 0));

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.4 }}
      className="py-10"
    >
      <SectionHeader
        numero={1}
        titulo="Quem é grande?"
        descricao={data.metrica}
        fonte={data.fonte}
      />
      <div className="space-y-3">
        {data.players.map((p, i) => {
          const pct = max > 0 ? (p.valor / max) * 100 : 0;
          const isLeader = i === 0;
          const yoy = p.variacao_yoy_pct;
          return (
            <div
              key={`${p.nome}-${i}`}
              className="group rounded-lg border border-border/60 bg-card p-4 transition-colors hover:border-accent/40"
            >
              <div className="flex items-baseline justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-xs text-muted-foreground">
                    #{i + 1}
                  </span>
                  <span className="font-semibold text-foreground break-words">
                    {p.nome}
                  </span>
                </div>
                <div className="flex items-baseline gap-2 shrink-0 text-right">
                  <span className="font-mono text-lg font-semibold text-foreground">
                    {formatNum(p.valor)}
                  </span>
                  {p.unidade && (
                    <span className="font-mono text-[10px] uppercase text-muted-foreground">
                      {p.unidade}
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${pct}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: i * 0.06 }}
                  className={isLeader ? "h-full bg-accent" : "h-full bg-accent/40"}
                />
              </div>
              <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-muted-foreground">
                {typeof p.share_pct === "number" && (
                  <span>{p.share_pct.toFixed(1)}% share</span>
                )}
                {typeof yoy === "number" && (
                  <span
                    className={
                      yoy >= 0 ? "text-accent" : "text-rose-400"
                    }
                  >
                    {yoy >= 0 ? "+" : ""}
                    {yoy.toFixed(1)}% YoY
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <CommentaryBox>{data.comentario}</CommentaryBox>
    </motion.section>
  );
}
