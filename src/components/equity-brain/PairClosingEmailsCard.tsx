import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, RefreshCw, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { useRoles } from "@/hooks/useRoles";

type EmailLog = {
  id: string;
  pair_id: string;
  deal_document_id: string | null;
  recipient_email: string;
  recipient_role: string | null;
  template_name: string;
  status: "queued" | "sent" | "failed";
  error: string | null;
  created_at: string;
  sent_at: string | null;
};

const STATUS_STYLE: Record<EmailLog["status"], { label: string; cls: string; icon: React.ReactNode }> = {
  queued: { label: "Na fila", cls: "bg-amber-950 text-amber-300 border-amber-800", icon: <Clock className="h-3 w-3" /> },
  sent: { label: "Enviado", cls: "bg-emerald-950 text-emerald-300 border-emerald-800", icon: <CheckCircle2 className="h-3 w-3" /> },
  failed: { label: "Falhou", cls: "bg-red-950 text-red-300 border-red-800", icon: <AlertCircle className="h-3 w-3" /> },
};

const TEMPLATE_LABEL: Record<string, string> = {
  "nbo-signed": "NBO assinado",
  "deal-closed": "Deal fechado",
};

export function PairClosingEmailsCard({ pairId, pairStatus }: { pairId: string; pairStatus: string }) {
  const qc = useQueryClient();
  const { isAdmin, isAdvisor } = useRoles();
  const canResend = isAdmin || isAdvisor;

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["pair-closing-emails", pairId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("deal_closing_emails_log")
        .select("*")
        .eq("pair_id", pairId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as EmailLog[];
    },
    refetchInterval: 15000,
  });

  const resend = useMutation({
    mutationFn: async (deal_document_id: string) => {
      const { error } = await supabase.functions.invoke("deal-closing-notify", {
        body: { deal_document_id, force: true },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("E-mails reenviados");
      qc.invalidateQueries({ queryKey: ["pair-closing-emails", pairId] });
    },
    onError: (e: any) => toast.error(`Falha ao reenviar: ${e.message ?? e}`),
  });

  const grouped = logs.reduce<Record<string, EmailLog[]>>((acc, l) => {
    const key = l.deal_document_id ?? "—";
    (acc[key] ||= []).push(l);
    return acc;
  }, {});

  return (
    <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800 rounded-lg">
      {pairStatus === "closed" && (
        <div className="bg-emerald-950/60 border-b border-emerald-800/50 px-4 py-2.5 text-sm text-emerald-300 flex items-center gap-2 rounded-t-lg">
          <CheckCircle2 className="h-4 w-4" /> Deal fechado — todas as partes foram notificadas.
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3 text-zinc-300 text-sm font-medium">
          <Mail className="h-4 w-4" /> E-mails de fechamento
          <span className="ml-auto text-xs text-zinc-500">{logs.length} envio(s)</span>
        </div>

        {isLoading ? (
          <div className="text-xs text-zinc-500">Carregando...</div>
        ) : logs.length === 0 ? (
          <div className="text-xs text-zinc-500">
            Nenhum e-mail enviado ainda. Eles são disparados automaticamente quando NBO ou SPA é assinado.
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(grouped).map(([docId, items]) => {
              const tpl = items[0]?.template_name ?? "—";
              return (
                <div key={docId} className="border border-zinc-800 rounded p-3 bg-zinc-950/40">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-zinc-400">
                      <span className="text-zinc-200 font-medium">{TEMPLATE_LABEL[tpl] ?? tpl}</span>
                      <span className="text-zinc-600 ml-2">doc {docId.slice(0, 8)}</span>
                    </div>
                    {canResend && docId !== "—" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={resend.isPending}
                        onClick={() => resend.mutate(docId)}
                        className="h-7 px-2 bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                      >
                        <RefreshCw className={`h-3 w-3 mr-1 ${resend.isPending ? "animate-spin" : ""}`} /> Reenviar
                      </Button>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {items.map((l) => {
                      const s = STATUS_STYLE[l.status];
                      return (
                        <div key={l.id} className="flex items-center gap-2 text-xs">
                          <Badge className={`${s.cls} border gap-1 px-1.5 py-0`}>{s.icon}{s.label}</Badge>
                          <span className="text-zinc-300 break-words flex-1 min-w-0">{l.recipient_email}</span>
                          {l.recipient_role && <span className="text-zinc-600">{l.recipient_role}</span>}
                          <span className="text-zinc-600 shrink-0">
                            {new Date(l.sent_at ?? l.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {items.some((i) => i.error) && (
                    <div className="mt-2 text-xs text-red-400 break-words">
                      {items.find((i) => i.error)?.error}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
