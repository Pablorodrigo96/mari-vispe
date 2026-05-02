import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export function DealMeta({ mandateId }: { mandateId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["deal-meta", mandateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .schema("equity_brain" as any)
        .from("mandates")
        .select("id, company_cnpj, pipeline_stage, status, deal_phase, comprador_nome, setor, uf, valor_operacao, last_activity_at, stage_changed_at")
        .eq("id", mandateId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2 text-zinc-500 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
      </div>
    );
  }
  if (!data) return null;

  const daysInStage = data.stage_changed_at
    ? Math.floor((Date.now() - new Date(data.stage_changed_at).getTime()) / 86400000)
    : null;

  return (
    <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-950">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-zinc-500 font-mono">{data.company_cnpj || "—"}</div>
          <div className="text-base font-semibold text-zinc-100 mt-0.5 break-words">
            {data.comprador_nome || `Mandato ${mandateId.slice(0, 8)}`}
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {data.pipeline_stage && (
              <Badge variant="outline" className="bg-transparent border-[#D9F564]/40 text-[#D9F564] text-[10px]">
                {data.pipeline_stage}
              </Badge>
            )}
            {data.status && (
              <Badge variant="outline" className="bg-transparent border-zinc-700 text-zinc-400 text-[10px]">
                {data.status}
              </Badge>
            )}
            {daysInStage !== null && (
              <span className="text-[10px] text-zinc-500">{daysInStage}d na fase</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
