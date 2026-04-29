import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  const { toast } = useToast();

  async function qualify(source: string) {
    setLoading(true);
    try {
      const { error } = await (supabase as any).rpc("qualify_lead", {
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_source: source,
        p_notes: null,
      });
      if (error) throw error;
      toast({ title: "Lead qualificado", description: "Status atualizado para qualificado." });
      setOpen(false);
      onQualified?.();
    } catch (e: any) {
      toast({ title: "Erro ao qualificar", description: e?.message ?? "Falha", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const btnSize = size === "xs" ? "h-6 text-[10px] px-2" : "h-7 text-xs px-2.5";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className={`${btnSize} bg-transparent border-emerald-700/60 text-emerald-300 hover:bg-emerald-950/40`}
        >
          {loading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
          Qualificar
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2 bg-zinc-900 border-zinc-700" align="end">
        <div className="text-[11px] text-zinc-400 px-2 py-1">Como esse lead foi qualificado?</div>
        <div className="space-y-0.5">
          {SOURCES.map((s) => (
            <button
              key={s.key}
              disabled={loading}
              onClick={() => qualify(s.key)}
              className="w-full text-left text-xs px-2 py-1.5 rounded text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
            >
              {s.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
