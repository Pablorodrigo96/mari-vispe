import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeBrPhone } from "@/lib/whatsapp";

interface Props {
  entityType: "buyer" | "company";
  entityId: string;
  entityLabel?: string;
  trigger?: React.ReactNode;
  onCreated?: () => void;
}

/**
 * Quick add of a contact row in equity_brain.contacts.
 * RLS: admin/advisor only (already enforced at table level).
 */
export function AddContactDialog({ entityType, entityId, entityLabel, trigger, onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [cargo, setCargo] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const qc = useQueryClient();

  const mut = useMutation({
    mutationFn: async () => {
      const phone = normalizeBrPhone(telefone);
      const { data: { user } } = await supabase.auth.getUser();

      // contacts.entity_id é UUID. Para entityType="company", o entityId pode vir
      // como CNPJ (14 dígitos) ou codename — precisamos resolver para companies.id.
      let resolvedEntityId: string = entityId;
      if (entityType === "company") {
        const cnpj14 = (entityId ?? "").replace(/\D/g, "");
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(entityId);
        if (!isUuid) {
          let companyRow: any = null;
          if (cnpj14.length === 14) {
            const { data } = await (supabase as any)
              .schema("equity_brain")
              .from("companies")
              .select("id")
              .eq("cnpj", cnpj14)
              .maybeSingle();
            companyRow = data;
          }
          if (!companyRow) {
            // Tenta por codename
            const { data } = await (supabase as any)
              .schema("equity_brain")
              .from("companies")
              .select("id")
              .eq("codename", entityId)
              .maybeSingle();
            companyRow = data;
          }
          if (!companyRow?.id) {
            throw new Error("Empresa não encontrada na base do Equity Brain. Cadastre a empresa antes de adicionar contato.");
          }
          resolvedEntityId = companyRow.id as string;
        }
      }

      const payload: any = {
        entity_type: entityType,
        entity_id: resolvedEntityId,
        nome: nome.trim() || null,
        cargo: cargo.trim() || null,
        telefone_e164: phone,
        email: email.trim() || null,
        is_primary: true,
        whatsapp_opt_in: !!phone,
        source: "manual",
        created_by: user?.id ?? null,
      };
      const { error } = await (supabase as any)
        .schema("equity_brain")
        .from("contacts")
        .insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Contato adicionado");
      qc.invalidateQueries({ queryKey: ["match-contacts"] });
      setOpen(false);
      setNome(""); setCargo(""); setTelefone(""); setEmail("");
      onCreated?.();
    },
    onError: (e: any) => {
      toast.error("Não foi possível adicionar contato", { description: e?.message });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline" className="bg-transparent border-zinc-700 text-zinc-300 h-7 px-2">
            <Plus className="h-3 w-3 mr-1" /> Contato
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Adicionar contato</DialogTitle>
          <DialogDescription className="text-zinc-400 break-words">
            {entityLabel ? `Para ${entityLabel}` : `Para ${entityType}`} — fica disponível no Match Inbox e em todas as ferramentas.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-zinc-400">Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} className="bg-zinc-900 border-zinc-800 text-zinc-100" />
          </div>
          <div>
            <Label className="text-xs text-zinc-400">Cargo</Label>
            <Input value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Sócio, CFO, M&A..." className="bg-zinc-900 border-zinc-800 text-zinc-100" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-zinc-400">Telefone (com DDD)</Label>
              <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 99999-9999" className="bg-zinc-900 border-zinc-800 text-zinc-100" />
            </div>
            <div>
              <Label className="text-xs text-zinc-400">E-mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-zinc-900 border-zinc-800 text-zinc-100" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} className="text-zinc-400">Cancelar</Button>
          <Button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || (!telefone && !email)}
            className="bg-[#D9F564] text-zinc-900 hover:opacity-90"
          >
            {mut.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
            Salvar contato
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
