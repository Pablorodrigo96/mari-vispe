import { useDashboardInsight } from "@/hooks/useDashboardInsight";
import { CardShell } from "../CardShell";
import { CockpitContext } from "@/hooks/useCockpitData";
import { Sparkles } from "lucide-react";

interface Props {
  ctx?: CockpitContext;
  loading?: boolean;
}

export function MariInsightCard({ ctx, loading }: Props) {
  const snapshot = ctx?.primaryListing || ctx?.lastValuation
    ? {
        sector: ctx?.preferredSector,
        state: ctx?.preferredState,
        revenue: ctx?.primaryListing?.annual_revenue,
        score: ctx?.primaryListing?.equity_score,
        last_valuation_segment: ctx?.lastValuation?.segment,
      }
    : null;

  const insight = useDashboardInsight("executivo", snapshot);

  if (loading) return <CardShell title="Insight da Mari" hint="Leitura curta gerada pela IA com base no seu perfil." accent="violet" loading />;

  if (!snapshot) {
    return (
      <CardShell
        title="Insight da Mari"
        hint="Leitura curta gerada pela IA com base no seu perfil."
        accent="violet"
        empty
        emptyMessage="Crie um anúncio ou um valuation pra eu poder te dizer algo útil."
        emptyCta={{ label: "Começar", to: "/vender" }}
      />
    );
  }

  if (insight.loading || !insight.body) {
    return <CardShell title="Insight da Mari" hint="Leitura curta gerada pela IA com base no seu perfil." accent="violet" loading />;
  }

  // Truncate to 180 chars to fit the card
  const text = insight.body.length > 180 ? insight.body.slice(0, 177) + "…" : insight.body;

  return (
    <CardShell
      title="Insight da Mari"
      hint="Leitura curta gerada pela IA com base no seu perfil — atualizada a cada 24h."
      accent="violet"
    >
      <div className="flex gap-2">
        <Sparkles className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
        <p className="text-xs text-foreground break-words leading-relaxed">{text}</p>
      </div>
    </CardShell>
  );
}
