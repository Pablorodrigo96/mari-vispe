import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRoles } from "@/hooks/useUserRoles";
import { ArrowLeft, UserPlus, Wand2, ShieldAlert } from "lucide-react";
import { brl } from "@/lib/dealFormatters";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type Unassigned = {
  mandate_id: string;
  cnpj: string | null;
  company_name: string | null;
  codename: string | null;
  pipeline_stage: string;
  outcome: string;
  valor_pedido: number | null;
  valor_operacao: number | null;
  deal_origin: string | null;
  deal_kind: string | null;
  setor: string | null;
  uf: string | null;
  created_at: string;
};

type Advisor = {
  user_id: string;
  full_name: string | null;
  load: number;
};

export default function CrmAssignmentsPage() {
  const { user } = useAuth();
  const { isAdmin, loading: rolesLoading } = useUserRoles();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [targetAdvisor, setTargetAdvisor] = useState<string>("");

  const unassignedQ = useQuery({
    queryKey: ["unassigned-mandates"],
    enabled: !!user && isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eb_unassigned_mandates" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as Unassigned[];
    },
  });

  const advisorsQ = useQuery({
    queryKey: ["crm-advisors"],
    enabled: !!user && isAdmin,
    queryFn: async () => {
      const { data: roles, error: rolesErr } = await supabase
        .from("user_roles")
        .select("user_id,role")
        .in("role", ["advisor", "admin"]);
      if (rolesErr) throw rolesErr;
      const ids = Array.from(new Set((roles ?? []).map((r: any) => r.user_id))) as string[];
      if (ids.length === 0) return [] as Advisor[];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id,full_name")
        .in("user_id", ids);
      const profMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p.full_name]));

      // Carga atual: contagem via RPC seria melhor, mas como já temos a view eb_my_companies_v2 com filtro RLS de admin, usamos query direta agregada
      const { data: loads } = await supabase
        .schema("equity_brain")
        .from("mandates")
        .select("responsavel_id")
        .in("responsavel_id", ids)
        .in("outcome", ["em_andamento", "vigente"]);
      const loadMap = new Map<string, number>();
      (loads ?? []).forEach((m: any) => {
        loadMap.set(m.responsavel_id, (loadMap.get(m.responsavel_id) ?? 0) + 1);
      });

      return ids.map((id) => ({
        user_id: id,
        full_name: profMap.get(id) ?? id.slice(0, 8),
        load: loadMap.get(id) ?? 0,
      })).sort((a, b) => a.load - b.load);
    },
  });

  const bulkAssignM = useMutation({
    mutationFn: async () => {
      if (!targetAdvisor || selected.size === 0) {
        throw new Error("Selecione mandatos e um advisor");
      }
      const { data, error } = await supabase.rpc("bulk_assign_responsavel" as any, {
        p_mandate_ids: Array.from(selected),
        p_advisor_id: targetAdvisor,
      });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => {
      toast({ title: "Atribuído", description: `${count} mandatos atribuídos.` });
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["unassigned-mandates"] });
      qc.invalidateQueries({ queryKey: ["crm-advisors"] });
    },
    onError: (err) => {
      toast({ title: "Erro", description: err instanceof Error ? err.message : "Falha", variant: "destructive" });
    },
  });

  const autoAssignM = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("auto_assign_next_n" as any, { p_n: 50 });
      if (error) throw error;
      return (data ?? []) as { mandate_id: string; assigned_to: string }[];
    },
    onSuccess: (rows) => {
      toast({ title: "Auto-atribuição concluída", description: `${rows.length} mandatos distribuídos.` });
      qc.invalidateQueries({ queryKey: ["unassigned-mandates"] });
      qc.invalidateQueries({ queryKey: ["crm-advisors"] });
    },
    onError: (err) => {
      toast({ title: "Erro", description: err instanceof Error ? err.message : "Falha", variant: "destructive" });
    },
  });

  const allChecked = useMemo(() => {
    const rows = unassignedQ.data ?? [];
    return rows.length > 0 && rows.every((r) => selected.has(r.mandate_id));
  }, [unassignedQ.data, selected]);

  function toggleAll() {
    const rows = unassignedQ.data ?? [];
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.mandate_id)));
  }
  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  if (rolesLoading) return <div className="p-6 text-zinc-400 text-xs">Carregando…</div>;
  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-amber-700/40 bg-amber-500/10 p-6 text-amber-200 text-sm flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" /> Acesso restrito a admins.
        </div>
      </div>
    );
  }

  const rows = unassignedQ.data ?? [];
  const advisors = advisorsQ.data ?? [];

  return (
    <div className="p-6 space-y-4 bg-zinc-950 min-h-full">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <Link to="/equity-brain/crm" className="text-[11px] text-zinc-500 hover:text-zinc-300 inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> CRM
          </Link>
          <h1 className="text-2xl font-bold text-zinc-100 mt-1 tracking-tight inline-flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-[#D9F564]" />
            Atribuir mandatos órfãos
          </h1>
          <p className="text-xs text-zinc-400 mt-1 break-words max-w-2xl">
            Mandatos vivos sem responsável. Atribua em lote ou use auto-distribuição (advisor com menor carga atual).
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="bg-transparent border-zinc-700 text-zinc-300"
            onClick={() => autoAssignM.mutate()}
            disabled={autoAssignM.isPending || rows.length === 0}
          >
            <Wand2 className="h-3 w-3 mr-1" />
            Auto-atribuir 50
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
          <div className="text-[10px] uppercase text-zinc-500">Mandatos órfãos</div>
          <div className="text-2xl font-bold text-amber-300 tabular-nums">{rows.length}</div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
          <div className="text-[10px] uppercase text-zinc-500">Advisors disponíveis</div>
          <div className="text-2xl font-bold text-zinc-100 tabular-nums">{advisors.length}</div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
          <div className="text-[10px] uppercase text-zinc-500">Selecionados</div>
          <div className="text-2xl font-bold text-[#D9F564] tabular-nums">{selected.size}</div>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 flex flex-wrap items-center gap-3">
        <span className="text-xs text-zinc-400">Atribuir selecionados a:</span>
        <select
          value={targetAdvisor}
          onChange={(e) => setTargetAdvisor(e.target.value)}
          className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200"
        >
          <option value="">Selecione…</option>
          {advisors.map((a) => (
            <option key={a.user_id} value={a.user_id}>
              {a.full_name} (carga: {a.load})
            </option>
          ))}
        </select>
        <Button
          size="sm"
          className="bg-[#D9F564] text-zinc-900 hover:bg-[#D9F564]/80"
          onClick={() => bulkAssignM.mutate()}
          disabled={!targetAdvisor || selected.size === 0 || bulkAssignM.isPending}
        >
          Atribuir {selected.size}
        </Button>
      </div>

      {unassignedQ.isLoading ? (
        <div className="text-xs text-zinc-500 p-6">Carregando…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-emerald-700/40 bg-emerald-500/10 p-6 text-center text-emerald-200 text-sm">
          🎉 Nenhum mandato órfão. Todos os deals vivos têm responsável.
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-zinc-900/80 text-zinc-400 text-[10px] uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2 w-8">
                  <input type="checkbox" checked={allChecked} onChange={toggleAll} />
                </th>
                <th className="text-left px-3 py-2 font-medium">Empresa</th>
                <th className="text-left px-3 py-2 font-medium">Origem</th>
                <th className="text-left px-3 py-2 font-medium">Setor</th>
                <th className="text-left px-3 py-2 font-medium">UF</th>
                <th className="text-left px-3 py-2 font-medium">Etapa</th>
                <th className="text-right px-3 py-2 font-medium">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {rows.map((r) => (
                <tr key={r.mandate_id} className={cn("hover:bg-zinc-900/60", selected.has(r.mandate_id) && "bg-[#D9F564]/5")}>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(r.mandate_id)}
                      onChange={() => toggleOne(r.mandate_id)}
                    />
                  </td>
                  <td className="px-3 py-2 text-zinc-100 font-medium break-words max-w-[280px]">
                    {r.company_name ?? r.codename ?? r.cnpj ?? r.mandate_id.slice(0, 8)}
                  </td>
                  <td className="px-3 py-2 text-zinc-400">{r.deal_origin ?? "—"}</td>
                  <td className="px-3 py-2 text-zinc-400">{r.setor ?? "—"}</td>
                  <td className="px-3 py-2 text-zinc-400">{r.uf ?? "—"}</td>
                  <td className="px-3 py-2 text-zinc-300">{r.pipeline_stage}</td>
                  <td className="px-3 py-2 text-right text-emerald-300 tabular-nums">
                    {(r.valor_operacao ?? r.valor_pedido)
                      ? brl((r.valor_operacao ?? r.valor_pedido) as number, { compact: true })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
