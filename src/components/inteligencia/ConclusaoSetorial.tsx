import { motion } from "framer-motion";
import { Trophy, Layers, Target } from "lucide-react";
import { RichParagraph, renderRich } from "./shared/RichText";

interface Props {
  data?: {
    vencedores?: string;
    consolidadores?: string;
    alvos?: string;
    tres_blocos?: { executam?: string; consolidam?: string; atrasados?: string };
    paragrafos?: string[];
    punch_line?: string;
  };
}

export function ConclusaoSetorial({ data }: Props) {
  if (!data) return null;
  const paragrafos = data.paragrafos?.filter(Boolean) ?? [];

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.5 }}
      className="relative mb-12 overflow-hidden rounded-3xl border border-border/60 p-8 sm:p-12"
      style={{
        background: `
          radial-gradient(800px 400px at 20% 0%, hsl(var(--accent) / 0.10), transparent 70%),
          radial-gradient(600px 400px at 100% 100%, hsl(var(--accent) / 0.05), transparent 70%),
          hsl(var(--card) / 0.5)
        `,
      }}
    >
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
        Conclusão setorial
      </p>
      <h2 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl break-words max-w-3xl">
        Quem domina indicadores,{" "}
        <em className="not-italic text-accent">domina o jogo.</em>
      </h2>

      {paragrafos.length > 0 ? (
        <div className="mt-7 max-w-3xl space-y-4 text-[15px] leading-relaxed text-muted-foreground sm:text-base">
          {paragrafos.map((p, i) => (
            <p key={i} className="break-words">
              {renderRich(p)}
            </p>
          ))}
        </div>
      ) : (
        <div className="mt-7 grid gap-5 sm:grid-cols-3">
          {data.vencedores && (
            <div>
              <Trophy className="h-4 w-4 text-accent" />
              <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Vencedores
              </p>
              <RichParagraph
                text={data.vencedores}
                className="mt-1 text-sm text-foreground"
              />
            </div>
          )}
          {data.consolidadores && (
            <div>
              <Layers className="h-4 w-4 text-accent" />
              <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Consolidadores
              </p>
              <RichParagraph
                text={data.consolidadores}
                className="mt-1 text-sm text-foreground"
              />
            </div>
          )}
          {data.alvos && (
            <div>
              <Target className="h-4 w-4 text-accent" />
              <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Alvos
              </p>
              <RichParagraph
                text={data.alvos}
                className="mt-1 text-sm text-foreground"
              />
            </div>
          )}
        </div>
      )}

      {data.tres_blocos && (
        <div className="mt-8 grid gap-3 border-t border-border/50 pt-6 sm:grid-cols-3">
          {data.tres_blocos.executam && (
            <div className="rounded-xl border border-accent/30 bg-accent/[0.04] p-4">
              <p className="font-mono text-[10px] uppercase tracking-wider text-accent">Executam</p>
              <p className="mt-1.5 text-sm text-foreground break-words">
                {renderRich(data.tres_blocos.executam)}
              </p>
            </div>
          )}
          {data.tres_blocos.consolidam && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.04] p-4">
              <p className="font-mono text-[10px] uppercase tracking-wider text-amber-400">Consolidam</p>
              <p className="mt-1.5 text-sm text-foreground break-words">
                {renderRich(data.tres_blocos.consolidam)}
              </p>
            </div>
          )}
          {data.tres_blocos.atrasados && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/[0.04] p-4">
              <p className="font-mono text-[10px] uppercase tracking-wider text-rose-400">Atrasados</p>
              <p className="mt-1.5 text-sm text-foreground break-words">
                {renderRich(data.tres_blocos.atrasados)}
              </p>
            </div>
          )}
        </div>
      )}

      {data.punch_line && (
        <p className="mt-8 border-t border-border/50 pt-6 text-lg font-semibold italic tracking-tight text-foreground sm:text-xl break-words">
          “{data.punch_line}”
        </p>
      )}
    </motion.section>
  );
}
