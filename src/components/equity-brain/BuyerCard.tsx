import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, relativeTime } from "@/lib/equityBrain";
import { useState } from "react";

interface BuyerCardProps {
  buyerId: string;
}

export function BuyerCard({ buyerId }: BuyerCardProps) {
  const qc = useQueryClient();
  const [newThesis, setNewThesis] = useState<string>("");

  const buyerQ = useQuery({
    queryKey: ["eb", "buyer", buyerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .schema("equity_brain" as any).from("buyers" as any)
        .select("*").eq("id", buyerId).maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const thesesQ = useQuery({
    queryKey: ["eb", "buyer-theses", buyerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .schema("equity_brain" as any).from("buyer_theses" as any)
        .select("*, investment_theses(display_name, description)")
        .eq("buyer_id", buyerId)
        .order("prioridade");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const matchesQ = useQuery({
    queryKey: ["eb", "buyer-matches", buyerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .schema("equity_brain" as any).from("matches_enriched" as any)
        .select("cnpj, razao_social, uf, setor_ma, match_score, thesis_name")
        .eq("buyer_id", buyerId)
        .order("match_score", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const catalogQ = useQuery({
    queryKey: ["eb", "thesis-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .schema("equity_brain" as any).from("investment_theses" as any)
        .select("thesis_key, display_name").eq("active", true);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const addThesis = useMutation({
    mutationFn: async (thesis_key: string) => {
      const { error } = await supabase
        .schema("equity_brain" as any).from("buyer_theses" as any)
        .insert({ buyer_id: buyerId, thesis_key, prioridade: 2, active: true });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tese vinculada", { description: "Recompute de matches em ~1 min." });
      setNewThesis("");
      qc.invalidateQueries({ queryKey: ["eb", "buyer-theses", buyerId] });
    },
    onError: (e: any) => toast.error("Falha", { description: e?.message }),
  });

  const removeThesis = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .schema("equity_brain" as any).from("buyer_theses" as any)
        .delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tese removida");
      qc.invalidateQueries({ queryKey: ["eb", "buyer-theses", buyerId] });
    },
  });

  if (buyerQ.isLoading) return <div className="p-8 text-center"><Loader2 className="h-5 w-5 animate-spin text-emerald-500 mx-auto" /></div>;
  const buyer = buyerQ.data;
  if (!buyer) return <div className="p-6 text-sm text-zinc-500">Buyer não encontrado.</div>;

  const usedKeys = new Set((thesesQ.data ?? []).map((t: any) => t.thesis_key));
  const available = (catalogQ.data ?? []).filter((c: any) => !usedKeys.has(c.thesis_key));

  return (
    <div className="p-5 space-y-4">
      <div>
        <h2 className="text-xl font-bold text-zinc-100">{buyer.nome}</h2>
        <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
          <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700">{buyer.tipo}</span>
          <span>Ticket: {formatBRL(buyer.ticket_min)} – {formatBRL(buyer.ticket_max)}</span>
          <span className="text-zinc-600">·</span>
          <span>{buyer.deals_realizados ?? 0} deals</span>
        </div>
      </div>

      <Tabs defaultValue="teses">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="teses" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-emerald-300">Teses ({thesesQ.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="matches" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-emerald-300">Matches ({matchesQ.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="info" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-emerald-300">Info</TabsTrigger>
        </TabsList>

        <TabsContent value="teses" className="space-y-2 mt-3">
          {(thesesQ.data ?? []).map((bt: any) => (
            <div key={bt.id} className="rounded border border-zinc-800 bg-zinc-900 p-3 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm text-zinc-100 font-medium">{bt.investment_theses?.display_name ?? bt.thesis_key}</div>
                <div className="text-[11px] text-zinc-500 mt-0.5">
                  Prioridade {bt.prioridade} · {bt.active ? "ativa" : "inativa"}
                </div>
              </div>
              <Button
                size="sm" variant="ghost"
                onClick={() => removeThesis.mutate(bt.id)}
                className="h-7 px-2 text-zinc-500 hover:text-rose-400 hover:bg-zinc-800"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          {available.length > 0 && (
            <div className="rounded border border-dashed border-zinc-700 bg-zinc-950 p-3 flex gap-2">
              <select
                value={newThesis}
                onChange={(e) => setNewThesis(e.target.value)}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-sm text-zinc-100"
              >
                <option value="">Adicionar tese…</option>
                {available.map((c: any) => (
                  <option key={c.thesis_key} value={c.thesis_key}>{c.display_name}</option>
                ))}
              </select>
              <Button
                size="sm"
                onClick={() => newThesis && addThesis.mutate(newThesis)}
                disabled={!newThesis || addThesis.isPending}
                className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950"
              >
                Adicionar
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="matches" className="mt-3">
          <div className="rounded border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800 max-h-96 overflow-auto">
            {(matchesQ.data ?? []).map((m: any) => (
              <div key={m.cnpj + m.thesis_name} className="p-2.5 flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <div className="text-zinc-100 truncate">{m.razao_social}</div>
                  <div className="text-zinc-500">{m.setor_ma} · {m.uf} · {m.thesis_name}</div>
                </div>
                <div className="text-emerald-400 font-mono font-bold tabular-nums">{Math.round(Number(m.match_score))}</div>
              </div>
            ))}
            {(matchesQ.data ?? []).length === 0 && (
              <div className="p-4 text-center text-xs text-zinc-500">Sem matches calculados ainda.</div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="info" className="mt-3 space-y-2 text-xs">
          {[
            ["Setores", (buyer.setores_interesse ?? []).join(", ") || "—"],
            ["UFs", (buyer.ufs_interesse ?? []).join(", ") || "—"],
            ["Porte alvo", (buyer.porte_alvo ?? []).join(", ") || "—"],
            ["Sinergias", (buyer.sinergias_chave ?? []).join(", ") || "—"],
            ["Status", buyer.status],
            ["Atualizado", relativeTime(buyer.updated_at)],
            ["Observações", buyer.observacoes ?? "—"],
          ].map(([k, v]) => (
            <div key={k as string} className="flex items-start gap-3 py-1.5 border-b border-zinc-900">
              <div className="w-28 shrink-0 text-zinc-500">{k}</div>
              <div className="text-zinc-200">{v}</div>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
