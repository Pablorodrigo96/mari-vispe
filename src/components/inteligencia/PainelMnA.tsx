import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { SectionHeader } from "./shared/SectionHeader";
import { CommentaryBox } from "./shared/CommentaryBox";

interface Deal {
  comprador: string;
  alvo: string;
  valor_brl_milhoes?: number;
  multiplo?: string;
  data?: string;
  destaque?: boolean;
  contexto?: string;
  status?: "concluido" | "anunciado" | "pendente_cade";
  fonte?: string;
}

interface Props {
  data?: {
    deals?: Deal[];
    consolidadores_ativos?: string[];
    perfil_alvos?: string;
    comentario?: string;
    punch_line?: string;
  };
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  concluido: { label: "Concluído", cls: "text-accent border-accent/30 bg-accent/5" },
  anunciado: { label: "Anunciado", cls: "text-amber-400 border-amber-500/30 bg-amber-500/5" },
  pendente_cade: { label: "Pendente CADE", cls: "text-violet-300 border-violet-500/30 bg-violet-500/5" },
};

function formatValor(v?: number) {
  if (!v || v <= 0) return null;
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(2)} bi`;
  return `R$ ${v.toLocaleString("pt-BR")} mi`;
}

export function PainelMnA({ data }: Props) {
  if (!data?.deals?.length) return null;
  const max = Math.max(...data.deals.map((d) => Math.abs(d.valor_brl_milhoes ?? 0)), 1);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.4 }}
      className="mb-24"
    >
      <SectionHeader
        numero={5}
        eyebrow="M&A e consolidação"
        titulo="Como o mercado se consolida"
        descricao="Transações relevantes, consolidadores ativos e perfil dos alvos."
      />

      <div className="space-y-1.5">
        {data.deals.map((d, i) => {
          const valor = formatValor(d.valor_brl_milhoes);
          const pct = d.valor_brl_milhoes ? (Math.abs(d.valor_brl_milhoes) / max) * 100 : 0;
          const status = STATUS_LABELS[d.status ?? ""];
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.03 }}
              className="rounded-xl border border-border/60 bg-card px-4 py-3.5 sm:px-5"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div className="flex items-baseline gap-2 min-w-0 flex-1">
                  {d.destaque ? (
                    <Star className="h-3.5 w-3.5 shrink-0 fill-accent text-accent" />
                  ) : (
                    <span className="font-mono text-xs text-muted-foreground tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  )}
                  <span className="font-semibold text-foreground break-words">{d.comprador}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-foreground break-words">{d.alvo}</span>
                  {status && (
                    <span
                      className={`shrink-0 rounded border px-1.5 py-px font-mono text-[9px] uppercase tracking-wider ${status.cls}`}
                    >
                      {status.label}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 items-baseline gap-3 font-mono text-xs">
                  {valor ? (
                    <span className="font-bold text-accent">{valor}</span>
                  ) : (
                    <span className="text-muted-foreground">n/d</span>
                  )}
                  {d.multiplo && d.multiplo !== "n/d" && (
                    <span className="text-muted-foreground">{d.multiplo}</span>
                  )}
                  {d.data && <span className="text-muted-foreground">{d.data}</span>}
                </div>
              </div>
              {pct > 0 && (
                <div className="mt-2 hidden h-1 overflow-hidden rounded-full bg-muted/40 sm:block">
                  <motion.span
                    initial={{ width: 0 }}
                    whileInView={{ width: `${pct}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, delay: i * 0.04 }}
                    className="block h-full rounded-full bg-gradient-to-r from-accent to-violet-400"
                  />
                </div>
              )}
              {d.contexto && (
                <div className="mt-2 font-mono text-[11px] text-muted-foreground break-words">
                  {d.contexto}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {(data.consolidadores_ativos?.length || data.perfil_alvos) && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {data.consolidadores_ativos?.length ? (
            <div className="rounded-xl border border-border/60 bg-muted/30 p-5">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Consolidadores ativos
              </p>
              <p className="mt-2 text-sm text-foreground break-words">
                {data.consolidadores_ativos.join(" · ")}
              </p>
            </div>
          ) : null}
          {data.perfil_alvos && (
            <div className="rounded-xl border border-border/60 bg-muted/30 p-5">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Perfil dos alvos
              </p>
              <p className="mt-2 text-sm text-foreground break-words">{data.perfil_alvos}</p>
            </div>
          )}
        </div>
      )}

      <CommentaryBox punchLine={data.punch_line}>{data.comentario}</CommentaryBox>
    </motion.section>
  );
}
