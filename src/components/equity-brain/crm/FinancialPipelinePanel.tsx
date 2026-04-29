import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { formatBRL } from "@/lib/equityBrain";

export function FinancialPipelinePanel({ mandate }: { mandate: any }) {
  const [probability, setProbability] = useState<number>(mandate?.probability ?? 30);
  const [expected, setExpected] = useState<string>(mandate?.expected_close_at ?? "");
  const [commissionPct, setCommissionPct] = useState<number>(Number(mandate?.commission_pct ?? 5));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setProbability(mandate?.probability ?? 30);
    setExpected(mandate?.expected_close_at ?? "");
    setCommissionPct(Number(mandate?.commission_pct ?? 5));
  }, [mandate?.id]);

  const ticket = Number(mandate?.valor_pretendido ?? mandate?.ticket_alvo ?? 0);
  const commissionEstimate = ticket * (commissionPct / 100);
  const weighted = commissionEstimate * (probability / 100);

  async function save() {
    try {
      setSaving(true);
      const { error } = await supabase
        .schema("equity_brain" as any)
        .from("mandates" as any)
        .update({
          probability,
          expected_close_at: expected || null,
          commission_pct: commissionPct,
        })
        .eq("id", mandate.id);
      if (error) throw error;
      toast.success("Pipeline atualizado");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-4 border border-zinc-800 bg-zinc-900/40 rounded">
          <div className="text-[10px] uppercase text-zinc-400">Ticket alvo</div>
          <div className="text-lg font-bold text-zinc-100 mt-1">{formatBRL(ticket)}</div>
        </div>
        <div className="p-4 border border-zinc-800 bg-zinc-900/40 rounded">
          <div className="text-[10px] uppercase text-zinc-400">Comissão estimada</div>
          <div className="text-lg font-bold text-emerald-300 mt-1">{formatBRL(commissionEstimate)}</div>
        </div>
        <div className="p-4 border border-zinc-800 bg-zinc-900/40 rounded">
          <div className="text-[10px] uppercase text-zinc-400">Comissão ponderada (× prob.)</div>
          <div className="text-lg font-bold text-amber-300 mt-1">{formatBRL(weighted)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 border border-zinc-800 bg-zinc-900/40 rounded">
        <div>
          <label className="text-[10px] uppercase text-zinc-400 mb-1 block">Probabilidade (%)</label>
          <Input type="number" min={0} max={100} value={probability}
            onChange={(e) => setProbability(Number(e.target.value))}
            className="bg-zinc-900 border-zinc-800 text-zinc-100 text-xs h-9" />
        </div>
        <div>
          <label className="text-[10px] uppercase text-zinc-400 mb-1 block">Comissão (%)</label>
          <Input type="number" min={0} max={100} step={0.5} value={commissionPct}
            onChange={(e) => setCommissionPct(Number(e.target.value))}
            className="bg-zinc-900 border-zinc-800 text-zinc-100 text-xs h-9" />
        </div>
        <div>
          <label className="text-[10px] uppercase text-zinc-400 mb-1 block">Fechamento previsto</label>
          <Input type="date" value={expected ?? ""} onChange={(e) => setExpected(e.target.value)}
            className="bg-zinc-900 border-zinc-800 text-zinc-100 text-xs h-9" />
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-500 text-white">
        <Save className="h-3.5 w-3.5 mr-1.5" />
        {saving ? "Salvando…" : "Salvar pipeline"}
      </Button>
    </div>
  );
}
