import { motion } from "framer-motion";
import { SectionHeader } from "./shared/SectionHeader";
import { CommentaryBox } from "./shared/CommentaryBox";

interface MetricSide {
  num?: string;
  sub?: string;
}

interface MetricaNew {
  label: string;
  valor_a: MetricSide | string;
  valor_b: MetricSide | string;
}

interface Props {
  data?: {
    player_a?: { nome: string; tese: string };
    player_b?: { nome: string; tese: string };
    metricas?: MetricaNew[];
    // retrocompat com schema v1
    metricas_comparativas?: { label: string; valor_a: string; valor_b: string }[];
    comentario?: string;
    punch_line?: string;
  };
}

function normalize(v: MetricSide | string | undefined): MetricSide {
  if (!v) return {};
  if (typeof v === "string") return { num: v };
  return v;
}

export function PainelHeadToHead({ data }: Props) {
  if (!data?.player_a || !data?.player_b) return null;
  const metricas: MetricaNew[] =
    data.metricas ??
    (data.metricas_comparativas?.map((m) => ({
      label: m.label,
      valor_a: { num: m.valor_a },
      valor_b: { num: m.valor_b },
    })) ??
      []);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.4 }}
      className="mb-24"
    >
      <SectionHeader
        numero={4}
        eyebrow="Comparativo estratégico"
        titulo={`${data.player_a.nome} vs. ${data.player_b.nome}`}
        descricao="Dois modelos. Teses opostas. Ambos vencem à sua maneira."
      />

      <div className="grid gap-0 rounded-2xl border border-border/60 bg-card overflow-hidden lg:grid-cols-[1fr_180px_1fr]">
        {/* Player A */}
        <div className="border-b border-border/60 p-7 lg:border-b-0 lg:border-r lg:text-right">
          <p className="font-mono text-[10px] uppercase tracking-wider text-rose-400">Player A</p>
          <h3 className="mt-2 text-3xl font-extrabold tracking-tight text-rose-400 break-words lg:text-4xl">
            {data.player_a.nome.toLowerCase()}
          </h3>
          <p className="mt-2 text-xs text-muted-foreground break-words">{data.player_a.tese}</p>

          <div className="mt-7 space-y-5">
            {metricas.map((m, i) => {
              const a = normalize(m.valor_a);
              return (
                <div key={i}>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {m.label}
                  </div>
                  <div className="mt-1 text-2xl font-bold tracking-tight text-foreground break-words sm:text-[28px]">
                    {a.num ?? "—"}
                  </div>
                  {a.sub && (
                    <div className="mt-1 font-mono text-[11px] text-muted-foreground break-words">
                      {a.sub}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="flex flex-row items-center justify-center gap-4 border-b border-border/60 bg-muted/20 p-5 lg:flex-col lg:border-b-0 lg:gap-12 lg:p-0">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-border bg-card font-bold text-muted-foreground lg:h-20 lg:w-20 lg:text-xl">
            VS
          </div>
          <div className="hidden lg:flex flex-col items-center gap-7 text-center">
            {metricas.slice(0, 4).map((m, i) => (
              <div
                key={i}
                className="max-w-[140px] font-mono text-[10px] font-semibold uppercase leading-tight tracking-wider text-muted-foreground break-words"
              >
                {m.label}
              </div>
            ))}
          </div>
        </div>

        {/* Player B */}
        <div className="p-7">
          <p className="font-mono text-[10px] uppercase tracking-wider text-violet-400">Player B</p>
          <h3 className="mt-2 text-3xl font-extrabold tracking-tight text-violet-400 break-words lg:text-4xl">
            {data.player_b.nome.toLowerCase()}
          </h3>
          <p className="mt-2 text-xs text-muted-foreground break-words">{data.player_b.tese}</p>

          <div className="mt-7 space-y-5">
            {metricas.map((m, i) => {
              const b = normalize(m.valor_b);
              return (
                <div key={i}>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {m.label}
                  </div>
                  <div className="mt-1 text-2xl font-bold tracking-tight text-foreground break-words sm:text-[28px]">
                    {b.num ?? "—"}
                  </div>
                  {b.sub && (
                    <div className="mt-1 font-mono text-[11px] text-muted-foreground break-words">
                      {b.sub}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <CommentaryBox punchLine={data.punch_line}>{data.comentario}</CommentaryBox>
    </motion.section>
  );
}
