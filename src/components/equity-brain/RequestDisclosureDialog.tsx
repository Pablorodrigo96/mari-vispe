import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DISCLOSURE_REASONS } from "@/lib/blindTeaser";

interface Props {
  targetKind: "company" | "listing";
  targetCnpj?: string | null;
  targetListingId?: string | null;
  codename?: string | null;
  trigger?: React.ReactNode;
}

export function RequestDisclosureDialog({
  targetKind, targetCnpj, targetListingId, codename, trigger,
}: Props) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>(DISCLOSURE_REASONS[0].value);
  const [details, setDetails] = useState("");
  const qc = useQueryClient();

  const mut = useMutation({
    mutationFn: async () => {
      const reasonText =
        DISCLOSURE_REASONS.find((r) => r.value === category)?.label +
        (details ? ` — ${details}` : "");
      const { data, error } = await supabase.rpc("eb_request_disclosure", {
        p_target_kind: targetKind,
        p_target_cnpj: targetCnpj ?? null,
        p_target_listing_id: targetListingId ?? null,
        p_reason: reasonText,
      } as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Solicitação enviada", {
        description: "Um advisor Vispe vai avaliar e responder em breve.",
      });
      qc.invalidateQueries({ queryKey: ["eb", "disclosure-requests"] });
      setOpen(false);
      setDetails("");
    },
    onError: (err: any) => {
      toast.error("Não foi possível enviar", { description: err?.message ?? String(err) });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline" className="bg-transparent gap-2">
            <ShieldAlert className="h-4 w-4" />
            Solicitar abertura via Advisor
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="!bg-slate-900/95 backdrop-blur-md border-slate-700">
        <DialogHeader>
          <DialogTitle>Solicitar abertura de identidade</DialogTitle>
          <DialogDescription className="break-words">
            Você está pedindo a um Advisor Vispe a liberação dos dados sensíveis do ativo{" "}
            <span className="font-mono text-amber-300">{codename ?? "(sem codinome)"}</span>.
            A aprovação é registrada e expira automaticamente em 14 dias.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Por que você precisa abrir?</Label>
            <RadioGroup value={category} onValueChange={setCategory} className="space-y-1">
              {DISCLOSURE_REASONS.map((r) => (
                <div key={r.value} className="flex items-center gap-2">
                  <RadioGroupItem value={r.value} id={`reason-${r.value}`} />
                  <Label htmlFor={`reason-${r.value}`} className="font-normal cursor-pointer">
                    {r.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">Detalhes (opcional)</Label>
            <Textarea
              id="details"
              placeholder="Conte ao advisor o contexto: quem é o comprador, fit estratégico, etc."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Enviar solicitação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
