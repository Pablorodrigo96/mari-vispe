import { motion } from "framer-motion";
import { Calendar, RefreshCw } from "lucide-react";
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
      transition={{ duration: 0.4 }}
      className="border-b border-border/60 pb-8"
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">
        Inteligência de Mercado
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl break-words">
        {setorNome}
      </h1>
      <p className="mt-3 max-w-2xl text-base text-muted-foreground break-words">
        Análise setorial profissional em 5 lentes: tamanho, eficiência, velocidade,
        head-to-head e M&amp;A. Atualizada toda semana.
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        {periodoReferencia && (
          <span className="rounded border border-border/60 bg-card px-2 py-1">
            {periodoReferencia}
          </span>
        )}
        {dataGeracao && (
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Gerado em {dataGeracao}
          </span>
        )}
        {isExpired && (
          <span className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-amber-400">
            Dados expirados — atualizando…
          </span>
        )}
        {onRefresh && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="h-7 px-2 text-[11px]"
          >
            <RefreshCw className={`mr-1 h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        )}
      </div>
    </motion.section>
  );
}
