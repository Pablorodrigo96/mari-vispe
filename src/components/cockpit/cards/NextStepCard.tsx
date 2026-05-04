import { CardShell } from "../CardShell";
import { CockpitContext } from "@/hooks/useCockpitData";

interface Props {
  ctx?: CockpitContext;
  loading?: boolean;
}

interface Step {
  message: string;
  cta: { label: string; to: string };
}

function decideStep(ctx?: CockpitContext): Step {
  if (!ctx?.primaryListing && !ctx?.lastValuation) {
    return {
      message: "Anuncie sua empresa em 4 passos pra começar a receber sinais.",
      cta: { label: "Anunciar empresa", to: "/vender" },
    };
  }
  if (!ctx?.lastValuation) {
    return {
      message: "Avalie sua empresa em 2 minutos pra ativar a janela de venda.",
      cta: { label: "Avaliar agora", to: "/valuation" },
    };
  }
  if (!ctx?.primaryListing) {
    return {
      message: "Sua avaliação está pronta. Anuncie pra ativar a vitrine de compradores.",
      cta: { label: "Criar anúncio", to: "/vender" },
    };
  }
  return {
    message: "Atualize fotos e diferenciais do seu anúncio pra subir a atratividade.",
    cta: { label: "Editar anúncio", to: `/anuncio/${ctx.primaryListing.id}/editar` },
  };
}

export function NextStepCard({ ctx, loading }: Props) {
  if (loading) return <CardShell title="Próximo passo" hint="A próxima ação que mais aumenta sua probabilidade de fechar." accent="amber" loading />;

  const step = decideStep(ctx);

  return (
    <CardShell
      title="Próximo passo"
      hint="A próxima ação que mais aumenta sua probabilidade de fechar — sugerida pela Mari com base no seu estágio."
      accent="amber"
      cta={step.cta}
    >
      <p className="text-sm font-medium text-foreground break-words leading-snug">{step.message}</p>
    </CardShell>
  );
}
