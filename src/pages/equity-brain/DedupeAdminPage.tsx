import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, ShieldCheck, History, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

type Stats = Record<string, { groups: number; extra: number }>;

const ENTITIES: { key: string; label: string; hint: string }[] = [
  { key: "mandates",       label: "Mandatos",          hint: "Mesmo CNPJ + tipo + origem (ignora cancelados)" },
  { key: "buyers",         label: "Compradores",       hint: "Mesmo nome (case-insensitive)" },
  { key: "contacts",       label: "Contatos",          hint: "Mesmo email ou telefone dentro da mesma entidade" },
  { key: "buyer_profiles", label: "Perfis de comprador (público)", hint: "Mesmo usuário + mesmo nome" },
];

export default function DedupeAdminPage() {
  const qc = useQueryClient();
  const [running, setRunning] = useState<string | null>(null);

  const { data: stats, isLoading: loadingStats, refetch } = useQuery({
    queryKey: ["dedupe-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("eb_get_dedupe_stats" as any);
      if (error) throw error;
      return (data ?? {}) as Stats;
    },
  });

  const { data: audit = [] } = useQuery({
    queryKey: ["dedupe-audit"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("eb_dedupe_audit_recent" as any, { p_limit: 50 });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const run = useMutation({
    mutationFn: async (entity: string) => {
      setRunning(entity);
      const { data, error } = await supabase.rpc("eb_run_safe_dedupe" as any, { p_entity: entity });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(`Limpeza concluída: ${data?.merged ?? 0} linhas mescladas em ${data?.entity}`);
      qc.invalidateQueries({ queryKey: ["dedupe-stats"] });
      qc.invalidateQueries({ queryKey: ["dedupe-audit"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao executar limpeza"),
    onSettled: () => setRunning(null),
  });

  const totalExtra = stats
    ? Object.values(stats).reduce((acc, v) => acc + (v?.extra ?? 0), 0)
    : 0;

  return (
    <div className="p-6 bg-[#0A0A0A] min-h-screen text-[#FAFAF7]">
      <div className="flex items-center gap-3 mb-2">
        <Copy className="h-6 w-6 text-[#D9F564]" />
        <h1 className="text-2xl font-bold">Limpeza de duplicatas</h1>
      </div>
      <p className="text-sm text-[#A8A8A3] max-w-3xl mb-6">
        A varredura detecta cadastros duplicados em mandatos, compradores, contatos e perfis. A
        mesclagem é segura: o registro mais completo/antigo é mantido, todas as referências
        (deals, atividades, WhatsApp, transições) são repontadas e a linha removida fica salva
        em auditoria — pode ser restaurada por um admin.
      </p>

      <div className="mb-4 p-3 rounded-lg border border-[#2A2A2A] bg-[#141414] flex items-center gap-3">
        <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
        <p className="text-xs text-[#A8A8A3]">
          Mandatos <strong>cancelados ou concluídos</strong> nunca são tocados (ficam como histórico).
          Empresas e listings já estão sem duplicatas.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
        {ENTITIES.map((ent) => {
          const s = stats?.[ent.key];
          const groups = s?.groups ?? 0;
          const extra = s?.extra ?? 0;
          const dirty = extra > 0;
          return (
            <div
              key={ent.key}
              className={`p-4 rounded-lg border ${
                dirty ? "border-amber-500/40 bg-amber-500/5" : "border-[#2A2A2A] bg-[#141414]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-sm flex items-center gap-2">
                    {ent.label}
                    {dirty && <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />}
                  </div>
                  <div className="text-[11px] text-[#A8A8A3] mt-0.5 break-words">{ent.hint}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl font-bold tabular-nums">
                    {loadingStats ? "…" : extra}
                  </div>
                  <div className="text-[10px] text-[#A8A8A3] uppercase tracking-wider">a remover</div>
                </div>
              </div>
              <div className="text-[11px] text-[#A8A8A3] mt-2">
                {loadingStats ? "Carregando…" : `${groups} grupo(s) duplicado(s) detectado(s)`}
              </div>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  disabled={!dirty || run.isPending}
                  onClick={() => run.mutate(ent.key)}
                  className="bg-[#D9F564] text-[#0A0A0A] hover:bg-[#D9F564]/90 disabled:opacity-30"
                >
                  {running === ent.key ? (
                    <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Mesclando…</>
                  ) : (
                    "Executar limpeza segura"
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <History className="h-4 w-4" /> Auditoria recente
        </h2>
        <Button
          variant="outline" size="sm"
          className="bg-transparent border-[#2A2A2A] h-7 text-xs"
          onClick={() => { refetch(); qc.invalidateQueries({ queryKey: ["dedupe-audit"] }); }}
        >
          Atualizar
        </Button>
      </div>

      <div className="border border-[#2A2A2A] rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-[#141414] text-[#A8A8A3] uppercase tracking-wider">
            <tr>
              <th className="text-left px-3 py-2">Entidade</th>
              <th className="text-left px-3 py-2">Mantido</th>
              <th className="text-left px-3 py-2">Removido</th>
              <th className="text-left px-3 py-2">Refs repontadas</th>
              <th className="text-left px-3 py-2">Quando</th>
              <th className="text-left px-3 py-2">Motivo</th>
            </tr>
          </thead>
          <tbody>
            {audit.length === 0 && (
              <tr><td colSpan={6} className="p-4 text-center text-[#A8A8A3]">Nenhuma mesclagem registrada ainda.</td></tr>
            )}
            {audit.map((row) => (
              <tr key={row.id} className="border-t border-[#1A1A1A] hover:bg-[#141414]">
                <td className="px-3 py-1.5">{row.entity_type}</td>
                <td className="px-3 py-1.5 font-mono text-[10px] text-emerald-300">{String(row.kept_id).slice(0,8)}…</td>
                <td className="px-3 py-1.5 font-mono text-[10px] text-rose-300">{String(row.removed_id).slice(0,8)}…</td>
                <td className="px-3 py-1.5 text-[10px] text-[#A8A8A3] max-w-[280px] break-words">
                  {row.refs_updated ? Object.entries(row.refs_updated).filter(([,v]) => Number(v)>0).map(([k,v]) => `${k}:${v}`).join(" · ") || "—" : "—"}
                </td>
                <td className="px-3 py-1.5 text-[10px] text-[#A8A8A3]">{new Date(row.merged_at).toLocaleString("pt-BR")}</td>
                <td className="px-3 py-1.5 text-[10px] text-[#A8A8A3]">{row.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalExtra === 0 && !loadingStats && (
        <div className="mt-6 p-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 text-emerald-300 text-sm">
          ✅ Sistema limpo — nenhuma duplicata pendente.
        </div>
      )}
    </div>
  );
}
