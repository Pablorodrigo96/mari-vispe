import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface Props {
  title?: string;
  description?: string;
  cta?: string;
  onAction?: () => void;
}

export function EmptyState({ title, description, cta, onAction }: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 p-10 text-center">
      <AlertCircle className="h-8 w-8 text-muted-foreground/60" />
      <h3 className="mt-4 text-base font-semibold text-foreground">
        {title ?? "Nada por aqui ainda"}
      </h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground break-words">
          {description}
        </p>
      )}
      {cta && onAction && (
        <Button onClick={onAction} className="mt-5">
          {cta}
        </Button>
      )}
    </div>
  );
}
