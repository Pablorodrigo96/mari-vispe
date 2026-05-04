import { useQuery } from "@tanstack/react-query";
import { CardShell } from "../CardShell";
import { CockpitContext } from "@/hooks/useCockpitData";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp } from "lucide-react";

interface Props {
  ctx?: CockpitContext;
  loading?: boolean;
}

export function MarketSignalCard({ ctx, loading }: Props) {
  const state = ctx?.preferredState ?? null;

  const { data, isLoading } = useQuery({
    queryKey: ["cockpit-market-signal", state],
    enabled: !loading,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      let q = supabase
        .from("eb_isp_uf_summary" as any)
        .select("uf, total_accesses, n_providers_sum, avg_rollup_opportunity")
        .order("avg_rollup_opportunity", { ascending: false })
        .limit(1);
      if (state) q = q.eq("uf", state);
      const { data } = await q;
      return data?.[0] ?? null;
    },
  });

  if (loading || isLoading) return <CardShell title="Sinal do mercado" hint="Movimento agregado do setor / região onde você atua." accent="emerald" loading />;

  if (!data) {
    return (
      <CardShell
        title="Sinal do mercado"
        hint="Movimento agregado do setor / região onde você atua."
        accent="emerald"
        empty
        emptyMessage="Sem dados de mercado pra sua região agora — voltamos quando houver."
      />
    );
  }

  const row = data as any;

  return (
    <CardShell
      title="Sinal do mercado"
      hint="Movimento agregado do setor/região: nº de provedores ativos e oportunidade de consolidação."
      accent="emerald"
    >
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="h-4 w-4 text-emerald-500" />
        <span className="text-sm font-semibold text-foreground">{row.uf ?? "BR"}</span>
      </div>
      <p className="text-xs text-foreground break-words">
        {Number(row.n_providers_sum ?? 0).toLocaleString("pt-BR")} players ativos
      </p>
      <p className="text-[10px] text-muted-foreground mt-0.5 break-words">
        Oportunidade de consolidação: {Math.round((Number(row.avg_rollup_opportunity ?? 0)) * 100)}%
      </p>
    </CardShell>
  );
}
