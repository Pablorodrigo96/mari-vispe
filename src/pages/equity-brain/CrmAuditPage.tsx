import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, AlertTriangle, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type AuditCheck = {
  check_key: string;
  label: string;
  severity: "high" | "medium" | "low";
  total: number;
  sample_ids: string[] | null;
};

const SEV_COLOR: Record<string, string> = {
  high: "border-rose-700/60 bg-rose-500/10 text-rose-200",
  medium: "border-amber-700/60 bg-amber-500/10 text-amber-200",
  low: "border-zinc-700 bg-zinc-800/40 text-zinc-300",
};

export default function CrmAuditPage() {
  const qc = useQueryClient();

  const { data: checks, isLoading } = useQuery({
    queryKey: ["crm-audit-v2"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eb_crm_audit_v2" as any)
        .select("*");
      if (error) throw error;
      return (data ?? []) as unknown as AuditCheck[];
    },
  });

  const rebuild = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("rebuild_crm_state" as any);
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["crm-audit-v2"] });
      qc.invalidateQueries({ queryKey: ["pipeline-kanban-v2"] });
      toast.success(`Rebuild executado: ${JSON.stringify(data?.promoted ?? {})}`);
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha no rebuild"),
  });

  const totalIssues = (checks ?? []).reduce((s, c) => s + Number(c.total ?? 0), 0);

  return (
    <div className="p-6 space-y-4 bg-zinc-950 min-h-full">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <Link to="/equity-brain/crm" className="text-[11px] text-zinc-500 hover:text-zinc-300 inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> CRM
          </Link>
          <h1 className="text-2xl font-bold text-zinc-100 mt-1 tracking-tight inline-flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#D9F564]" />
            Auditoria operacional do CRM
          </h1>
          <p className="text-xs text-zinc-400 mt-1 break-words">
            {totalIssues} pendência(s) detectada(s) — corrija para manter o pipeline 100%.
          </p>
        </div>
        <button
          onClick={() => rebuild.mutate()}
          disabled={rebuild.isPending}
          className="text-[11px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#D9F564] text-zinc-900 font-semibold hover:opacity-90 disabled:opacity-50"
        >
          <RefreshCw className={cn("h-3 w-3", rebuild.isPending && "animate-spin")} />
          {rebuild.isPending ? "Rebuilding…" : "Rebuild CRM"}
        </button>
      </header>

      {isLoading ? (
        <div className="text-xs text-zinc-500 p-6">Carregando auditoria…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {(checks ?? []).map((c) => (
            <div
              key={c.check_key}
              className={cn("rounded-lg border p-4 space-y-2", SEV_COLOR[c.severity])}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-[11px] uppercase tracking-wider opacity-70">
                  {c.severity === "high" ? "🔴 Alta" : c.severity === "medium" ? "🟡 Média" : "⚪ Baixa"}
                </div>
                <div className="text-2xl font-bold tabular-nums">{c.total}</div>
              </div>
              <div className="text-sm font-medium leading-tight break-words">{c.label}</div>
              {c.sample_ids && c.sample_ids.length > 0 && (
                <div className="pt-2 border-t border-current/20">
                  <div className="text-[10px] opacity-60 mb-1">Primeiros {Math.min(5, c.sample_ids.length)}:</div>
                  <div className="flex flex-col gap-0.5">
                    {c.sample_ids.slice(0, 5).map((id) => (
                      <Link
                        key={id}
                        to={`/equity-brain/crm/mandate/${id}`}
                        className="text-[10px] underline opacity-80 hover:opacity-100 truncate"
                      >
                        {id.slice(0, 8)}…
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 mt-6">
        <div className="text-[11px] uppercase text-zinc-500 mb-2 inline-flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3" /> O que faz o "Rebuild CRM"?
        </div>
        <ul className="text-xs text-zinc-300 space-y-1 list-disc pl-5">
          <li>Reclassifica todos os mandatos (deal_origin, deal_kind, deal_confidence).</li>
          <li>Aplica regras automáticas de etapa: outcome terminal → closed, data_assinatura → closing, comprador vinculado → nbo, mandato com valor + contato → nbo.</li>
          <li>Corrige <code className="text-amber-300">stage_changed_at</code> faltantes.</li>
          <li>Não sobrescreve edições humanas — só preenche o que está vazio ou inconsistente.</li>
        </ul>
      </div>
    </div>
  );
}
