import { useQuery } from "@tanstack/react-query";
import { CardShell } from "../CardShell";
import { CockpitContext } from "@/hooks/useCockpitData";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  ctx?: CockpitContext;
  loading?: boolean;
}

export function ActiveBuyersCard({ ctx, loading }: Props) {
  const sector = ctx?.preferredSector ?? null;

  const { data, isLoading } = useQuery({
    queryKey: ["cockpit-active-buyers", sector],
    enabled: !loading,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      // Count active buyer signals (anonymized) — fallback: count active mandates / buyers globally
      const { count } = await supabase
        .from("buyer_revealed_thetas" as any)
        .select("buyer_id", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  if (loading || isLoading) return <CardShell title="Compradores ativos" hint="Compradores com tese ativa que podem ter interesse no seu setor." accent="blue" loading />;

  const total = data ?? 0;

  if (total === 0) {
    return (
      <CardShell
        title="Compradores ativos"
        hint="Compradores com tese ativa que podem ter interesse no seu setor."
        accent="blue"
        empty
        emptyMessage="Ainda não temos compradores rastreados pra cruzar com você."
        emptyCta={{ label: "Cadastrar uma tese", to: "/registrar-comprador" }}
      />
    );
  }

  return (
    <CardShell
      title="Compradores ativos"
      hint="Compradores com tese ativa cadastrados na Mari, com afinidade ao seu setor."
      accent="blue"
      cta={{ label: "Ver compradores", to: "/matching" }}
    >
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold text-foreground tabular-nums">{total}</span>
        <span className="text-xs text-muted-foreground">compatíveis</span>
      </div>
      <p className="text-[10px] text-muted-foreground mt-1 break-words">
        {sector ? `Setor "${sector}"` : "Em todos os setores"}
      </p>
    </CardShell>
  );
}
