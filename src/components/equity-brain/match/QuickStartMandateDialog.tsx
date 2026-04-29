import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Rocket } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  cnpj: string;
  buyerId?: string | null;
  buyerNome?: string | null;
  setor?: string | null;
  uf?: string | null;
  faturamento?: number | null;
  trigger?: React.ReactNode;
  onCreated?: (mandateId: string) => void;
}

/**
 * Cria um mandato em equity_brain.mandates a partir de um match (sem mandato vigente).
 * RLS: admin/advisor.
 */
export function QuickStartMandateDialog({
  cnpj, buyerId, buyerNome, setor, uf, faturamento, trigger, onCreated,
}: Props) {
  const [open, setOpen] = useState(false);
  const [valorPedido, setValorPedido] = useState<string>(faturamento ? String(Math.round(faturamento * 4)) : "");
  const [observacoes, setObservacoes] = useState<string>(
    buyerNome ? `Mandato iniciado a partir de match com comprador "${buyerNome}".` : "Mandato iniciado a partir de match IA."
  );
  const navigate = useNavigate();
  const qc = useQueryClient();

  const mut = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const payload: any = {
        company_cnpj: cnpj,
        status: "vigente",
        outcome: "ativo",
        pipeline_stage: "qualificacao",
        deal_type: "venda",
        match_buyer_id: buyerId ?? null,
        comprador_nome: buyerNome ?? null,
        setor: setor ?? null,
        uf: uf ?? null,
        valor_pedido: valorPedido ? Number(valorPedido) : null,
        observacoes: observacoes || null,
        responsavel_id: user?.id ?? null,
        created_by: user?.id ?? null,
        source: "match_inbox",
      };
      const { data, error } = await (supabase as any)
        .schema("equity_brain")
        .from("mandates")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      return data?.id as string;
    },
    onSuccess: (id) => {
      toast.success("Mandato criado");
      qc.invalidateQueries({ queryKey: ["crm", "mandates"] });
      qc.invalidateQueries({ queryKey: ["match-inbox"] });
      setOpen(false);
      onCreated?.(id);
      navigate(`/equity-brain/crm/mandate/${id}`);
    },
    onError: (e: any) => {
      toast.error("Não foi possível criar mandato", { description: e?.message });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="h-7 px-2.5 bg-[#D9F564] text-zinc-900 hover:opacity-90">
            <Rocket className="h-3 w-3 mr-1" /> Iniciar mandato
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-zinc-100 flex items-center gap-2">
            <Rocket className="h-4 w-4 text-[#D9F564]" /> Iniciar mandato a partir do match
          </DialogTitle>
          <DialogDescription className="text-zinc-400 break-words">
            Cria um mandato vigente já amarrado a este comprador. Você cai direto na 360 do mandato.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3 text-zinc-400">
            <div><span className="block text-[10px] uppercase tracking-wider">CNPJ</span> <span className="text-zinc-200 break-words">{cnpj}</span></div>
            <div><span className="block text-[10px] uppercase tracking-wider">Setor / UF</span> <span className="text-zinc-200">{setor ?? "—"} · {uf ?? "—"}</span></div>
            <div><span className="block text-[10px] uppercase tracking-wider">Comprador</span> <span className="text-zinc-200 break-words">{buyerNome ?? "—"}</span></div>
            <div><span className="block text-[10px] uppercase tracking-wider">Faturamento</span> <span className="text-zinc-200">{faturamento ? faturamento.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }) : "—"}</span></div>
          </div>
          <div>
            <Label className="text-xs text-zinc-400">Valor pretendido (R$)</Label>
            <Input
              type="number" value={valorPedido} onChange={(e) => setValorPedido(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-zinc-100"
              placeholder="Ex.: 12.000.000"
            />
          </div>
          <div>
            <Label className="text-xs text-zinc-400">Observações</Label>
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} className="bg-zinc-900 border-zinc-800 text-zinc-100 text-xs" rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} className="text-zinc-400">Cancelar</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending} className="bg-[#D9F564] text-zinc-900 hover:opacity-90">
            {mut.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
            Criar mandato
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
