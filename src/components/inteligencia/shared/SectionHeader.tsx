import { Info } from "lucide-react";

interface Props {
  numero: number;
  titulo: string;
  fonte?: string;
  descricao?: string;
}

export function SectionHeader({ numero, titulo, fonte, descricao }: Props) {
  return (
    <header className="mb-6 flex items-start gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-accent/30 bg-accent/10 font-mono text-lg font-bold text-accent">
        {String(numero).padStart(2, "0")}
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {titulo}
        </h2>
        {descricao && (
          <p className="mt-1 text-sm text-muted-foreground break-words">{descricao}</p>
        )}
        {fonte && (
          <p className="mt-1 flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground/80">
            <Info className="h-3 w-3" /> Fonte: {fonte}
          </p>
        )}
      </div>
    </header>
  );
}
