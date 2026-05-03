import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Gauge } from "./Gauge";
import { NivelBadge } from "./NivelBadge";
import { TopFragilidades } from "./TopFragilidades";
import { Stethoscope, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  cnpj?: string | null;
}

export function DiagnosticoVispe({ cnpj }: Props) {
  const qc = useQueryClient();
  const [recalculating, setRecalculating] = useState(false);

  async function handleRecalculate() {
    if (!cnpj) return;
    setRecalculating(true);
    try {
      const { error } = await supabase.functions.invoke("calculate-vendabilidade-batch", {
        body: { cnpj },
      });
      if (error) throw error;
      toast.success("Vendabilidade recalculada");
      qc.invalidateQueries({ queryKey: ["eb", "sv", cnpj] });
    } catch (e: any) {
      toast.error("Falha: " + (e?.message ?? "erro"));
    } finally {
      setRecalculating(false);
    }
  }

  const { data, isLoading } = useQuery({
    queryKey: ["eb", "sv", cnpj],
    enabled: !!cnpj,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .schema("equity_brain")
        .from("companies")
        .select("score_vendabilidade,nivel_maturidade,sv_breakdown,sv_calculated_at,sv_data_completeness")
        .eq("cnpj", cnpj)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (!cnpj) return null;
  if (isLoading) {
    return (
      <div className="bg-zinc-900/40 border border-zinc-800 rounded p-4 text-xs text-zinc-500">
        Calculando diagnóstico…
      </div>
    );
  }
  if (!data || data.score_vendabilidade == null) {
    return (
      <div className="bg-zinc-900/40 border border-zinc-800 rounded p-4 space-y-1">
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
          <Stethoscope className="h-3.5 w-3.5 text-[#D9F564]" />
          Diagnóstico Vispe
        </div>
        <div className="text-[11px] text-zinc-500">
          Sem score de vendabilidade ainda. Ele será calculado no próximo ciclo (4h).
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/40 border border-zinc-800 rounded p-4 space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
        <Stethoscope className="h-3.5 w-3.5 text-[#D9F564]" />
        Diagnóstico Vispe — Vendabilidade
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-[auto,1fr] gap-4 items-center">
        <Gauge value={Number(data.score_vendabilidade)} label="Score SV" size={110} />
        <div className="space-y-2">
          <NivelBadge nivel={data.nivel_maturidade} />
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">
            Top fragilidades
          </div>
          <TopFragilidades breakdown={data.sv_breakdown} />
          {data.sv_data_completeness != null && (
            <div className="text-[10px] text-zinc-500">
              Completude de dados: {Math.round(Number(data.sv_data_completeness) * 100)}%
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
