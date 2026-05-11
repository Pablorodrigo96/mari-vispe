interface Props {
  fontes?: string[];
}
export function FootnoteSource({ fontes }: Props) {
  if (!fontes?.length) return null;
  return (
    <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70 break-words">
      Fontes: {fontes.slice(0, 4).join(" · ")}
      {fontes.length > 4 && ` · +${fontes.length - 4}`}
    </p>
  );
}
