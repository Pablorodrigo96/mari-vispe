import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminRoute } from "@/components/admin/AdminRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WAMessage {
  id: string;
  advisor_id: string;
  contact_id: string | null;
  mandate_id: string | null;
  direction: "inbound" | "outbound";
  phone_from: string;
  phone_to: string;
  message_type: string;
  content_text: string | null;
  status: string;
  sentiment: string | null;
  intent: string | null;
  received_at: string;
  meta_message_id: string | null;
}

const sentimentColor: Record<string, string> = {
  positive: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  neutral: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  negative: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  urgent: "bg-amber-500/15 text-amber-400 border-amber-500/30",
};

function AdminWhatsAppMonitorInner() {
  const [rows, setRows] = useState<WAMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [reprocessing, setReprocessing] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("whatsapp_messages" as any)
      .select(
        "id, advisor_id, contact_id, mandate_id, direction, phone_from, phone_to, message_type, content_text, status, sentiment, intent, received_at, meta_message_id",
      )
      .order("received_at", { ascending: false })
      .limit(100);
    if (error) toast.error(error.message);
    setRows((data ?? []) as unknown as WAMessage[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("whatsapp_messages_admin")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_messages" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReprocess = async () => {
    setReprocessing(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "whatsapp-classify-batch",
      );
      if (error) throw error;
      toast.success(
        `Reprocessado: ${data?.processed ?? 0} mensagens em ${data?.groups ?? 0} grupos`,
      );
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao reprocessar");
    } finally {
      setReprocessing(false);
    }
  };

  const stats = useMemo(() => {
    const inbound = rows.filter((r) => r.direction === "inbound").length;
    const outbound = rows.filter((r) => r.direction === "outbound").length;
    const processed = rows.filter((r) => r.status === "processed").length;
    return { total: rows.length, inbound, outbound, processed };
  }, [rows]);

  return (
    <AdminLayout
      title="WhatsApp Monitor"
      description="Mensagens capturadas pela integração Meta WhatsApp Cloud em tempo real."
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total (últimas 100)", value: stats.total },
          { label: "Inbound", value: stats.inbound },
          { label: "Outbound", value: stats.outbound },
          { label: "Classificadas", value: stats.processed },
        ].map((s) => (
          <Card
            key={s.label}
            className="!bg-slate-900/60 backdrop-blur-md border-slate-700/50"
          >
            <CardContent className="pt-6">
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div className="text-2xl font-semibold mt-1">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="!bg-slate-900/60 backdrop-blur-md border-slate-700/50 mt-4">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Mensagens recentes
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="bg-transparent"
              onClick={load}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Atualizar
            </Button>
            <Button
              size="sm"
              onClick={handleReprocess}
              disabled={reprocessing}
            >
              {reprocessing ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3 mr-1" />
              )}
              Reprocessar sentimento
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Nenhuma mensagem capturada ainda. Quando o webhook receber um
              POST da Meta, as linhas aparecem aqui em tempo real.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">Recebida em</TableHead>
                  <TableHead>Direção</TableHead>
                  <TableHead>De → Para</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="max-w-md">Conteúdo</TableHead>
                  <TableHead>Sentimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Mandato</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">
                      {new Date(r.received_at).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      {r.direction === "inbound" ? (
                        <span className="flex items-center gap-1 text-emerald-400 text-xs">
                          <ArrowDownLeft className="h-3 w-3" /> in
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-sky-400 text-xs">
                          <ArrowUpRight className="h-3 w-3" /> out
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {r.phone_from}
                      <span className="text-muted-foreground"> → </span>
                      {r.phone_to}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {r.message_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <div className="text-xs break-words line-clamp-3">
                        {r.content_text ?? (
                          <span className="text-muted-foreground italic">
                            (sem texto)
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {r.sentiment ? (
                        <Badge
                          variant="outline"
                          className={sentimentColor[r.sentiment] ?? ""}
                        >
                          {r.sentiment}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {r.mandate_id ? (
                        <Link
                          to={`/equity-brain/crm/mandate/${r.mandate_id}`}
                          className="text-xs text-primary hover:underline"
                        >
                          abrir
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}

export default function AdminWhatsAppMonitor() {
  return (
    <AdminRoute>
      <AdminWhatsAppMonitorInner />
    </AdminRoute>
  );
}
