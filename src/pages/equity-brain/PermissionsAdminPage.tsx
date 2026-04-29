import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRightLeft, ShieldCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type AdvisorRow = { user_id: string; email: string | null; full_name: string | null; mandates: number; buyers: number };

function useAdvisors() {
  return useQuery({
    queryKey: ["eb-advisors"],
    queryFn: async () => {
      // Pull users with role advisor or admin (admins are advisors too in this CRM context)
      const { data: roles, error } = await supabase.from("user_roles").select("user_id,role").in("role", ["advisor", "admin"]);
      if (error) throw error;
      const ids = Array.from(new Set((roles ?? []).map(r => r.user_id)));
      if (ids.length === 0) return [] as AdvisorRow[];
      const { data: profiles } = await supabase.from("profiles").select("user_id,full_name").in("user_id", ids);
      const profileMap = new Map((profiles ?? []).map(p => [p.user_id, p.full_name]));

      // counts per user
      const [{ data: m }, { data: c }] = await Promise.all([
        (supabase as any).schema("equity_brain").from("mandates").select("responsavel_id"),
        (supabase as any).schema("equity_brain").from("contacts").select("owner_user_id"),
      ]);
      const mc = new Map<string, number>();
      const cc = new Map<string, number>();
      for (const row of m ?? []) if (row.responsavel_id) mc.set(row.responsavel_id, (mc.get(row.responsavel_id) ?? 0) + 1);
      for (const row of c ?? []) if (row.owner_user_id) cc.set(row.owner_user_id, (cc.get(row.owner_user_id) ?? 0) + 1);

      return ids.map(id => ({
        user_id: id,
        email: null,
        full_name: profileMap.get(id) ?? null,
        mandates: mc.get(id) ?? 0,
        buyers: cc.get(id) ?? 0,
      })) as AdvisorRow[];
    },
  });
}

function useTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ from, to }: { from: string; to: string }) => {
      if (from === to) throw new Error("Origem e destino iguais");
      const [r1, r2] = await Promise.all([
        (supabase as any).schema("equity_brain").from("mandates").update({ responsavel_id: to }).eq("responsavel_id", from),
        (supabase as any).schema("equity_brain").from("contacts").update({ owner_user_id: to }).eq("owner_user_id", from),
      ]);
      if (r1.error) throw r1.error;
      if (r2.error) throw r2.error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["eb-advisors"] });
      toast.success("Carteira transferida");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro na transferência"),
  });
}

export default function PermissionsAdminPage() {
  const { data, isLoading } = useAdvisors();
  const transfer = useTransfer();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  return (
    <div className="p-6 space-y-6 bg-zinc-950 min-h-full">
      <Link to="/equity-brain/crm" className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-100">
        <ArrowLeft className="h-3 w-3" /> Voltar ao CRM
      </Link>

      <header>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-400" />
          <h1 className="text-xl font-bold text-zinc-100">Permissões & Carteira</h1>
        </div>
        <p className="text-xs text-zinc-400 mt-1">
          Cada advisor enxerga apenas seus mandatos e buyers. Admin vê tudo. Transfira carteiras quando preciso.
        </p>
      </header>

      <section className="bg-zinc-900/40 border border-zinc-800 rounded p-4">
        <h2 className="text-sm font-semibold text-zinc-100 mb-3">Advisors</h2>
        {isLoading ? (
          <div className="text-xs text-zinc-500"><Loader2 className="h-3 w-3 animate-spin inline" /> carregando…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-zinc-500 border-b border-zinc-800">
                  <th className="py-2 pr-3">Advisor</th>
                  <th className="py-2 pr-3">Mandatos</th>
                  <th className="py-2 pr-3">Buyers</th>
                  <th className="py-2 pr-3">User ID</th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map(a => (
                  <tr key={a.user_id} className="border-b border-zinc-900">
                    <td className="py-2 pr-3 text-zinc-200 break-words">{a.full_name ?? "—"}</td>
                    <td className="py-2 pr-3 text-zinc-300">{a.mandates}</td>
                    <td className="py-2 pr-3 text-zinc-300">{a.buyers}</td>
                    <td className="py-2 pr-3 text-zinc-500 font-mono text-[10px]">{a.user_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="bg-zinc-900/40 border border-zinc-800 rounded p-4 space-y-3">
        <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
          <ArrowRightLeft className="h-4 w-4" /> Transferir carteira completa
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] uppercase text-zinc-500">De (advisor)</label>
            <select value={from} onChange={e => setFrom(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-2 text-xs text-zinc-100">
              <option value="">Selecione…</option>
              {(data ?? []).map(a => <option key={a.user_id} value={a.user_id}>{a.full_name ?? a.user_id}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase text-zinc-500">Para (advisor)</label>
            <select value={to} onChange={e => setTo(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-2 text-xs text-zinc-100">
              <option value="">Selecione…</option>
              {(data ?? []).map(a => <option key={a.user_id} value={a.user_id}>{a.full_name ?? a.user_id}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => transfer.mutate({ from, to })}
              disabled={!from || !to || transfer.isPending}
              className="w-full px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs disabled:opacity-50"
            >
              Transferir tudo
            </button>
          </div>
        </div>
        <p className="text-[11px] text-zinc-500">
          Move todos os mandatos e buyers do advisor de origem para o destino. Esta ação é imediata e auditável.
        </p>
      </section>
    </div>
  );
}
