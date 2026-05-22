import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useEffectiveRoles } from "@/hooks/useEffectiveRoles";

type EmailLogRow = {
  id: string;
  deal_pair_id: string;
  deal_document_id: string | null;
  recipient_email: string;
  recipient_type: string | null;
  template: string;
  sent_at: string | null;
  error: string | null;
  created_at: string;
};

type DerivedStatus = "sent" | "failed";

const STATUS_STYLE: Record<DerivedStatus, { label: string; cls: string; icon: React.ReactNode }> = {
  sent: { label: "Enviado", cls: "bg-emerald-950 text-emerald-300 border-emerald-800", icon: <CheckCircle2 className="h-3 w-3" /> },
  failed: { label: "Falhou", cls: "bg-red-950 text-red-300 border-red-800", icon: <AlertCircle className="h-3 w-3" /> },
};

const TEMPLATE_LABEL: Record<string, string> = {
  "nbo-signed": "NBO assinado",
  "deal-closed": "Deal fechado",
};

function deriveStatus(row: EmailLogRow): DerivedStatus {
  return row.sent_at && !row.error ? "sent" : "failed";
}

export function PairClosingEmailsCard({ pairId, pairStatus }: { pairId: string; pairStatus: string }) {
  const qc = useQueryClient();
  const { isAdmin, isAdvisor } = useEffectiveRoles();
  const canResend = isAdmin || isAdvisor;

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["pair-closing-emails", pairId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("deal_closing_emails_log")
        .select("*")
        .eq("deal_pair_id", pairId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as EmailLogRow[];
    },
    refetchInterval: 15000,
  });

  // Deduplica: mantém apenas a última tentativa por (deal_document_id, recipient_email)
  const dedup = (() => {
    const map = new Map<string, EmailLogRow>();
    for (const row of logs) {
      const key = `${row.deal_document_id ?? "-"}::${row.recipient_email}`;
      const prev = map.get(key);
      if (!prev || new Date(row.created_at) > new Date(prev.created_at)) map.set(key, row);
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  })();

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

  const grouped = dedup.reduce<Record<string, EmailLogRow[]>>((acc, l) => {
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
          <span className="ml-auto text-xs text-zinc-500">{dedup.length} envio(s)</span>
        </div>

        {isLoading ? (
          <div className="text-xs text-zinc-500">Carregando...</div>
        ) : dedup.length === 0 ? (
          <div className="text-xs text-zinc-500">
            Nenhum e-mail enviado ainda. Eles são disparados automaticamente quando NBO ou SPA é assinado.
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(grouped).map(([docId, items]) => {
              const tpl = items[0]?.template ?? "—";
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
                      const s = STATUS_STYLE[deriveStatus(l)];
                      return (
                        <div key={l.id} className="flex items-center gap-2 text-xs">
                          <Badge className={`${s.cls} border gap-1 px-1.5 py-0`}>{s.icon}{s.label}</Badge>
                          <span className="text-zinc-300 break-words flex-1 min-w-0">{l.recipient_email}</span>
                          {l.recipient_type && <span className="text-zinc-600">{l.recipient_type}</span>}
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
