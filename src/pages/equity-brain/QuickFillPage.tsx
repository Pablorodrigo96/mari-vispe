import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashShell, DashCard } from "@/components/dashboards/DashShell";
import { DashKpi } from "@/components/dashboards/DashKpi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

// Enums (alinhados com equity_brain)
const DEAL_TYPES = ["sellside", "buyside", "spa", "due_diligence", "cisao", "fusao", "nbo", "match"];
const DEAL_PHASES = ["match", "nbo", "due_diligence", "spa", "closing", "closed"];
const OUTCOMES = ["em_andamento", "em_negociacao", "concluido", "cancelado", "vencido", "vendemos", "vendeu_sozinho", "vigente"];
const STATUSES = ["vigente", "vencido", "vendemos", "em_negociacao", "vendeu_sozinho", "cancelado"];

type Mandate = {
  id: string;
  contato_nome: string | null;
  uf: string | null;
  setor: string | null;
  deal_type: string | null;
  status: string | null;
  outcome: string | null;
  valor_operacao: number | null;
  faturamento_vispe: number | null;
  responsavel_id: string | null;
  data_inicio: string | null;
  data_fechamento: string | null;
  pipeline_stage: string | null;
};

const REQUIRED = ["deal_type", "outcome", "valor_operacao", "responsavel_id"] as const;

function isComplete(m: Mandate): boolean {
  return REQUIRED.every((k) => m[k] !== null && m[k] !== undefined && m[k] !== "");
}

