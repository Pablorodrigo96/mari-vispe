import { motion } from "framer-motion";
import { SectionHeader } from "./shared/SectionHeader";
import { CommentaryBox } from "./shared/CommentaryBox";

interface Player {
  nome: string;
  subtitulo?: string;
  valor: number;
  unidade?: string;
  share_pct?: number;
  variacao_yoy_pct?: number;
  variacao_absoluta_label?: string;
  cor_bucket?: "top" | "positivo" | "negativo" | "neutro";
}

interface Props {
  data?: {
    metrica?: string;
    fonte?: string;
    players?: Player[];
    comentario?: string;
    punch_line?: string;
  };
}

function formatNum(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "N/D";
  return n.toLocaleString("pt-BR");
}

const BAR_COLORS = [
  "from-accent to-accent/70",
  "from-amber-400 to-amber-500/70",
  "from-rose-400 to-rose-500/70",
  "from-violet-400 to-violet-500/70",
];

function barColor(bucket?: string, idx?: number): string {
  if (bucket === "negativo") return BAR_COLORS[2];
  if (bucket === "top" || idx === 0) return BAR_COLORS[0];
  return BAR_COLORS[(idx ?? 0) % BAR_COLORS.length];
}

export function PainelRanking({ data }: Props) {
  if (!data?.players?.length) return null;
  const max = Math.max(...data.players.map((p) => Math.abs(p.valor || 0)));

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.4 }}
      className="mb-24"
    >
      <SectionHeader
        numero={1}
        eyebrow="Participação de mercado"
        titulo="Quem é grande?"
        descricao={data.metrica}
        fonte={data.fonte}
      />
      <div className="space-y-1.5">
        {data.players.map((p, i) => {
          const pct = max > 0 ? (Math.abs(p.valor) / max) * 100 : 0;
          const yoy = p.variacao_yoy_pct;
          const deltaLabel = p.variacao_absoluta_label;
          const yoyPositive = typeof yoy === "number" ? yoy >= 0 : true;
          return (
            <motion.div
              key={`${p.nome}-${i}`}
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.03 }}
              className="group grid grid-cols-[36px_minmax(0,1fr)_140px] items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3.5 transition-all hover:border-accent/40 hover:bg-card/80 sm:grid-cols-[44px_minmax(0,2fr)_minmax(0,3fr)_minmax(140px,180px)] sm:gap-4 sm:px-5"
            >
              <span
                className={`font-mono text-base font-bold tabular-nums ${
                  i === 0 ? "text-accent" : "text-muted-foreground"
                }`}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-foreground sm:text-[15px]">
                  {p.nome}
                </div>
                {p.subtitulo && (
                  <div className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {p.subtitulo}
                  </div>
                )}
              </div>
              <div className="relative hidden h-2 overflow-hidden rounded-full bg-muted/40 sm:block">
                <motion.span
                  initial={{ width: 0 }}
                  whileInView={{ width: `${pct}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: i * 0.04 }}
                  className={`absolute left-0 top-0 bottom-0 rounded-full bg-gradient-to-r ${barColor(p.cor_bucket, i)}`}
                />
              </div>
              <div className="text-right">
                <div className="font-mono text-sm font-bold tabular-nums text-foreground sm:text-[15px]">
                  {formatNum(p.valor)}
                  {p.unidade && (
                    <span className="ml-1 font-normal text-[10px] uppercase text-muted-foreground">
                      {p.unidade}
                    </span>
                  )}
                </div>
                {(deltaLabel || typeof yoy === "number" || typeof p.share_pct === "number") && (
                  <div className="mt-1 font-mono text-[10px] tabular-nums">
                    {deltaLabel ? (
                      <span className={yoyPositive ? "text-accent" : "text-rose-400"}>
                        {deltaLabel}
                      </span>
                    ) : typeof yoy === "number" ? (
                      <span className={yoy >= 0 ? "text-accent" : "text-rose-400"}>
                        {yoy >= 0 ? "+" : ""}
                        {yoy.toFixed(1)}% YoY
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        {p.share_pct?.toFixed(1)}% share
                      </span>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
      <CommentaryBox titulo={undefined} punchLine={data.punch_line}>
        {data.comentario}
      </CommentaryBox>
    </motion.section>
  );
}
