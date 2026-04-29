import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const SOURCES = [
  { key: "cold_outreach", label: "Primeiro contato (frio)" },
  { key: "partner_referral", label: "Indicação de parceiro" },
  { key: "franchisee", label: "Indicação de franqueado" },
  { key: "existing_relationship", label: "Já é cliente / relacionamento" },
  { key: "inbound_listing", label: "Cadastrou listing na plataforma" },
];

export function QualifyLeadButton({
  entityType,
  entityId,
  onQualified,
  size = "sm",
}: {
  entityType: "company" | "buyer";
  entityId: string;
  onQualified?: () => void;
  size?: "sm" | "xs";
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<string>("cold_outreach");

  // Promotion options
  const [promoteToBuyer, setPromoteToBuyer] = useState(false);
  const [promoteToCompany, setPromoteToCompany] = useState(false);
  const [buyerThesis, setBuyerThesis] = useState("");
  const [buyerTicketMin, setBuyerTicketMin] = useState("");
  const [buyerTicketMax, setBuyerTicketMax] = useState("");
  const [companyCnpj, setCompanyCnpj] = useState("");

  const { toast } = useToast();

  function reset() {
    setSource("cold_outreach");
    setPromoteToBuyer(false);
    setPromoteToCompany(false);
    setBuyerThesis("");
    setBuyerTicketMin("");
    setBuyerTicketMax("");
    setCompanyCnpj("");
  }

  async function submit() {
    setLoading(true);
    try {
      const buyerProfile = promoteToBuyer
        ? {
            observacoes: buyerThesis || null,
            ticket_min: buyerTicketMin || null,
            ticket_max: buyerTicketMax || null,
          }
        : null;
      const companyProfile = promoteToCompany
        ? { cnpj: companyCnpj || null }
        : null;

      const { data, error } = await (supabase as any).rpc("qualify_lead", {
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_source: source,
        p_notes: null,
        p_promote_to_buyer: promoteToBuyer,
        p_promote_to_company: promoteToCompany,
        p_buyer_profile: buyerProfile,
        p_company_profile: companyProfile,
      });
      if (error) throw error;

      const extras: string[] = [];
      if (data?.promoted_buyer_id) extras.push("promovido a comprador");
      if (data?.promoted_company_cnpj) extras.push("promovido a empresa-alvo");
      toast({
        title: "Lead qualificado",
        description: extras.length ? `Qualificado e ${extras.join(" e ")}.` : "Status atualizado para qualificado.",
      });
      setOpen(false);
      reset();
      onQualified?.();
    } catch (e: any) {
      toast({ title: "Erro ao qualificar", description: e?.message ?? "Falha", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const btnSize = size === "xs" ? "h-6 text-[10px] px-2" : "h-7 text-xs px-2.5";

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className={`${btnSize} bg-transparent border-emerald-700/60 text-emerald-300 hover:bg-emerald-950/40`}
        >
          <Check className="h-3 w-3 mr-1" />
          Qualificar
        </Button>
      </DialogTrigger>
      <DialogContent className="!bg-zinc-950 border-zinc-800 max-w-md text-zinc-100">
        <DialogHeader>
          <DialogTitle className="text-sm">Qualificar lead</DialogTitle>
          <DialogDescription className="text-xs text-zinc-400">
            Defina a fonte da qualificação e o(s) papel(éis) deste contato no Equity Brain.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Source */}
          <div className="space-y-1.5">
            <Label className="text-[11px] text-zinc-400">Fonte da qualificação</Label>
            <div className="grid gap-1">
              {SOURCES.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSource(s.key)}
                  className={`text-left text-xs px-2 py-1.5 rounded border ${
                    source === s.key
                      ? "border-emerald-600 bg-emerald-950/40 text-emerald-200"
                      : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Promotion */}
          <div className="space-y-2 border-t border-zinc-800 pt-3">
            <Label className="text-[11px] text-zinc-400">Papel no Equity Brain</Label>

            {entityType === "company" && (
              <>
                <div className="text-[11px] text-zinc-500">
                  Já está cadastrado como <span className="text-zinc-300">alvo de aquisição</span> (target).
                </div>
                <label className="flex items-start gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={promoteToBuyer}
                    onChange={(e) => setPromoteToBuyer(e.target.checked)}
                    className="mt-0.5 accent-emerald-500"
                  />
                  <span className="text-zinc-200">
                    Adicionar também como <strong>comprador potencial</strong>
                    <span className="block text-[10px] text-zinc-500">
                      Use para grupos consolidadores, holdings ou empresas com apetite de M&A.
                    </span>
                  </span>
                </label>
                {promoteToBuyer && (
                  <div className="space-y-2 pl-6 pt-1">
                    <div>
                      <Label className="text-[10px] text-zinc-500">Tese / observações (opcional)</Label>
                      <Textarea
                        value={buyerThesis}
                        onChange={(e) => setBuyerThesis(e.target.value)}
                        placeholder="Ex: busca expandir no Sul via aquisição de redes regionais"
                        className="bg-zinc-900 border-zinc-800 text-xs min-h-[60px]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px] text-zinc-500">Ticket min (R$)</Label>
                        <Input
                          type="number"
                          value={buyerTicketMin}
                          onChange={(e) => setBuyerTicketMin(e.target.value)}
                          className="bg-zinc-900 border-zinc-800 text-xs h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-zinc-500">Ticket max (R$)</Label>
                        <Input
                          type="number"
                          value={buyerTicketMax}
                          onChange={(e) => setBuyerTicketMax(e.target.value)}
                          className="bg-zinc-900 border-zinc-800 text-xs h-8"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {entityType === "buyer" && (
              <>
                <div className="text-[11px] text-zinc-500">
                  Já está cadastrado como <span className="text-zinc-300">comprador potencial</span>.
                </div>
                <label className="flex items-start gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={promoteToCompany}
                    onChange={(e) => setPromoteToCompany(e.target.checked)}
                    className="mt-0.5 accent-emerald-500"
                  />
                  <span className="text-zinc-200">
                    Promover também a <strong>empresa-alvo</strong>
                    <span className="block text-[10px] text-zinc-500">
                      Use quando o buyer também opera um negócio que pode virar deal futuro.
                    </span>
                  </span>
                </label>
                {promoteToCompany && (
                  <div className="space-y-2 pl-6 pt-1">
                    <div>
                      <Label className="text-[10px] text-zinc-500">CNPJ da empresa operacional</Label>
                      <Input
                        value={companyCnpj}
                        onChange={(e) => setCompanyCnpj(e.target.value)}
                        placeholder="00.000.000/0000-00"
                        className="bg-zinc-900 border-zinc-800 text-xs h-8"
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={loading} className="h-8 text-xs">
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={submit}
            disabled={loading || (promoteToCompany && !companyCnpj)}
            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500"
          >
            {loading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
            Qualificar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
