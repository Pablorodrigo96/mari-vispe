import { ReactNode } from "react";
import { RichParagraph } from "./RichText";

interface Props {
  children?: ReactNode;
  titulo?: string;
  punchLine?: string | null;
}

export function CommentaryBox({ children, titulo, punchLine }: Props) {
  const text = typeof children === "string" ? children : null;
  if (!text && !punchLine && !children) return null;
  return (
    <div className="relative mt-9 overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-accent/[0.06] via-card to-card p-7 sm:p-8">
      <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-accent via-accent/60 to-transparent" />
      {titulo && (
        <h3 className="mb-3 text-lg font-bold tracking-tight text-foreground sm:text-xl">
          {titulo}
        </h3>
      )}
      {text ? (
        <RichParagraph text={text} className="text-[15px] leading-relaxed text-muted-foreground" />
      ) : (
        children
      )}
      {punchLine && (
        <p className="mt-5 border-t border-border/50 pt-5 text-[17px] font-semibold italic tracking-tight text-foreground break-words">
          {punchLine}
        </p>
      )}
    </div>
  );
}
