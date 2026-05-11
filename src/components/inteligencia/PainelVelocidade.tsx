import { motion } from "framer-motion";
import { SectionHeader } from "./shared/SectionHeader";
import { CommentaryBox } from "./shared/CommentaryBox";

interface Player {
  nome: string;
  subtitulo?: string;
  crescimento_pct?: number;
  net_adds_ano_label?: string;
  net_adds_dia_label?: string;
  classificacao?: "organico" | "inorganico" | "tecnologia" | "hibrido";
  organico_pct?: number;
  inorganico_pct?: number;
  tecnologia_pct?: number;
  fonte?: string;
}

interface Props {
  data?: { players?: Player[]; comentario?: string; punch_line?: string };
}

const CLASS_LABELS: Record<string, { label: string; cls: string }> = {
  organico: { label: "Orgânico", cls: "border-accent/30 bg-accent/5 text-accent" },
  inorganico: { label: "M&A", cls: "border-amber-500/30 bg-amber-500/5 text-amber-400" },
  tecnologia: { label: "Tecnologia", cls: "border-violet-500/30 bg-violet-500/5 text-violet-300" },
  hibrido: { label: "Híbrido", cls: "border-border bg-muted/40 text-muted-foreground" },
};

export function PainelVelocidade({ data }: Props) {
  if (!data?.players?.length) return null;

  // Ordena por crescimento desc
  const players = [...data.players].sort(
    (a, b) => (b.crescimento_pct ?? 0) - (a.crescimento_pct ?? 0),
  );
  const max = Math.max(...players.map((p) => Math.abs(p.crescimento_pct ?? 0)), 1);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.4 }}
      className="mb-24"
    >
      <SectionHeader
        numero={3}
        eyebrow="Velocidade de aquisição"
        titulo="Quem cresce — e como?"
        descricao="Crescimento decomposto em orgânico, inorgânico (M&A) e tecnologia."
      />
      <div className="space-y-1.5">
        {players.map((p, i) => {
          const growth = p.crescimento_pct ?? 0;
          const pct = (Math.abs(growth) / max) * 100;
          const positive = growth >= 0;
          const cls = CLASS_LABELS[p.classificacao ?? "hibrido"];
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.03 }}
              className="grid grid-cols-[28px_minmax(0,1fr)_120px] items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3.5 sm:grid-cols-[36px_minmax(0,2fr)_minmax(0,3fr)_minmax(120px,150px)] sm:gap-4"
            >
              <span className="font-mono text-xs text-muted-foreground tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-foreground">
                    {p.nome}
                  </span>
                  {cls && (
                    <span
                      className={`shrink-0 rounded border px-1.5 py-px font-mono text-[9px] uppercase tracking-wider ${cls.cls}`}
                    >
                      {cls.label}
                    </span>
                  )}
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
                  className={`absolute left-0 top-0 bottom-0 rounded-full bg-gradient-to-r ${
                    positive ? "from-accent to-amber-400" : "from-rose-400 to-rose-500"
                  }`}
                />
              </div>
              <div className="text-right">
                <div className="font-mono text-sm font-bold tabular-nums text-foreground">
                  {p.net_adds_dia_label ?? (
                    <span className={positive ? "text-accent" : "text-rose-400"}>
                      {positive ? "+" : ""}
                      {growth.toFixed(1)}%
                    </span>
                  )}
                </div>
                {p.net_adds_ano_label && (
                  <div className="mt-0.5 font-mono text-[10px] text-accent">
                    {p.net_adds_ano_label}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
      <CommentaryBox punchLine={data.punch_line}>{data.comentario}</CommentaryBox>
    </motion.section>
  );
}
