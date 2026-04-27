import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Star, Loader2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { QuickCallModal } from "@/components/equity-brain/QuickCallModal";
import { DealCard } from "@/components/equity-brain/DealCard";
import { OUTCOMES, relativeTime, scoreColor, maskCnpj } from "@/lib/equityBrain";
import { cn } from "@/lib/utils";

export default function CallsPage() {
  const { user } = useAuth();
  const { isAdmin } = useUserRoles();
  const [drawerCnpj, setDrawerCnpj] = useState<string | null>(null);
  const [callModal, setCallModal] = useState<{ cnpj: string; razao?: string } | null>(null);

  const history = useQuery({
    queryKey: ["eb", "calls-history", user?.id, isAdmin],
    queryFn: async () => {
      let q = supabase
        .schema("equity_brain" as any).from("v_bdr_history" as any)
        .select("*").order("call_at", { ascending: false }).limit(100);
      if (!isAdmin && user?.id) q = q.eq("bdr_user_id", user.id);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  // Pipeline: empresas ranqueadas que ainda não tiveram call recente (≥ 30 dias) ou nunca
  const pipeline = useQuery({
    queryKey: ["eb", "calls-pipeline"],
    queryFn: async () => {
      const { data, error } = await supabase
        .schema("equity_brain" as any).from("opportunities_ready" as any)
        .select("cnpj, razao_social, uf, municipio, setor_ma, ma_score, best_thesis_name")
        .gte("ma_score", 60)
        .order("ma_score", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Calls do BDR</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {isAdmin ? "Visão admin · todas as calls" : "Suas calls"}
          </p>
        </div>
      </div>

      {/* Pipeline */}
      <section>
        <h2 className="text-sm font-bold text-zinc-100 mb-3">Pipeline de outreach · top {pipeline.data?.length ?? 0}</h2>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-zinc-950 text-zinc-500">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Empresa</th>
                <th className="text-left px-3 py-2 font-medium">UF · Setor</th>
                <th className="text-right px-3 py-2 font-medium">M&A</th>
                <th className="text-left px-3 py-2 font-medium">Tese top</th>
                <th className="text-right px-3 py-2 font-medium">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {(pipeline.data ?? []).map((r) => (
                <tr key={r.cnpj} className="hover:bg-zinc-800/40">
                  <td className="px-3 py-2 text-zinc-100 cursor-pointer truncate max-w-[260px]" onClick={() => setDrawerCnpj(r.cnpj)}>{r.razao_social}</td>
                  <td className="px-3 py-2 text-zinc-400">{r.uf} · {r.setor_ma}</td>
                  <td className={cn("px-3 py-2 text-right font-mono font-bold tabular-nums", scoreColor(r.ma_score))}>{Math.round(Number(r.ma_score ?? 0))}</td>
                  <td className="px-3 py-2 text-zinc-400 truncate max-w-[160px]">{r.best_thesis_name ?? "—"}</td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      size="sm"
                      onClick={() => setCallModal({ cnpj: r.cnpj, razao: r.razao_social })}
                      className="h-7 px-3 text-[10px] bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold"
                    >
                      <Plus className="h-3 w-3 mr-1" />Iniciar call
                    </Button>
                  </td>
                </tr>
              ))}
              {pipeline.isLoading && (
                <tr><td colSpan={5} className="px-3 py-8 text-center"><Loader2 className="h-5 w-5 animate-spin text-emerald-500 mx-auto" /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Histórico */}
      <section>
        <h2 className="text-sm font-bold text-zinc-100 mb-3">Histórico ({history.data?.length ?? 0})</h2>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-zinc-950 text-zinc-500">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Data</th>
                <th className="text-left px-3 py-2 font-medium">Empresa</th>
                <th className="text-left px-3 py-2 font-medium">CNPJ</th>
                <th className="text-left px-3 py-2 font-medium">Outcome</th>
                <th className="text-left px-3 py-2 font-medium">Interesse</th>
                <th className="text-right px-3 py-2 font-medium">M&A</th>
                <th className="text-right px-3 py-2 font-medium">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {(history.data ?? []).map((c) => {
                const out = OUTCOMES.find((o) => o.value === c.outcome);
                return (
                  <tr key={c.id} className="hover:bg-zinc-800/40">
                    <td className="px-3 py-2 text-zinc-400 font-mono text-[10px]">
                      {new Date(c.call_at).toLocaleDateString("pt-BR")}
                      <div className="text-zinc-600">{relativeTime(c.call_at)}</div>
                    </td>
                    <td className="px-3 py-2 text-zinc-100 truncate max-w-[220px] cursor-pointer" onClick={() => setDrawerCnpj(c.cnpj)}>{c.razao_social ?? "—"}</td>
                    <td className="px-3 py-2 text-[10px] font-mono text-zinc-500">{maskCnpj(c.cnpj, isAdmin)}</td>
                    <td className="px-3 py-2">
                      {out && <span className={cn("px-1.5 py-0.5 rounded text-[10px]", out.cls)}>{out.label}</span>}
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center text-amber-400">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star key={i} className={cn("h-3 w-3", i <= (c.interest_level ?? 0) ? "fill-amber-400" : "text-zinc-700")} />
                        ))}
                      </span>
                    </td>
                    <td className={cn("px-3 py-2 text-right font-mono font-bold tabular-nums", scoreColor(c.ma_score))}>{c.ma_score != null ? Math.round(Number(c.ma_score)) : "—"}</td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => setDrawerCnpj(c.cnpj)}
                        className="h-6 px-2 text-[10px] text-emerald-400 hover:bg-zinc-800"
                      >Ver deal</Button>
                    </td>
                  </tr>
                );
              })}
              {history.isLoading && (
                <tr><td colSpan={7} className="px-3 py-8 text-center"><Loader2 className="h-5 w-5 animate-spin text-emerald-500 mx-auto" /></td></tr>
              )}
              {!history.isLoading && (history.data ?? []).length === 0 && (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-zinc-500">Sem calls registradas ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Sheet open={!!drawerCnpj} onOpenChange={(o) => !o && setDrawerCnpj(null)}>
        <SheetContent side="right" className="dark bg-zinc-950 border-l border-zinc-800 text-zinc-100 w-full sm:max-w-[520px] p-0 overflow-y-auto">
          {drawerCnpj && <DealCard cnpj={drawerCnpj} mode="drawer" />}
        </SheetContent>
      </Sheet>

      {callModal && (
        <QuickCallModal
          cnpj={callModal.cnpj}
          razaoSocial={callModal.razao}
          open={!!callModal}
          onOpenChange={(o) => !o && setCallModal(null)}
          onSubmitted={() => {
            setTimeout(() => history.refetch(), 8000);
          }}
        />
      )}
    </div>
  );
}
