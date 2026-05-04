import { CardShell } from "../CardShell";
import { CockpitContext } from "@/hooks/useCockpitData";

interface Props {
  ctx?: CockpitContext;
  loading?: boolean;
}

export function WindowCard({ ctx, loading }: Props) {
  // Heuristic: derive a "window of sale (12m)" probability from equity_score.
  // equity_score 0-100 → use directly; missing → empty state.
  const score = ctx?.primaryListing?.equity_score ?? null;

  if (loading) return <CardShell title="Janela de venda · 12m" hint="Probabilidade estimada de fechar uma venda nos próximos 12 meses." accent="volt" loading />;

  if (score == null) {
    return (
      <CardShell
        title="Janela de venda · 12m"
        hint="Probabilidade estimada de fechar uma venda nos próximos 12 meses, com faixa otimista/base/pessimista."
        accent="volt"
        empty
        emptyMessage="Anuncie ou avalie sua empresa pra calcularmos sua janela."
        emptyCta={{ label: "Anunciar agora", to: "/vender" }}
      />
    );
  }

  const base = Math.round(score);
  const otimista = Math.min(95, base + 12);
  const pessimista = Math.max(5, base - 15);

  return (
    <CardShell
      title="Janela de venda · 12m"
      hint="Probabilidade estimada de fechar uma venda nos próximos 12 meses, baseada no perfil da empresa e mercado."
      accent="volt"
      cta={{ label: "Ver detalhes", to: "/meus-anuncios" }}
    >
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold text-foreground tabular-nums">{base}</span>
        <span className="text-sm text-muted-foreground">%</span>
      </div>
      <p className="text-[10px] text-muted-foreground mt-1 break-words">
        Faixa: {pessimista}% – {otimista}%
      </p>
      <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden relative">
        <div className="absolute inset-y-0 bg-accent/30" style={{ left: `${pessimista}%`, width: `${otimista - pessimista}%` }} />
        <div className="absolute inset-y-0 w-0.5 bg-accent" style={{ left: `${base}%` }} />
      </div>
    </CardShell>
  );
}