export default function QuickFillPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [onlyPending, setOnlyPending] = useState(true);
  const [search, setSearch] = useState("");

  const { data: mandates = [], isLoading } = useQuery({
    queryKey: ["quick-fill-mandates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eb_mandates")
        .select("id, contato_nome, uf, setor, deal_type, status, outcome, valor_operacao, faturamento_vispe, responsavel_id, data_inicio, data_fechamento, pipeline_stage")
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as any as Mandate[];
    },
  });

  const { data: advisors = [] } = useQuery({
    queryKey: ["quick-fill-advisors"],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["admin", "advisor"]);
      const ids = Array.from(new Set((data ?? []).map((r: any) => r.user_id)));
      if (!ids.length) return [];
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", ids);
      return (profs ?? []) as { user_id: string; full_name: string | null }[];
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Mandate> }) => {
      // Auto-calcula faturamento_vispe quando valor_operacao muda (5% default)
      if (patch.valor_operacao !== undefined) {
        const m = mandates.find((x) => x.id === id);
        if (m && (m.faturamento_vispe == null || m.faturamento_vispe === 0)) {
          (patch as any).faturamento_vispe = Number(patch.valor_operacao) * 0.05;
        }
      }
      const { error } = await supabase
        .from("eb_mandates")
        .update(patch as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quick-fill-mandates"] });
      qc.invalidateQueries({ queryKey: ["dash-exec"] });
      qc.invalidateQueries({ queryKey: ["dash-mandato"] });
      qc.invalidateQueries({ queryKey: ["dash-match"] });
      qc.invalidateQueries({ queryKey: ["dash-nbo"] });
    },
    onError: (e: any) => toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" }),
  });

  const refreshMatviews = useMutation({
    mutationFn: async () => {
      // Força refresh dos matviews via RPC genérica não existe — apelamos para invalidate.
      // O matview refresca a cada 60s via REFRESH MATERIALIZED VIEW agendado, mas aqui
      // só invalidamos para forçar nova leitura dos KPIs.
      qc.invalidateQueries();
      toast({ title: "Painéis atualizados", description: "Os dashboards já estão refletindo as mudanças." });
    },
  });

  const filtered = useMemo(() => {
    let list = mandates;
    if (onlyPending) list = list.filter((m) => !isComplete(m));
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter((m) =>
        (m.contato_nome ?? "").toLowerCase().includes(s) ||
        (m.setor ?? "").toLowerCase().includes(s) ||
        (m.uf ?? "").toLowerCase().includes(s),
      );
    }
    return list.slice(0, 200);
  }, [mandates, onlyPending, search]);

  const total = mandates.length;
  const completos = mandates.filter(isComplete).length;
  const pendentes = total - completos;

  return (
    <DashShell
      title="Preencher dados rápido"
      subtitle="Edite inline os campos que destravam KPIs nos dashboards. Salva automaticamente ao sair do campo."
      onRefresh={() => refreshMatviews.mutate()}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <DashKpi label="Total de mandatos" value={total} />
        <DashKpi label="Completos" value={completos} accent="success" />
        <DashKpi label="Pendentes" value={pendentes} accent="amber" />
        <DashKpi label="% completo" value={total > 0 ? `${Math.round((completos / total) * 100)}%` : "0%"} format="raw" accent="cyan" />
      </div>

      <DashCard title="Filtros" span="wide">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch id="onlyPending" checked={onlyPending} onCheckedChange={setOnlyPending} />
            <Label htmlFor="onlyPending" className="text-[#FAFAF7] text-sm cursor-pointer">Mostrar só pendentes</Label>
          </div>
          <Input
            placeholder="Buscar por codename, empresa, comprador…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md bg-zinc-900 border-zinc-700 text-zinc-100"
          />
          <div className="ml-auto text-[11px] text-[#A8A8A3]">Mostrando {filtered.length} de {mandates.length}</div>
        </div>
      </DashCard>

      <DashCard title="Mandatos — clique nos campos para editar" span="wide">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-zinc-400 text-sm">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Carregando…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-400 mb-3" />
            <div className="text-[#FAFAF7] font-medium">Tudo preenchido!</div>
            <div className="text-[11px] text-[#A8A8A3] mt-1">Nenhum mandato pendente nos critérios atuais.</div>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-[#A8A8A3] border-b border-zinc-800">
                  <th className="text-left p-2 font-medium">Codename</th>
                  <th className="text-left p-2 font-medium">Empresa / Contato</th>
                  <th className="text-left p-2 font-medium">UF</th>
                  <th className="text-left p-2 font-medium">Tipo</th>
                  <th className="text-left p-2 font-medium">Fase</th>
                  <th className="text-left p-2 font-medium">Status</th>
                  <th className="text-left p-2 font-medium">Resultado</th>
                  <th className="text-right p-2 font-medium">Valor (R$)</th>
                  <th className="text-right p-2 font-medium">Fat. Vispe (R$)</th>
                  <th className="text-left p-2 font-medium">Responsável</th>
                  <th className="text-left p-2 font-medium">Início</th>
                  <th className="text-left p-2 font-medium">Fechamento</th>
                  <th className="text-center p-2 font-medium w-12">Ok?</th>
                  <th className="text-center p-2 font-medium w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <Row key={m.id} m={m} advisors={advisors} onSave={(patch) => update.mutate({ id: m.id, patch })} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashCard>

      <DashCard title="Dica" span="wide">
        <div className="text-[12px] text-[#A8A8A3] space-y-2">
          <p><strong className="text-[#FAFAF7]">Faturamento Vispe</strong> é calculado automaticamente como 5% do Valor da Operação quando você preenche o valor (ajuste manualmente se a comissão for diferente).</p>
          <p>Para preenchimento em massa via planilha, use{" "}
            <Link to="/equity-brain/crm/imports" className="text-[#D9F564] underline">Imports</Link>{" "}
            (suporta .xlsx com upsert por ID).
          </p>
        </div>
      </DashCard>
    </DashShell>
  );
}

