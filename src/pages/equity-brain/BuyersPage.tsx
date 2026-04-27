import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { BuyerCard } from "@/components/equity-brain/BuyerCard";
import { formatBRL, relativeTime } from "@/lib/equityBrain";
import { cn } from "@/lib/utils";

export default function BuyersPage() {
  const qc = useQueryClient();
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const buyers = useQuery({
    queryKey: ["eb", "buyers-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .schema("equity_brain" as any).from("buyers" as any)
        .select(`*, theses:buyer_theses(count), matches:matches(count)`)
        .order("nome");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const [form, setForm] = useState({
    nome: "", tipo: "fundo", ticket_min: "", ticket_max: "", observacoes: "",
  });

  const createBuyer = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .schema("equity_brain" as any).from("buyers" as any)
        .insert({
          nome: form.nome,
          tipo: form.tipo,
          ticket_min: form.ticket_min ? Number(form.ticket_min) : null,
          ticket_max: form.ticket_max ? Number(form.ticket_max) : null,
          observacoes: form.observacoes || null,
          status: "ativo",
          source: "manual",
        }).select("id").single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Buyer criado");
      setNewOpen(false);
      setForm({ nome: "", tipo: "fundo", ticket_min: "", ticket_max: "", observacoes: "" });
      qc.invalidateQueries({ queryKey: ["eb", "buyers-list"] });
    },
    onError: (e: any) => toast.error("Falha ao criar", { description: e?.message }),
  });

  return (
    <div className="p-6 space-y-4 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Buyers</h1>
          <p className="text-sm text-zinc-500 mt-1">Catálogo de compradores estratégicos · {buyers.data?.length ?? 0} cadastrados</p>
        </div>
        <Button onClick={() => setNewOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold">
          <Plus className="h-4 w-4 mr-1" /> Novo Buyer
        </Button>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-950 text-xs text-zinc-500">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Nome</th>
              <th className="text-left px-3 py-3 font-medium">Tipo</th>
              <th className="text-right px-3 py-3 font-medium">Ticket</th>
              <th className="text-left px-3 py-3 font-medium">Setores</th>
              <th className="text-left px-3 py-3 font-medium">UFs</th>
              <th className="text-right px-3 py-3 font-medium">Teses</th>
              <th className="text-right px-3 py-3 font-medium">Atualizado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {(buyers.data ?? []).map((b) => (
              <tr key={b.id} className="hover:bg-zinc-800/40 cursor-pointer" onClick={() => setDrawerId(b.id)}>
                <td className="px-4 py-2.5 text-zinc-100 font-medium">{b.nome}</td>
                <td className="px-3 py-2.5">
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] border",
                    b.tipo === "estrategico" && "bg-blue-950/40 text-blue-300 border-blue-900",
                    b.tipo === "fundo" && "bg-emerald-950/40 text-emerald-300 border-emerald-900",
                    b.tipo === "family_office" && "bg-amber-950/40 text-amber-300 border-amber-900",
                    !["estrategico", "fundo", "family_office"].includes(b.tipo) && "bg-zinc-800 text-zinc-300 border-zinc-700",
                  )}>{b.tipo}</span>
                </td>
                <td className="px-3 py-2.5 text-right text-xs font-mono text-zinc-400 tabular-nums">
                  {formatBRL(b.ticket_min)} – {formatBRL(b.ticket_max)}
                </td>
                <td className="px-3 py-2.5 text-xs text-zinc-400 truncate max-w-[180px]">{(b.setores_interesse ?? []).join(", ") || "—"}</td>
                <td className="px-3 py-2.5 text-xs text-zinc-400">{(b.ufs_interesse ?? []).join(", ") || "todas"}</td>
                <td className="px-3 py-2.5 text-right text-xs font-mono text-zinc-300 tabular-nums">{b.theses?.[0]?.count ?? 0}</td>
                <td className="px-3 py-2.5 text-right text-[10px] text-zinc-600">{relativeTime(b.updated_at)}</td>
              </tr>
            ))}
            {buyers.isLoading && (
              <tr><td colSpan={7} className="px-4 py-8 text-center"><Loader2 className="h-5 w-5 animate-spin text-emerald-500 mx-auto" /></td></tr>
            )}
            {!buyers.isLoading && (buyers.data ?? []).length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-zinc-500 text-xs">Nenhum buyer cadastrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Sheet open={!!drawerId} onOpenChange={(o) => !o && setDrawerId(null)}>
        <SheetContent side="right" className="dark bg-zinc-950 border-l border-zinc-800 text-zinc-100 w-full sm:max-w-[600px] p-0 overflow-y-auto">
          {drawerId && <BuyerCard buyerId={drawerId} />}
        </SheetContent>
      </Sheet>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="dark bg-zinc-900 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle>Novo Buyer</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-zinc-400">Nome</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="mt-1.5 bg-zinc-950 border-zinc-800 text-zinc-100" placeholder="ex: ISP Consolidador Sul" />
            </div>
            <div>
              <Label className="text-xs text-zinc-400">Tipo</Label>
              <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className="mt-1.5 w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-100">
                <option value="fundo">Fundo</option>
                <option value="estrategico">Estratégico</option>
                <option value="family_office">Family Office</option>
                <option value="search_fund">Search Fund</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-zinc-400">Ticket mín (R$)</Label>
                <Input type="number" value={form.ticket_min} onChange={(e) => setForm({ ...form, ticket_min: e.target.value })} className="mt-1.5 bg-zinc-950 border-zinc-800 text-zinc-100" />
              </div>
              <div>
                <Label className="text-xs text-zinc-400">Ticket máx (R$)</Label>
                <Input type="number" value={form.ticket_max} onChange={(e) => setForm({ ...form, ticket_max: e.target.value })} className="mt-1.5 bg-zinc-950 border-zinc-800 text-zinc-100" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-zinc-400">Observações</Label>
              <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} className="mt-1.5 bg-zinc-950 border-zinc-800 text-zinc-100" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewOpen(false)} className="text-zinc-400 hover:bg-zinc-800">Cancelar</Button>
            <Button onClick={() => createBuyer.mutate()} disabled={!form.nome || createBuyer.isPending} className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold">
              {createBuyer.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar buyer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
