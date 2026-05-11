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
  fonte?: string;
}

interface Props {
  data?: {
    deals?: Deal[];
    consolidadores_ativos?: string[];
    perfil_alvos?: string;
    comentario?: string;
  };
}

export function PainelMnA({ data }: Props) {
  if (!data?.deals?.length) return null;
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.4 }}
      className="py-10"
    >
      <SectionHeader
        numero={5}
        titulo="Como o mercado se consolida"
        descricao="Transações recentes, consolidadores ativos e perfil dos alvos."
      />
      <div className="space-y-2">
        {data.deals.map((d, i) => (
          <div
            key={i}
            className="flex flex-wrap items-baseline justify-between gap-3 rounded-lg border border-border/60 bg-card p-4"
          >
            <div className="flex items-baseline gap-2 min-w-0 flex-1">
              {d.destaque && <Star className="h-3.5 w-3.5 shrink-0 text-accent" />}
              <span className="font-semibold text-foreground break-words">{d.comprador}</span>
              <span className="text-muted-foreground">→</span>
              <span className="text-foreground break-words">{d.alvo}</span>
            </div>
            <div className="flex items-baseline gap-3 font-mono text-xs">
              {typeof d.valor_brl_milhoes === "number" && d.valor_brl_milhoes > 0 ? (
                <span className="text-accent">R$ {d.valor_brl_milhoes.toLocaleString("pt-BR")}M</span>
              ) : (
                <span className="text-muted-foreground">n/d</span>
              )}
              {d.multiplo && <span className="text-muted-foreground">{d.multiplo}</span>}
              {d.data && <span className="text-muted-foreground">{d.data}</span>}
            </div>
          </div>
        ))}
      </div>
      {(data.consolidadores_ativos?.length || data.perfil_alvos) && (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {data.consolidadores_ativos?.length ? (
            <div className="rounded-xl border border-border/60 bg-muted/40 p-4">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Consolidadores ativos</p>
              <p className="mt-2 text-sm text-foreground break-words">{data.consolidadores_ativos.join(" · ")}</p>
            </div>
          ) : null}
          {data.perfil_alvos && (
            <div className="rounded-xl border border-border/60 bg-muted/40 p-4">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Perfil dos alvos</p>
              <p className="mt-2 text-sm text-foreground break-words">{data.perfil_alvos}</p>
            </div>
          )}
        </div>
      )}
      <CommentaryBox>{data.comentario}</CommentaryBox>
    </motion.section>
  );
}