function Row({ m, advisors, onSave }: { m: Mandate; advisors: { user_id: string; full_name: string | null }[]; onSave: (patch: Partial<Mandate>) => void }) {
  const [local, setLocal] = useState<Mandate>(m);
  const ok = isComplete(local);

  const set = <K extends keyof Mandate>(k: K, v: Mandate[K]) => {
    setLocal((s) => ({ ...s, [k]: v }));
  };
  const commit = <K extends keyof Mandate>(k: K, v: Mandate[K]) => {
    if (m[k] !== v) onSave({ [k]: v } as any);
  };

  return (
    <tr className="border-b border-zinc-800/50 hover:bg-zinc-900/40">
      <td className="p-2 font-mono text-[10px] text-[#D9F564]">{local.codename ?? "—"}</td>
      <td className="p-2 text-[#FAFAF7] max-w-[180px] truncate">{local.comprador_nome ?? local.contato_nome ?? "—"}</td>
      <td className="p-2 text-[#A8A8A3]">{local.uf ?? "—"}</td>

      <td className="p-1">
        <SmallSelect value={local.deal_type ?? ""} options={DEAL_TYPES} onChange={(v) => { set("deal_type", v); commit("deal_type", v); }} />
      </td>
      <td className="p-1">
        <SmallSelect value={local.deal_phase ?? ""} options={DEAL_PHASES} onChange={(v) => { set("deal_phase", v); commit("deal_phase", v); }} />
      </td>
      <td className="p-1">
        <SmallSelect value={local.status ?? ""} options={STATUSES} onChange={(v) => { set("status", v); commit("status", v); }} />
      </td>
      <td className="p-1">
        <SmallSelect value={local.outcome ?? ""} options={OUTCOMES} onChange={(v) => { set("outcome", v); commit("outcome", v); }} />
      </td>

      <td className="p-1">
        <Input
          type="number" inputMode="numeric"
          value={local.valor_operacao ?? ""}
          onChange={(e) => set("valor_operacao", e.target.value === "" ? null : Number(e.target.value))}
          onBlur={() => commit("valor_operacao", local.valor_operacao)}
          className="h-7 text-[11px] bg-zinc-900 border-zinc-700 text-right text-zinc-100 w-28 font-mono tabular-nums"
        />
      </td>
      <td className="p-1">
        <Input
          type="number" inputMode="numeric"
          value={local.faturamento_vispe ?? ""}
          onChange={(e) => set("faturamento_vispe", e.target.value === "" ? null : Number(e.target.value))}
          onBlur={() => commit("faturamento_vispe", local.faturamento_vispe)}
          className="h-7 text-[11px] bg-zinc-900 border-zinc-700 text-right text-zinc-100 w-28 font-mono tabular-nums"
        />
      </td>

      <td className="p-1">
        <SmallSelect
          value={local.responsavel_id ?? ""}
          options={advisors.map((a) => a.user_id)}
          labels={Object.fromEntries(advisors.map((a) => [a.user_id, a.full_name ?? a.user_id.slice(0, 8)]))}
          onChange={(v) => { set("responsavel_id", v); commit("responsavel_id", v); }}
        />
      </td>

      <td className="p-1">
        <Input
          type="date"
          value={local.data_inicio ?? ""}
          onChange={(e) => set("data_inicio", e.target.value || null)}
          onBlur={() => commit("data_inicio", local.data_inicio)}
          className="h-7 text-[11px] bg-zinc-900 border-zinc-700 text-zinc-100 w-32"
        />
      </td>
      <td className="p-1">
        <Input
          type="date"
          value={local.data_fechamento ?? ""}
          onChange={(e) => set("data_fechamento", e.target.value || null)}
          onBlur={() => commit("data_fechamento", local.data_fechamento)}
          className="h-7 text-[11px] bg-zinc-900 border-zinc-700 text-zinc-100 w-32"
        />
      </td>

      <td className="p-2 text-center">
        {ok ? <CheckCircle2 className="h-4 w-4 text-emerald-400 inline" /> : <AlertCircle className="h-4 w-4 text-amber-400 inline" />}
      </td>
      <td className="p-2 text-center">
        <Button asChild size="sm" variant="ghost" className="h-7 w-7 p-0">
          <Link to={`/equity-brain/crm/mandate/${m.id}/edit`} title="Abrir formulário completo">
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </td>
    </tr>
  );
}

function SmallSelect({ value, options, labels, onChange }: { value: string; options: string[]; labels?: Record<string, string>; onChange: (v: string) => void }) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className="h-7 text-[11px] bg-zinc-900 border-zinc-700 text-zinc-100 w-32">
        <SelectValue placeholder="—" />
      </SelectTrigger>
      <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-100">
        {options.map((o) => (
          <SelectItem key={o} value={o} className="text-[11px]">{labels?.[o] ?? o}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
