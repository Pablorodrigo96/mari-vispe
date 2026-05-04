import { Sparkles, X } from "lucide-react";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMyMariLead } from "@/hooks/useMariLeads";

const STORAGE_KEY = "mari_origin_badge_dismissed_v1";

export function MariOriginBadge() {
  const { data: lead, isLoading } = useMyMariLead();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  if (isLoading || !lead || dismissed) return null;

  const days = Math.max(
    0,
    Math.floor((Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24)),
  );

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* noop */
    }
    setDismissed(true);
  };

  return (
    <Card className="border-accent/30 bg-gradient-to-r from-accent/10 to-transparent">
      <CardContent className="p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-accent" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground break-words">
              Você veio da Calculadora Mari
              {lead.window_base != null && (
                <Badge variant="outline" className="ml-2 text-[10px] border-accent/40">
                  janela {lead.window_base}%
                </Badge>
              )}
            </p>
            <p className="text-xs text-muted-foreground break-words">
              {lead.razao_social ?? "Empresa"} · {lead.uf ?? "—"} ·{" "}
              {days === 0 ? "hoje" : `há ${days}d`} ·{" "}
              {lead.status === "listed" ? "anúncio publicado" : "rascunho aberto"}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleDismiss}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}
