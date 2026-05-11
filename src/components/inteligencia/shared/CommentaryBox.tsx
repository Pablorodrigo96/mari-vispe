import { Quote } from "lucide-react";

export function CommentaryBox({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div className="mt-5 flex gap-3 rounded-lg border border-border/60 bg-muted/40 p-4">
      <Quote className="h-4 w-4 shrink-0 text-accent" />
      <p className="text-sm leading-relaxed text-muted-foreground break-words">
        {children}
      </p>
    </div>
  );
}
