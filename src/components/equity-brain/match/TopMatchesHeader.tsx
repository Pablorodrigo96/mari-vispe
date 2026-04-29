import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMatchPercentiles, tierForScore } from "@/hooks/useMatchInbox";
import { cn } from "@/lib/utils";
import { InfoHint } from "@/components/equity-brain/InfoHint";

interface Props {
  /** Use cnpj para mandato (vendedor) — busca top buyers que casam */
  cnpj?: string;
  /** Use buyerId para buyer — busca top mandatos que casam */
  buyerId?: string;
}

export function TopMatchesHeader({ cnpj, buyerId }: Props) {
  const { data: pcts } = useMatchPercentiles();

  const q = useQuery({
    queryKey: ["top-matches-header", cnpj, buyerId],
    enabled: !!(cnpj || buyerId),
    queryFn: async () => {
      const base = (supabase as any)
        .schema("equity_brain")
        .from("matches")
        .select("id,cnpj,buyer_id,match_score,thesis_key")
        .eq("is_current", true)
        .order("match_score", { ascending: false })
        .limit(5);
      const { data: m } = cnpj ? await base.eq("cnpj", cnpj) : await base.eq("buyer_id", buyerId!);
      const rows = (m ?? []) as any[];
      if (rows.length === 0) return [];
      // enrich with side names
      if (cnpj) {
        const ids = rows.map((r) => r.buyer_id);
        const { data: buyers } = await (supabase as any).schema("equity_brain").from("buyers").select("id,nome,tipo").in("id", ids);
        const bm = new Map((buyers ?? []).map((b: any) => [b.id, b]));
        return rows.map((r) => ({ ...r, sideName: (bm.get(r.buyer_id) as any)?.nome ?? "Comprador" }));
      } else {
        const cnpjs = rows.map((r) => r.cnpj);
        const { data: comps } = await (supabase as any).schema("equity_brain").from("companies").select("cnpj,razao_social,codename").in("cnpj", cnpjs);
        const cm = new Map((comps ?? []).map((c: any) => [c.cnpj, c]));
        return rows.map((r) => ({ ...r, sideName: (cm.get(r.cnpj) as any)?.codename ?? (cm.get(r.cnpj) as any)?.razao_social ?? r.cnpj }));
      }
    },
  });

  const rows = q.data ?? [];
  if (q.isLoading || rows.length === 0) return null;

  const top = rows[0];
  const tier = tierForScore(Number(top.match_score), pcts);
  const label = cnpj ? "compradores" : "mandatos";

  return (
    <div className="rounded-lg border border-[#D9F564]/30 bg-[#D9F564]/5 p-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Target className="h-4 w-4 text-[#D9F564]" />
        <span className="text-sm text-zinc-100">
          <strong>{rows.length}</strong> {label} casam — top: <span className="text-[#D9F564] font-semibold">{top.sideName}</span>
        </span>
        <span className={cn("text-[10px] px-1.5 py-0.5 rounded border tabular-nums font-bold", tier.cls)}>
          {tier.emoji} {Math.round(Number(top.match_score))}
        </span>
        <InfoHint
          title="Top Matches"
          what="Pares calculados pelo motor IA com base em setor, geografia, porte e tese de investimento."
          action="Veja todos na Match Inbox e contate os mais quentes primeiro."
          className="!ml-0"
        />
        <Link to="/equity-brain/match-inbox"
          className="ml-auto text-[11px] inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#D9F564] text-zinc-900 font-semibold hover:opacity-90">
          Ver todos <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        {rows.map((r: any) => {
          const t = tierForScore(Number(r.match_score), pcts);
          return (
            <span key={r.id} className={cn("text-[10px] px-1.5 py-0.5 rounded border", t.cls)}>
              {Math.round(Number(r.match_score))} · {r.sideName.slice(0, 24)}
            </span>
          );
        })}
      </div>
    </div>
  );
}
