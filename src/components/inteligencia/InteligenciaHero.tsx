import { motion } from "framer-motion";
import { Calendar, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  setorNome: string;
  periodoReferencia?: string | null;
  dataGeracao?: string;
  isExpired?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function InteligenciaHero({
  setorNome,
  periodoReferencia,
  dataGeracao,
  isExpired,
  onRefresh,
  isRefreshing,
}: Props) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="border-b border-border/60 pb-12 mb-16"
    >
      <div className="inline-flex items-center gap-2.5 rounded-full border border-accent/30 bg-accent/[0.06] px-3.5 py-1.5">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
        </span>
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
          Inteligência de Mercado
        </span>
      </div>

      <h1 className="mt-6 text-4xl font-extrabold leading-[1.02] tracking-tight text-foreground sm:text-5xl lg:text-6xl break-words">
        O mercado de{" "}
        <em className="not-italic bg-gradient-to-br from-accent via-accent to-foreground bg-clip-text text-transparent">
          {setorNome}
        </em>
        <br />
        em 5 lentes.
      </h1>
      <p className="mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg break-words">
        Quem é grande, quem opera bem, quem cresce certo, quais modelos coexistem
        e como o mercado se consolida — análise setorial profissional atualizada
        toda semana.
      </p>

      <div className="mt-7 flex flex-wrap items-center gap-2.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        {periodoReferencia && (
          <span className="rounded-md border border-border/60 bg-card px-2.5 py-1 text-foreground">
            <Sparkles className="mr-1 inline h-3 w-3 text-accent" />
            {periodoReferencia}
          </span>
        )}
        {dataGeracao && (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-card px-2.5 py-1">
            <Calendar className="h-3 w-3" />
            Gerado em {dataGeracao}
          </span>
        )}
        {isExpired && (
          <span className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-amber-400">
            Atualizando em background…
          </span>
        )}
        {onRefresh && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="h-7 gap-1.5 px-2 text-[11px]"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        )}
      </div>
    </motion.section>
  );
}
