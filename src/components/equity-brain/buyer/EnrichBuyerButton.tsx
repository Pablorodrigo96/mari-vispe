import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { EnrichReviewModal } from "./EnrichReviewModal";

export function EnrichBuyerButton({ buyerId }: { buyerId: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ suggested: any; citations: string[] } | null>(null);

  async function handleClick() {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("enrich-buyer-via-ai", {
        body: { buyer_id: buyerId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setResult({ suggested: (data as any).suggested ?? {}, citations: (data as any).citations ?? [] });
    } catch (e: any) {
      toast.error("Falha ao enriquecer: " + (e?.message ?? "erro"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        size="sm"
        onClick={handleClick}
        disabled={loading}
        className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950"
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
        Enriquecer via IA
      </Button>
      {result && (
        <EnrichReviewModal
          buyerId={buyerId}
          suggested={result.suggested}
          citations={result.citations}
          onClose={() => setResult(null)}
        />
      )}
    </>
  );
}
