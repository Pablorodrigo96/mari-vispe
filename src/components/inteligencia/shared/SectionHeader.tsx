interface Props {
  numero: number;
  eyebrow?: string;
  titulo: string;
  descricao?: string;
  fonte?: string;
}

export function SectionHeader({ numero, eyebrow, titulo, descricao, fonte }: Props) {
  const num = String(numero).padStart(2, "0");
  return (
    <header className="mb-9 flex flex-wrap items-end justify-between gap-5">
      <div className="min-w-0 flex-1">
        <div className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
          {num} — {eyebrow ?? titulo}
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl break-words max-w-3xl">
          {titulo}
        </h2>
        {descricao && (
          <p className="mt-2 text-sm text-muted-foreground break-words max-w-2xl">
            {descricao}
          </p>
        )}
      </div>
      {fonte && (
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground text-right max-w-[200px] break-words">
          {fonte}
        </p>
      )}
    </header>
  );
}
