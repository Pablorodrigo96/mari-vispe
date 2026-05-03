import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function EnrichCompanyButton({ cnpj, onDone }: { cnpj: string; onDone?: () => void }) {
  const [loading, setLoading] = useState(false);
  async function handle() {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("enrich-company-via-rfb", { body: { cnpj } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`Empresa enriquecida (${(data as any)?.fields_updated ?? 0} campos)`);
      onDone?.();
    } catch (e: any) {
      toast.error("Falha ao enriquecer: " + (e?.message ?? "erro"));
    } finally {
      setLoading(false);
    }
  }
  return (
    <Button size="sm" onClick={handle} disabled={loading || !cnpj}
      className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950">
      {loading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
      Enriquecer via RFB
    </Button>
  );
}
