import { Sparkles, ExternalLink, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRecentMariLeads } from "@/hooks/useMariLeads";
import { Link } from "react-router-dom";

export function MariLeadCard() {
  const { data: leads = [], isLoading } = useRecentMariLeads(5);

  if (isLoading) return null;
  if (!leads.length) return null;

  return (
    <Card className="border-accent/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Sparkles className="h-4 w-4 text-accent" />
          Leads da Calculadora Mari
          <Badge variant="outline" className="text-[10px] ml-auto border-accent/40">
            últimos 7 dias · {leads.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {leads.map((l) => {
          const days = Math.floor(
            (Date.now() - new Date(l.created_at).getTime()) / (1000 * 60 * 60 * 24),
          );
          const cnpjFmt = l.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
          const waText = encodeURIComponent(
            `Oi! Vi seu cálculo na Calculadora Mari (CNPJ ${cnpjFmt}, janela ${l.window_base ?? "?"}%) e quero conversar.`,
          );
          return (
            <div
              key={l.id}
              className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border bg-card hover:bg-accent/5 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground break-words">
                  {l.razao_social ?? cnpjFmt}
                </p>
                <p className="text-xs text-muted-foreground break-words">
                  {cnpjFmt} · {l.uf ?? "—"} ·{" "}
                  {l.window_base != null ? `janela ${l.window_base}%` : "sem janela"} ·{" "}
                  {days === 0 ? "hoje" : `há ${days}d`} ·{" "}
                  <span className={l.status === "listed" ? "text-emerald-600" : "text-amber-600"}>
                    {l.status === "listed" ? "publicou anúncio" : "ainda rascunho"}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {l.listing_id && (
                  <Button asChild variant="ghost" size="icon" className="h-7 w-7">
                    <Link to={`/listing/${l.listing_id}`} title="Abrir anúncio">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                )}
                <Button asChild variant="ghost" size="icon" className="h-7 w-7">
                  <a
                    href={`https://wa.me/?text=${waText}`}
                    target="_blank"
                    rel="noreferrer"
                    title="WhatsApp"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                  </a>
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
