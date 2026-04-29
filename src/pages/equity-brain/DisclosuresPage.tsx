import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Check, X, Inbox, Clock, ShieldCheck, ShieldX } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Navigate } from "react-router-dom";
import { relativeTime } from "@/lib/equityBrain";

type Status = "pending" | "approved" | "rejected" | "expired" | "revoked";

interface Row {
  id: string;
  requester_id: string;
  target_kind: "company" | "listing";
  target_cnpj: string | null;
  target_listing_id: string | null;
  target_codename: string | null;
  reason: string | null;
  status: Status;
  advisor_id: string | null;
  decision_notes: string | null;
  decided_at: string | null;
  expires_at: string;
  created_at: string;
}

export default function DisclosuresPage() {
  const { isAdmin, isAdvisor, loading } = useUserRoles();
  const [tab, setTab] = useState<Status>("pending");
  const qc = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ["eb", "disclosure-requests", tab],
    queryFn: async () => {
      const { data, error } = await supabase
        .schema("equity_brain" as any)
        .from("disclosure_requests" as any)
        .select("*")
        .eq("status", tab)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
    enabled: !loading && (isAdmin || isAdvisor),
  });

  if (loading) return <div className="p-6"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (!isAdmin && !isAdvisor) return <Navigate to="/equity-brain" replace />;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Inbox className="h-6 w-6" /> Aberturas de Identidade
          </h1>
          <p className="text-sm text-muted-foreground break-words">
            Pedidos de parceiros para revelar a identidade real de empresas/ativos cegos.
          </p>
        </div>
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Status)}>
        <TabsList>
          <TabsTrigger value="pending"><Clock className="h-4 w-4 mr-1" />Pendentes</TabsTrigger>
          <TabsTrigger value="approved"><ShieldCheck className="h-4 w-4 mr-1" />Aprovadas</TabsTrigger>
          <TabsTrigger value="rejected"><ShieldX className="h-4 w-4 mr-1" />Recusadas</TabsTrigger>
          <TabsTrigger value="expired">Expiradas</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="space-y-3">
          {isLoading && <Loader2 className="h-5 w-5 animate-spin mt-4" />}
          {!isLoading && data.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">Nenhum pedido nesta aba.</p>
          )}
          {data.map((r) => (
            <DisclosureRow key={r.id} row={r} onChanged={() => qc.invalidateQueries({ queryKey: ["eb", "disclosure-requests"] })} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DisclosureRow({ row, onChanged }: { row: Row; onChanged: () => void }) {
  const [notes, setNotes] = useState("");
  const [days, setDays] = useState(14);

  const decide = useMutation({
    mutationFn: async (decision: "approved" | "rejected") => {
      const { data, error } = await supabase.rpc("eb_decide_disclosure", {
        p_request_id: row.id,
        p_decision: decision,
        p_expires_in_days: days,
        p_notes: notes || null,
      } as any);
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, decision) => {
      toast.success(decision === "approved" ? "Abertura aprovada" : "Pedido recusado");
      onChanged();
    },
    onError: (err: any) => toast.error("Falha", { description: err?.message }),
  });

  return (
    <Card className="!bg-slate-900/60 backdrop-blur-md p-4 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-semibold text-amber-300">
              {row.target_codename ?? "(sem codinome)"}
            </span>
            <Badge variant="outline" className="bg-transparent">{row.target_kind}</Badge>
            <span className="text-xs text-muted-foreground">{relativeTime(row.created_at)}</span>
          </div>
          <p className="text-sm break-words"><strong>Motivo:</strong> {row.reason || "—"}</p>
          <p className="text-xs text-muted-foreground break-words">
            Solicitante: <span className="font-mono">{row.requester_id.slice(0, 8)}…</span> ·{" "}
            {row.target_cnpj ? `CNPJ ${row.target_cnpj}` : `Listing ${row.target_listing_id?.slice(0, 8)}…`}
          </p>
        </div>
        {row.status !== "pending" && (
          <Badge>{row.status}</Badge>
        )}
      </div>

      {row.status === "pending" && (
        <div className="border-t border-border/40 pt-3 space-y-2">
          <div className="grid sm:grid-cols-3 gap-2">
            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs">Notas (opcional)</Label>
              <Textarea rows={1} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Por que aprovar/recusar?" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Validade (dias)</Label>
              <Input type="number" min={1} max={90} value={days} onChange={(e) => setDays(Number(e.target.value))} />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" className="bg-transparent" onClick={() => decide.mutate("rejected")} disabled={decide.isPending}>
              <X className="h-4 w-4 mr-1" /> Recusar
            </Button>
            <Button size="sm" onClick={() => decide.mutate("approved")} disabled={decide.isPending}>
              {decide.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
              Aprovar
            </Button>
          </div>
        </div>
      )}

      {row.status !== "pending" && row.decision_notes && (
        <p className="text-xs text-muted-foreground break-words">Nota do advisor: {row.decision_notes}</p>
      )}
    </Card>
  );
}
