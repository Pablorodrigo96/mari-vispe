import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, CheckCircle2, XCircle, AlertTriangle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function HomologacaoPublica() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [decision, setDecision] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data: rows, error } = await supabase.rpc("homologation_get_by_token" as any, { p_token: token });
      if (error || !rows || (rows as any[]).length === 0) {
        setLoading(false);
        return;
      }
      const row = (rows as any[])[0];
      setData(row);
      setDecision(row.decision);
      setLoading(false);
      await supabase.rpc("homologation_mark_viewed" as any, { p_token: token });
    })();
  }, [token]);

  async function decide(d: "approved" | "rejected" | "changes_requested") {
    if (!token) return;
    if (d !== "approved" && !comments.trim()) {
      toast.error("Por favor, descreva o motivo nos comentários.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.rpc("homologation_decide" as any, {
      p_token: token,
      p_decision: d,
      p_comments: comments || null,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Decisão registrada.");
    setDecision(d);
  }

  if (loading) {
    return <div className="min-h-screen bg-carbon grid place-items-center text-zinc-300"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  if (!data) {
    return (
      <div className="min-h-screen bg-carbon grid place-items-center px-4">
        <Card className="!bg-zinc-900/60 backdrop-blur-md border-zinc-800 p-6 max-w-md text-center">
          <AlertTriangle className="h-8 w-8 text-amber-400 mx-auto mb-2" />
          <div className="text-zinc-100 font-medium">Link inválido ou expirado</div>
          <div className="text-zinc-400 text-sm mt-1">Solicite um novo link à equipe Vispe.</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-carbon py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center gap-2 text-volt">
          <FileText className="h-5 w-5" />
          <span className="text-sm uppercase tracking-wider">Homologação jurídica — Vispe</span>
        </div>
        <Card className="!bg-zinc-900/60 backdrop-blur-md border-zinc-800 p-4">
          <div className="text-zinc-100 font-medium break-words">{data.document_label} (v{data.document_version})</div>
          <div className="text-xs text-zinc-500 mt-1">Para: {data.lawyer_name} ({data.lawyer_email})</div>
        </Card>

        <div className="max-h-[55vh] overflow-auto rounded border border-zinc-800">
          <WordPreview body={data.document_body} title={data.document_label} />
        </div>

        {decision ? (
          <Card className="!bg-zinc-900/60 backdrop-blur-md border-zinc-800 p-4 text-center">
            {decision === "approved" ? <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" /> : <XCircle className="h-8 w-8 text-red-400 mx-auto" />}
            <div className="text-zinc-100 mt-2">Decisão registrada: <strong>{decision}</strong></div>
            <div className="text-xs text-zinc-500 mt-1">Pode fechar esta janela.</div>
          </Card>
        ) : (
          <Card className="!bg-zinc-900/60 backdrop-blur-md border-zinc-800 p-4 space-y-3">
            <Textarea
              placeholder="Comentários e observações (obrigatório para rejeição ou alterações)"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-zinc-100 min-h-[100px]"
            />
            <div className="grid grid-cols-3 gap-2">
              <Button onClick={() => decide("approved")} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-500 text-white">
                <CheckCircle2 className="h-4 w-4 mr-1" /> Aprovar
              </Button>
              <Button onClick={() => decide("changes_requested")} disabled={submitting} variant="outline" className="bg-transparent border-amber-500/40 text-amber-300 hover:bg-amber-500/10">
                Solicitar alterações
              </Button>
              <Button onClick={() => decide("rejected")} disabled={submitting} variant="outline" className="bg-transparent border-red-500/40 text-red-300 hover:bg-red-500/10">
                <XCircle className="h-4 w-4 mr-1" /> Rejeitar
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
